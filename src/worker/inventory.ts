// Inventory module: products (two companies), per-store stock, stock movements, and the inventory report.
// Every stock change goes through stockStatements(), which updates inventory_stock and writes a movement row
// in the same D1 batch. inventory_stock.quantity has CHECK(quantity>=0), so a batch that would take stock
// below zero fails and rolls back as a whole.
import { chunkRows } from './bulk';
import { all, batch, one, placeholders, run } from './db';
import { HttpError, camel, date, id, nowIso } from './http';
import type { Claims } from './jwt';
import { reportRange } from './reports';
import { actorStore, bool, intInRange, likePattern, oneOf, optionalText, pageQuery, queryFlag, rejectUnknown, requiredId, requiredText, sar, type Query } from './common';

export const COMPANIES = ['MYTECHCARE', 'TELECOM'] as const;
export const DIVISIONS = ['SIM_RECHARGE', 'SALES', 'SERVICE'] as const;
export const ADJUSTMENT_TYPES = ['PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGED'] as const;
export const MOVEMENT_TYPES = ['OPENING', 'PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGED', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'SALE_RETURN'] as const;
export type MovementType = typeof MOVEMENT_TYPES[number];
type Company = typeof COMPANIES[number];
const REFERENCE_TYPES = ['TELECOM_SALE', 'TRANSFER'] as const;
const MAX_QTY = 100_000_000;
const PRODUCT_FIELDS = ['sku', 'barcode', 'name', 'company', 'division', 'category', 'brand', 'model', 'unit', 'costPrice', 'sellingPrice', 'reorderLevel', 'trackStock', 'isActive', 'description', 'openingStock'];

export interface ProductRow { id: number; sku: string; name: string; company: Company; division: string | null; barcode: string | null; cost_price_halalas: number; selling_price_halalas: number; reorder_level: number; track_stock: number; is_active: number }
export interface StockChange { productId: number; storeId: number; delta: number; type: MovementType; unitCost?: number | null; referenceType?: typeof REFERENCE_TYPES[number] | null; referenceId?: number | null; notes?: string | null }

// ---------- shared stock engine (also used by Telecom Sales) ----------
export async function productsByIds(db: D1Database, ids: number[]): Promise<Map<number, ProductRow>> {
  const unique = [...new Set(ids)], rows: ProductRow[] = [];
  for (let i = 0; i < unique.length; i += 90) {
    const chunk = unique.slice(i, i + 90);
    rows.push(...await all<ProductRow>(db.prepare(`SELECT * FROM inventory_products WHERE id IN (${placeholders(chunk.length)})`).bind(...chunk)));
  }
  return new Map(rows.map(row => [row.id, row]));
}

/** Throws 409 with a readable message when any decrement exceeds the stock currently on hand. */
export async function assertStockAvailable(db: D1Database, changes: StockChange[]) {
  const needed = new Map<string, { productId: number; storeId: number; qty: number }>();
  for (const c of changes) if (c.delta < 0) {
    const key = `${c.productId}:${c.storeId}`, entry = needed.get(key);
    if (entry) entry.qty -= c.delta; else needed.set(key, { productId: c.productId, storeId: c.storeId, qty: -c.delta });
  }
  if (!needed.size) return;
  const byStore = new Map<number, number[]>();
  for (const n of needed.values()) byStore.set(n.storeId, [...(byStore.get(n.storeId) ?? []), n.productId]);
  const available = new Map<string, number>();
  for (const [storeId, productIds] of byStore) for (let i = 0; i < productIds.length; i += 90) {
    const chunk = productIds.slice(i, i + 90);
    for (const row of await all<{ product_id: number; quantity: number }>(db.prepare(`SELECT product_id,quantity FROM inventory_stock WHERE store_id=? AND product_id IN (${placeholders(chunk.length)})`).bind(storeId, ...chunk)))
      available.set(`${row.product_id}:${storeId}`, row.quantity);
  }
  const short = [...needed.values()].filter(n => (available.get(`${n.productId}:${n.storeId}`) ?? 0) < n.qty);
  if (!short.length) return;
  const products = await productsByIds(db, short.map(s => s.productId));
  const storeIds = [...new Set(short.map(s => s.storeId))];
  const stores = new Map((await all<{ id: number; store_code: string }>(db.prepare(`SELECT id,store_code FROM stores WHERE id IN (${placeholders(storeIds.length)})`).bind(...storeIds))).map(s => [s.id, s.store_code]));
  const details = short.map(s => `${products.get(s.productId)?.name ?? `product ${s.productId}`} at ${stores.get(s.storeId) ?? `store ${s.storeId}`}: available ${available.get(`${s.productId}:${s.storeId}`) ?? 0}, required ${s.qty}`);
  throw new HttpError(409, `Insufficient stock. ${details.join('; ')}`, 'insufficient_stock');
}

/**
 * Builds the batch statements that apply stock changes and record their movements.
 * Each (productId, storeId) pair may appear at most once. When saleBillNumber is given,
 * reference_id is resolved from the sale inserted earlier in the same batch.
 */
export function stockStatements(db: D1Database, changes: StockChange[], actorId: number | null, at = nowIso(), saleBillNumber?: string): D1PreparedStatement[] {
  const rows = changes.filter(c => c.delta !== 0);
  if (!rows.length) return [];
  const keys = new Set(rows.map(r => `${r.productId}:${r.storeId}`));
  if (keys.size !== rows.length) throw new Error('duplicate_stock_change');
  const statements: D1PreparedStatement[] = [];
  // Increases upsert the stock row. SQLite checks CHECK constraints before detecting the conflict, so
  // decreases must be a plain UPDATE: an existing row going below zero fails CHECK, and a missing row
  // updates nothing, so the movement's NOT NULL balance_after fails. Either way the batch rolls back.
  const increases = rows.filter(r => r.delta > 0), decreases = rows.filter(r => r.delta < 0);
  for (const chunk of increases.length ? chunkRows(increases, 1, 3) : []) statements.push(db.prepare(
    `WITH v(p,s,d) AS (VALUES ${chunk.map(() => '(?,?,?)').join(',')}) INSERT INTO inventory_stock(product_id,store_id,quantity,updated_at) SELECT p,s,d,? FROM v WHERE true ` +
    'ON CONFLICT(product_id,store_id) DO UPDATE SET quantity=quantity+excluded.quantity,updated_at=excluded.updated_at'
  ).bind(...chunk.flatMap(r => [r.productId, r.storeId, r.delta]), at));
  for (const chunk of decreases.length ? chunkRows(decreases, 1, 3) : []) statements.push(db.prepare(
    `WITH v(p,s,d) AS (VALUES ${chunk.map(() => '(?,?,?)').join(',')}) UPDATE inventory_stock SET quantity=quantity+(SELECT v.d FROM v WHERE v.p=inventory_stock.product_id AND v.s=inventory_stock.store_id),updated_at=? ` +
    'WHERE (product_id,store_id) IN (SELECT p,s FROM v)'
  ).bind(...chunk.flatMap(r => [r.productId, r.storeId, r.delta]), at));
  const reference = saleBillNumber ? '(SELECT id FROM telecom_sales WHERE bill_number=?)' : 'v.ri';
  for (const chunk of chunkRows(rows, saleBillNumber ? 3 : 2, 8)) statements.push(db.prepare(
    `WITH v(p,s,t,d,c,rt,ri,n) AS (VALUES ${chunk.map(() => '(?,?,?,?,?,?,?,?)').join(',')}) ` +
    'INSERT INTO inventory_movements(product_id,store_id,movement_type,quantity_change,balance_after,unit_cost_halalas,reference_type,reference_id,notes,created_by,created_at) ' +
    `SELECT v.p,v.s,v.t,v.d,(SELECT st.quantity FROM inventory_stock st WHERE st.product_id=v.p AND st.store_id=v.s),v.c,v.rt,${reference},v.n,?,? FROM v`
  ).bind(...chunk.flatMap(r => [r.productId, r.storeId, r.type, r.delta, r.unitCost ?? null, r.referenceType ?? null, r.referenceId ?? null, r.notes ?? null]), ...(saleBillNumber ? [saleBillNumber] : []), actorId, at));
  return statements;
}

/** Runs a batch containing stock statements, reporting a concurrent stock race as 409 insufficient stock. */
export async function runStockBatch(db: D1Database, statements: D1PreparedStatement[], changes: StockChange[]) {
  try { return await batch(db, statements); } catch (error) {
    if (error instanceof HttpError && error.code === 'reference_changed' && changes.some(c => c.delta < 0))
      throw new HttpError(409, 'Insufficient stock: stock changed while saving. Please retry.', 'insufficient_stock');
    throw error;
  }
}

/** Net quantity currently deducted for a Telecom sale, per product and store, from its movement history. */
export async function recordedSaleStock(db: D1Database, saleId: number) {
  return all<{ product_id: number; store_id: number; deducted: number }>(db.prepare(
    "SELECT product_id,store_id,-sum(quantity_change) deducted FROM inventory_movements WHERE reference_type='TELECOM_SALE' AND reference_id=? GROUP BY product_id,store_id HAVING sum(quantity_change)<>0"
  ).bind(saleId));
}

/** Stock changes that move a sale from what it has deducted (recorded) to what it should deduct (desired). */
export function saleStockChanges(desired: Map<string, { productId: number; storeId: number; qty: number }>, recorded: Array<{ product_id: number; store_id: number; deducted: number }>, referenceId: number | null, notes: string): StockChange[] {
  const keys = new Map<string, { productId: number; storeId: number; want: number; had: number }>();
  for (const d of desired.values()) keys.set(`${d.productId}:${d.storeId}`, { productId: d.productId, storeId: d.storeId, want: d.qty, had: 0 });
  for (const r of recorded) {
    const key = `${r.product_id}:${r.store_id}`, entry = keys.get(key);
    if (entry) entry.had = r.deducted; else keys.set(key, { productId: r.product_id, storeId: r.store_id, want: 0, had: r.deducted });
  }
  const changes: StockChange[] = [];
  for (const e of keys.values()) {
    const delta = e.had - e.want;
    if (delta !== 0) changes.push({ productId: e.productId, storeId: e.storeId, delta, type: delta < 0 ? 'SALE' : 'SALE_RETURN', referenceType: 'TELECOM_SALE', referenceId, notes });
  }
  return changes;
}

// ---------- helpers ----------
async function storeScope(db: D1Database, claims: Claims, query: Query): Promise<number | null> {
  const scope = await actorStore(db, claims), raw = query('storeId');
  const storeId = raw ? id(raw) : null;
  if (scope === null) return storeId;
  if (storeId !== null && storeId !== scope) throw new HttpError(403, 'Access denied: you do not have access to this store');
  return scope;
}
async function checkStore(db: D1Database, claims: Claims, storeId: number) {
  const scope = await actorStore(db, claims);
  if (scope !== null && scope !== storeId) throw new HttpError(403, 'Access denied: you do not have access to this store');
  if (!await one(db.prepare('SELECT id FROM stores WHERE id=?').bind(storeId))) throw new HttpError(404, 'Store not found');
}
function searchClause(alias: string, search: string | undefined, clauses: string[], bindings: unknown[]) {
  if (!search) return;
  const p = likePattern(search);
  clauses.push(`(lower(${alias}.sku) LIKE ? ESCAPE '\\' OR lower(${alias}.name) LIKE ? ESCAPE '\\' OR lower(coalesce(${alias}.barcode,'')) LIKE ? ESCAPE '\\' OR lower(coalesce(${alias}.brand,'')) LIKE ? ESCAPE '\\' OR lower(coalesce(${alias}.model,'')) LIKE ? ESCAPE '\\')`);
  bindings.push(p, p, p, p, p);
}
function productFilters(query: Query, alias: string, clauses: string[], bindings: unknown[]) {
  const company = query('company'), division = query('division'), category = query('category'), active = queryFlag(query, 'active');
  if (company) { clauses.push(`${alias}.company=?`); bindings.push(oneOf(company, 'company', COMPANIES)); }
  if (division) { clauses.push(`${alias}.division=?`); bindings.push(oneOf(division, 'division', DIVISIONS)); }
  if (category) {
    if (new TextEncoder().encode(category).length > 100) throw new HttpError(400, 'Invalid category');
    clauses.push(`lower(coalesce(${alias}.category,''))=lower(?)`); bindings.push(category);
  }
  if (active !== undefined) { clauses.push(`${alias}.is_active=?`); bindings.push(active ? 1 : 0); }
  searchClause(alias, query('search'), clauses, bindings);
}
const where = (clauses: string[]) => clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
/** Products with stock_quantity summed over all stores, or over one store when storeId is not null. */
const productSelect = (storeId: number | null) => ({
  sql: `SELECT p.*,coalesce((SELECT sum(s.quantity) FROM inventory_stock s WHERE s.product_id=p.id${storeId !== null ? ' AND s.store_id=?' : ''}),0) stock_quantity FROM inventory_products p`,
  bindings: storeId !== null ? [storeId] : [],
});
function publicProduct(row: Record<string, unknown>) {
  const value = camel(row), stock = Number(row.stock_quantity ?? 0), tracked = Number(row.track_stock) === 1;
  return { ...value, trackStock: tracked, stockQuantity: tracked ? stock : null, lowStock: tracked && Number(row.is_active) === 1 && stock <= Number(row.reorder_level), outOfStock: tracked && stock <= 0 };
}
function publicMovement(row: Record<string, unknown>) {
  const value = camel(row);
  for (const key of ['productSku', 'productName', 'productCompany', 'productDivision', 'storeName', 'storeCode', 'createdByName']) delete value[key];
  return {
    ...value,
    product: { id: row.product_id, sku: row.product_sku, name: row.product_name, company: row.product_company, division: row.product_division },
    store: { id: row.store_id, storeName: row.store_name, storeCode: row.store_code },
    createdBy: row.created_by ? { id: row.created_by, name: row.created_by_name } : null,
  };
}
const movementSelect = 'SELECT m.*,p.sku product_sku,p.name product_name,p.company product_company,p.division product_division,st.store_name,st.store_code,a.name created_by_name FROM inventory_movements m JOIN inventory_products p ON p.id=m.product_id JOIN stores st ON st.id=m.store_id LEFT JOIN admin_users a ON a.id=m.created_by';
function nextDay(value: string) { const d = new Date(`${value}T00:00:00.000Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString(); }

/** Validated product columns (database column -> value). */
function productColumns(body: Record<string, unknown>, company: Company, creating: boolean): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  const has = (key: string) => body[key] !== undefined;
  if (creating || has('name')) cols.name = requiredText(body.name, 'name', 255);
  if (creating || has('division')) {
    if (company === 'TELECOM') cols.division = oneOf(body.division, 'division', DIVISIONS);
    else if (body.division !== undefined && body.division !== null && body.division !== '') throw new HttpError(400, 'division applies only to TELECOM products');
    else cols.division = null;
  }
  for (const [key, max] of [['barcode', 100], ['category', 100], ['brand', 100], ['model', 100], ['description', 10000]] as const)
    if (creating || has(key)) cols[key] = optionalText(body[key], key, max) ?? null;
  if (has('unit')) cols.unit = requiredText(body.unit, 'unit', 20).toUpperCase(); else if (creating) cols.unit = 'PCS';
  for (const [key, column] of [['costPrice', 'cost_price_halalas'], ['sellingPrice', 'selling_price_halalas']] as const)
    if (creating || has(key)) cols[column] = body[key] === undefined || body[key] === null || body[key] === '' ? 0 : sar(body[key], key);
  if (creating || has('reorderLevel')) cols.reorder_level = body.reorderLevel === undefined || body.reorderLevel === null || body.reorderLevel === '' ? 0 : intInRange(body.reorderLevel, 'reorderLevel', 0, 1_000_000);
  if (creating || has('trackStock')) cols.track_stock = body.trackStock === undefined ? 1 : bool(body.trackStock, 'trackStock') ? 1 : 0;
  if (creating || has('isActive')) cols.is_active = body.isActive === undefined ? 1 : bool(body.isActive, 'isActive') ? 1 : 0;
  return cols;
}
async function assertUnique(db: D1Database, sku: string | undefined, barcode: string | null | undefined, excludeId: number | null) {
  if (sku !== undefined && await one(db.prepare('SELECT id FROM inventory_products WHERE lower(sku)=lower(?) AND id IS NOT ?').bind(sku, excludeId))) throw new HttpError(409, 'A product with this SKU already exists');
  if (barcode && await one(db.prepare('SELECT id FROM inventory_products WHERE barcode=? AND id IS NOT ?').bind(barcode, excludeId))) throw new HttpError(409, 'A product with this barcode already exists');
}
const skuPrefix = (company: Company) => company === 'TELECOM' ? 'TEL' : 'MTC';
async function allocateSku(db: D1Database, company: Company) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await one<{ value: number }>(db.prepare('UPDATE inventory_counters SET next_value=next_value+1,updated_at=? WHERE kind=? AND next_value<2147483647 RETURNING next_value-1 AS value').bind(nowIso(), `product-${company}`));
    if (!row) throw new HttpError(409, 'Sequence exhausted', 'sequence_exhausted');
    const sku = `${skuPrefix(company)}-${String(row.value).padStart(4, '0')}`;
    if (!await one(db.prepare('SELECT id FROM inventory_products WHERE lower(sku)=lower(?)').bind(sku))) return sku;
  }
  throw new HttpError(409, 'Could not generate a SKU. Enter one manually.');
}
function parseOpening(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 50) throw new HttpError(400, 'openingStock must be an array of up to 50 entries');
  const seen = new Set<number>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, `Invalid openingStock entry ${index + 1}`);
    const entry = raw as Record<string, unknown>;
    rejectUnknown(entry, ['storeId', 'quantity', 'unitCost'], 'openingStock field');
    const storeId = requiredId(entry.storeId, 'openingStock.storeId');
    if (seen.has(storeId)) throw new HttpError(400, 'openingStock contains the same store twice');
    seen.add(storeId);
    return { storeId, quantity: intInRange(entry.quantity, 'openingStock.quantity', 1, MAX_QTY), unitCost: entry.unitCost === undefined || entry.unitCost === null || entry.unitCost === '' ? null : sar(entry.unitCost, 'openingStock.unitCost') };
  });
}

// ---------- products ----------
export async function listProducts(db: D1Database, claims: Claims, query: Query) {
  const { page, limit, offset } = pageQuery(query);
  const storeId = await storeScope(db, claims, query), inner = productSelect(storeId);
  const clauses: string[] = [], bindings: unknown[] = [];
  productFilters(query, 'x', clauses, bindings);
  if (queryFlag(query, 'lowStock')) clauses.push('x.track_stock=1 AND x.is_active=1 AND x.stock_quantity<=x.reorder_level');
  if (queryFlag(query, 'outOfStock')) clauses.push('x.track_stock=1 AND x.stock_quantity<=0');
  const from = `FROM (${inner.sql}) x${where(clauses)}`, b = [...inner.bindings, ...bindings];
  const total = (await one<{ n: number }>(db.prepare(`SELECT count(*) n ${from}`).bind(...b)))?.n ?? 0;
  const rows = await all<Record<string, unknown>>(db.prepare(`SELECT * ${from} ORDER BY x.name COLLATE NOCASE,x.id LIMIT ? OFFSET ?`).bind(...b, limit, offset));
  return { success: true, message: 'Products fetched successfully', count: total, page, limit, totalPages: Math.ceil(total / limit), data: rows.map(publicProduct) };
}

export async function getProduct(db: D1Database, claims: Claims, productId: number) {
  const scope = await actorStore(db, claims), inner = productSelect(scope);
  const row = await one<Record<string, unknown>>(db.prepare(`SELECT * FROM (${inner.sql}) x WHERE x.id=?`).bind(...inner.bindings, productId));
  if (!row) throw new HttpError(404, 'Product not found');
  const stock = await all<{ store_id: number; store_name: string; store_code: string; quantity: number; updated_at: string }>(db.prepare(
    `SELECT s.store_id,st.store_name,st.store_code,s.quantity,s.updated_at FROM inventory_stock s JOIN stores st ON st.id=s.store_id WHERE s.product_id=?${scope !== null ? ' AND s.store_id=?' : ''} ORDER BY st.store_code`
  ).bind(...(scope !== null ? [productId, scope] : [productId])));
  return {
    success: true, message: 'Product fetched successfully',
    data: { ...publicProduct(row), stockByStore: stock.map(s => ({ store: { id: s.store_id, storeName: s.store_name, storeCode: s.store_code }, quantity: s.quantity, updatedAt: s.updated_at })) },
  };
}

export async function createProduct(db: D1Database, claims: Claims, body: Record<string, unknown>) {
  rejectUnknown(body, PRODUCT_FIELDS);
  const company = oneOf(body.company, 'company', COMPANIES), cols = productColumns(body, company, true), opening = parseOpening(body.openingStock);
  if (opening.length && !cols.track_stock) throw new HttpError(400, 'openingStock requires trackStock to be true');
  for (const entry of opening) await checkStore(db, claims, entry.storeId);
  const manualSku = optionalText(body.sku, 'sku', 50) ?? undefined;
  await assertUnique(db, manualSku, cols.barcode as string | null, null);
  const sku = manualSku ?? await allocateSku(db, company), at = nowIso(), keys = Object.keys(cols);
  const row = await one<{ id: number }>(db.prepare(
    `INSERT INTO inventory_products(sku,company,${keys.join(',')},created_by,created_at,updated_at) VALUES(?,?,${keys.map(() => '?').join(',')},?,?,?) RETURNING id`
  ).bind(sku, company, ...keys.map(k => cols[k]), claims.sub, at, at));
  if (!row) throw new HttpError(500, 'Product creation failed');
  if (opening.length) {
    const changes: StockChange[] = opening.map(o => ({ productId: row.id, storeId: o.storeId, delta: o.quantity, type: 'OPENING', unitCost: o.unitCost ?? Number(cols.cost_price_halalas), notes: 'Opening stock' }));
    try { await batch(db, stockStatements(db, changes, claims.sub, at)); } catch (error) { await run(db.prepare('DELETE FROM inventory_products WHERE id=?').bind(row.id)); throw error; }
  }
  return { ...(await getProduct(db, claims, row.id)), message: 'Product created successfully' };
}

export async function updateProduct(db: D1Database, claims: Claims, productId: number, body: Record<string, unknown>) {
  rejectUnknown(body, PRODUCT_FIELDS.filter(f => f !== 'openingStock'));
  if (!Object.keys(body).length) throw new HttpError(400, 'No changes');
  const current = await one<ProductRow>(db.prepare('SELECT * FROM inventory_products WHERE id=?').bind(productId));
  if (!current) throw new HttpError(404, 'Product not found');
  if (body.company !== undefined && oneOf(body.company, 'company', COMPANIES) !== current.company) throw new HttpError(400, 'company cannot be changed after the product is created');
  const cols = productColumns(body, current.company, false);
  if (body.sku !== undefined) cols.sku = requiredText(body.sku, 'sku', 50);
  await assertUnique(db, cols.sku as string | undefined, cols.barcode as string | null | undefined, productId);
  cols.updated_at = nowIso();
  const keys = Object.keys(cols);
  await run(db.prepare(`UPDATE inventory_products SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`).bind(...keys.map(k => cols[k]), productId));
  return { ...(await getProduct(db, claims, productId)), message: 'Product updated successfully' };
}

export async function deleteProduct(db: D1Database, productId: number) {
  if (!await one(db.prepare('SELECT id FROM inventory_products WHERE id=?').bind(productId))) throw new HttpError(404, 'Product not found');
  const used = await one<{ m: number; s: number }>(db.prepare('SELECT (SELECT count(*) FROM inventory_movements WHERE product_id=?) m,(SELECT count(*) FROM telecom_sale_items WHERE product_id=?) s').bind(productId, productId));
  if ((used?.m ?? 0) > 0 || (used?.s ?? 0) > 0) throw new HttpError(409, 'This product has stock or sales history. Set isActive to false instead of deleting it.');
  await batch(db, [db.prepare('DELETE FROM inventory_stock WHERE product_id=?').bind(productId), db.prepare('DELETE FROM inventory_products WHERE id=?').bind(productId)]);
  return { success: true, message: 'Product deleted successfully' };
}

export async function nextSku(db: D1Database, query: Query) {
  const company = oneOf(query('company'), 'company', COMPANIES);
  const row = await one<{ next_value: number }>(db.prepare('SELECT next_value FROM inventory_counters WHERE kind=?').bind(`product-${company}`));
  return { success: true, data: { sku: `${skuPrefix(company)}-${String(row?.next_value ?? 1).padStart(4, '0')}` } };
}

export async function listCategories(db: D1Database, query: Query) {
  const raw = query('company'), company = raw ? oneOf(raw, 'company', COMPANIES) : null;
  const rows = await all<{ category: string }>(db.prepare('SELECT DISTINCT category FROM inventory_products WHERE category IS NOT NULL AND (? IS NULL OR company=?) ORDER BY category COLLATE NOCASE').bind(company, company));
  return { success: true, data: rows.map(r => r.category) };
}

// ---------- stock ----------
export async function listStock(db: D1Database, claims: Claims, query: Query) {
  const { page, limit, offset } = pageQuery(query);
  const storeId = await storeScope(db, claims, query), clauses: string[] = [], bindings: unknown[] = [];
  if (storeId !== null) { clauses.push('s.store_id=?'); bindings.push(storeId); }
  productFilters(query, 'p', clauses, bindings);
  if (queryFlag(query, 'lowStock')) clauses.push('p.track_stock=1 AND p.is_active=1 AND s.quantity<=p.reorder_level');
  const from = `FROM inventory_stock s JOIN inventory_products p ON p.id=s.product_id JOIN stores st ON st.id=s.store_id${where(clauses)}`;
  const total = (await one<{ n: number }>(db.prepare(`SELECT count(*) n ${from}`).bind(...bindings)))?.n ?? 0;
  const rows = await all<Record<string, number | string | null>>(db.prepare(
    `SELECT s.quantity,s.updated_at,p.id product_id,p.sku,p.name,p.company,p.division,p.category,p.unit,p.reorder_level,p.cost_price_halalas,p.selling_price_halalas,p.is_active,st.id store_id,st.store_name,st.store_code ${from} ORDER BY p.name COLLATE NOCASE,st.store_code LIMIT ? OFFSET ?`
  ).bind(...bindings, limit, offset));
  return {
    success: true, message: 'Stock fetched successfully', count: total, page, limit, totalPages: Math.ceil(total / limit),
    data: rows.map(r => {
      const quantity = Number(r.quantity);
      return {
        product: { id: r.product_id, sku: r.sku, name: r.name, company: r.company, division: r.division, category: r.category, unit: r.unit, reorderLevel: r.reorder_level, isActive: Number(r.is_active) === 1 },
        store: { id: r.store_id, storeName: r.store_name, storeCode: r.store_code },
        quantity, lowStock: Number(r.is_active) === 1 && quantity <= Number(r.reorder_level),
        stockValueCost: (quantity * Number(r.cost_price_halalas)) / 100, stockValueRetail: (quantity * Number(r.selling_price_halalas)) / 100, updatedAt: r.updated_at,
      };
    }),
  };
}

async function trackedProduct(db: D1Database, productId: number) {
  const product = await one<ProductRow>(db.prepare('SELECT * FROM inventory_products WHERE id=?').bind(productId));
  if (!product) throw new HttpError(404, 'Product not found');
  if (product.track_stock !== 1) throw new HttpError(400, `${product.name} does not track stock`);
  return product;
}
async function stockAt(db: D1Database, productId: number, storeId: number) {
  return (await one<{ quantity: number }>(db.prepare('SELECT quantity FROM inventory_stock WHERE product_id=? AND store_id=?').bind(productId, storeId)))?.quantity ?? 0;
}

export async function adjustStock(db: D1Database, claims: Claims, body: Record<string, unknown>) {
  rejectUnknown(body, ['productId', 'storeId', 'type', 'quantity', 'unitCost', 'notes']);
  const productId = requiredId(body.productId, 'productId'), storeId = requiredId(body.storeId, 'storeId');
  const type = oneOf(body.type, 'type', ADJUSTMENT_TYPES), quantity = intInRange(body.quantity, 'quantity', 1, MAX_QTY);
  const product = await trackedProduct(db, productId);
  await checkStore(db, claims, storeId);
  const unitCost = body.unitCost === undefined || body.unitCost === null || body.unitCost === '' ? (type === 'PURCHASE' ? product.cost_price_halalas : null) : sar(body.unitCost, 'unitCost');
  const changes: StockChange[] = [{ productId, storeId, delta: type === 'PURCHASE' || type === 'ADJUSTMENT_IN' ? quantity : -quantity, type, unitCost, notes: optionalText(body.notes, 'notes', 1000) ?? null }];
  await assertStockAvailable(db, changes);
  await runStockBatch(db, stockStatements(db, changes, claims.sub), changes);
  const movement = await one<Record<string, unknown>>(db.prepare(`${movementSelect} WHERE m.product_id=? AND m.store_id=? ORDER BY m.id DESC LIMIT 1`).bind(productId, storeId));
  return { success: true, message: 'Stock updated successfully', data: { productId, storeId, quantity: await stockAt(db, productId, storeId), movement: movement ? publicMovement(movement) : null } };
}

export async function transferStock(db: D1Database, claims: Claims, body: Record<string, unknown>) {
  rejectUnknown(body, ['productId', 'fromStoreId', 'toStoreId', 'quantity', 'notes']);
  const productId = requiredId(body.productId, 'productId'), from = requiredId(body.fromStoreId, 'fromStoreId'), to = requiredId(body.toStoreId, 'toStoreId');
  if (from === to) throw new HttpError(400, 'fromStoreId and toStoreId must be different');
  const quantity = intInRange(body.quantity, 'quantity', 1, MAX_QTY);
  await trackedProduct(db, productId);
  await checkStore(db, claims, from);
  if (!await one(db.prepare('SELECT id FROM stores WHERE id=?').bind(to))) throw new HttpError(404, 'Destination store not found');
  const notes = optionalText(body.notes, 'notes', 1000) ?? null;
  const changes: StockChange[] = [
    { productId, storeId: from, delta: -quantity, type: 'TRANSFER_OUT', referenceType: 'TRANSFER', notes },
    { productId, storeId: to, delta: quantity, type: 'TRANSFER_IN', referenceType: 'TRANSFER', notes },
  ];
  await assertStockAvailable(db, changes);
  await runStockBatch(db, stockStatements(db, changes, claims.sub), changes);
  return { success: true, message: 'Stock transferred successfully', data: { productId, quantity, from: { storeId: from, quantity: await stockAt(db, productId, from) }, to: { storeId: to, quantity: await stockAt(db, productId, to) } } };
}

export async function listMovements(db: D1Database, claims: Claims, query: Query) {
  const { page, limit, offset } = pageQuery(query, 50, 100);
  const storeId = await storeScope(db, claims, query), clauses: string[] = [], bindings: unknown[] = [];
  if (storeId !== null) { clauses.push('m.store_id=?'); bindings.push(storeId); }
  const productId = query('productId'), type = query('type'), referenceType = query('referenceType'), start = query('startDate'), end = query('endDate');
  if (productId) { clauses.push('m.product_id=?'); bindings.push(id(productId)); }
  if (type) { clauses.push('m.movement_type=?'); bindings.push(oneOf(type, 'type', MOVEMENT_TYPES)); }
  if (referenceType) { clauses.push('m.reference_type=?'); bindings.push(oneOf(referenceType, 'referenceType', REFERENCE_TYPES)); }
  if (start) { clauses.push('m.created_at>=?'); bindings.push(`${date(start)}T00:00:00.000Z`); }
  if (end) { clauses.push('m.created_at<?'); bindings.push(nextDay(date(end))); }
  productFilters(query, 'p', clauses, bindings);
  const w = where(clauses);
  const total = (await one<{ n: number }>(db.prepare(`SELECT count(*) n FROM inventory_movements m JOIN inventory_products p ON p.id=m.product_id${w}`).bind(...bindings)))?.n ?? 0;
  const rows = await all<Record<string, unknown>>(db.prepare(`${movementSelect}${w} ORDER BY m.id DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset));
  return { success: true, message: 'Stock movements fetched successfully', count: total, page, limit, totalPages: Math.ceil(total / limit), data: rows.map(publicMovement) };
}

// ---------- report ----------
export async function inventoryReport(db: D1Database, claims: Claims, query: Query) {
  const range = reportRange(query), storeId = await storeScope(db, claims, query), inner = productSelect(storeId);
  const clauses: string[] = [], bindings: unknown[] = [];
  productFilters(query, 'x', clauses, bindings);
  const from = `FROM (${inner.sql}) x${where(clauses)}`, b = [...inner.bindings, ...bindings];
  const fromWith = (condition: string) => `${from}${clauses.length ? ' AND ' : ' WHERE '}${condition}`;
  const value = "coalesce(sum(CASE WHEN x.track_stock=1 THEN x.stock_quantity END),0) units,coalesce(sum(CASE WHEN x.track_stock=1 THEN x.stock_quantity*x.cost_price_halalas END),0) cost_value,coalesce(sum(CASE WHEN x.track_stock=1 THEN x.stock_quantity*x.selling_price_halalas END),0) retail_value";
  const mClauses = ['m.created_at>=?', 'm.created_at<?'], mBindings: unknown[] = [range.startTs, range.endExclusiveTs];
  if (storeId !== null) { mClauses.push('m.store_id=?'); mBindings.push(storeId); }
  productFilters(query, 'p', mClauses, mBindings);
  const mFrom = `FROM inventory_movements m JOIN inventory_products p ON p.id=m.product_id WHERE ${mClauses.join(' AND ')}`;
  const [totals, byCompany, byCategory, lowStock, byType, topSold] = await Promise.all([
    one<Record<string, number>>(db.prepare(`SELECT count(*) products,coalesce(sum(x.is_active),0) active,coalesce(sum(x.track_stock),0) tracked,${value},coalesce(sum(x.track_stock=1 AND x.is_active=1 AND x.stock_quantity>0 AND x.stock_quantity<=x.reorder_level),0) low,coalesce(sum(x.track_stock=1 AND x.is_active=1 AND x.stock_quantity<=0),0) out_of_stock ${from}`).bind(...b)),
    all<Record<string, number | string | null>>(db.prepare(`SELECT x.company,x.division,count(*) products,${value} ${from} GROUP BY x.company,x.division ORDER BY x.company,x.division`).bind(...b)),
    all<Record<string, number | string>>(db.prepare(`SELECT coalesce(x.category,'Uncategorized') category,count(*) products,${value} ${from} GROUP BY coalesce(x.category,'Uncategorized') ORDER BY cost_value DESC,category`).bind(...b)),
    all<Record<string, unknown>>(db.prepare(`SELECT * ${fromWith('x.track_stock=1 AND x.is_active=1 AND x.stock_quantity<=x.reorder_level')} ORDER BY x.stock_quantity,x.name COLLATE NOCASE LIMIT 50`).bind(...b)),
    all<{ movement_type: string; count: number; units: number }>(db.prepare(`SELECT m.movement_type,count(*) count,coalesce(sum(abs(m.quantity_change)),0) units ${mFrom} GROUP BY m.movement_type ORDER BY m.movement_type`).bind(...mBindings)),
    all<Record<string, number | string | null>>(db.prepare(`SELECT p.id,p.sku,p.name,p.company,p.division,-sum(m.quantity_change) units ${mFrom} AND m.movement_type IN ('SALE','SALE_RETURN') GROUP BY p.id HAVING -sum(m.quantity_change)>0 ORDER BY units DESC LIMIT 10`).bind(...mBindings)),
  ]);
  const t = totals ?? {}, toSar = (v: unknown) => Number(v ?? 0) / 100;
  const valued = (r: Record<string, unknown>) => ({ products: Number(r.products), units: Number(r.units), stockValueCost: toSar(r.cost_value), stockValueRetail: toSar(r.retail_value) });
  return {
    success: true, message: 'Inventory report retrieved successfully',
    data: {
      dateRange: { startDate: range.start, endDate: range.end },
      summary: { totalProducts: Number(t.products ?? 0), activeProducts: Number(t.active ?? 0), trackedProducts: Number(t.tracked ?? 0), totalUnits: Number(t.units ?? 0), stockValueCost: toSar(t.cost_value), stockValueRetail: toSar(t.retail_value), potentialProfit: toSar(Number(t.retail_value ?? 0) - Number(t.cost_value ?? 0)), lowStockCount: Number(t.low ?? 0), outOfStockCount: Number(t.out_of_stock ?? 0) },
      byCompany: byCompany.map(r => ({ company: r.company, division: r.division, ...valued(r) })),
      byCategory: byCategory.map(r => ({ category: r.category, ...valued(r) })),
      lowStock: lowStock.map(publicProduct),
      movementsByType: byType.map(r => ({ type: r.movement_type, count: r.count, units: r.units })),
      topSold: topSold.map(r => ({ product: { id: r.id, sku: r.sku, name: r.name, company: r.company, division: r.division }, units: Number(r.units) })),
    },
  };
}

// ---------- Telecom Sales product picker ----------
/** Active TELECOM / SALES products only, with stock at the chosen (or the admin's) store. */
export async function listTelecomSaleProducts(db: D1Database, claims: Claims, query: Query) {
  const { page, limit, offset } = pageQuery(query, 20, 50);
  const storeId = await storeScope(db, claims, query), inner = productSelect(storeId);
  const clauses = ["x.company='TELECOM'", "x.division='SALES'", 'x.is_active=1'], bindings: unknown[] = [];
  searchClause('x', query('search'), clauses, bindings);
  if (queryFlag(query, 'inStockOnly')) clauses.push('(x.track_stock=0 OR x.stock_quantity>0)');
  const from = `FROM (${inner.sql}) x${where(clauses)}`, b = [...inner.bindings, ...bindings];
  const total = (await one<{ n: number }>(db.prepare(`SELECT count(*) n ${from}`).bind(...b)))?.n ?? 0;
  const rows = await all<Record<string, unknown>>(db.prepare(`SELECT * ${from} ORDER BY x.name COLLATE NOCASE,x.id LIMIT ? OFFSET ?`).bind(...b, limit, offset));
  return { success: true, message: 'Telecom sales products fetched successfully', count: total, page, limit, totalPages: Math.ceil(total / limit), storeId, data: rows.map(publicProduct) };
}

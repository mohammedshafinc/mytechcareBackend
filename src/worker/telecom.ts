// Telecom module: sales bills (TELECOM_SALES) and the sales report (TELECOM_REPORTS).
// Money is accepted and returned in SAR and stored as integer halalas.
import { chunkRows } from './bulk';
import { all, batch, one, placeholders } from './db';
import { HttpError, camel, date, id, money, nowIso, riyadhDate } from './http';
import type { Claims } from './jwt';
import { reportRange } from './reports';

const MAX_HALALAS = 9_999_999_999;
export const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER'] as const;
export const SALE_STATUSES = ['PAID', 'PENDING', 'CANCELLED'] as const;
export const ITEM_CATEGORIES = ['MOBILE', 'ACCESSORY', 'SIM', 'RECHARGE', 'SERVICE', 'OTHER'] as const;
const CREATE_FIELDS = ['saleDate', 'customerName', 'customerMobile', 'paymentMethod', 'status', 'storeId', 'staffId', 'discount', 'vatRate', 'notes', 'items'];
const ITEM_FIELDS = ['product', 'category', 'imei', 'quantity', 'unitPrice', 'unitCost'];

interface SaleItem { sl: number; product: string; category: string; imei: string | null; quantity: number; unitPrice: number; unitCost: number; lineTotal: number }
interface Totals { subtotal: number; discount: number; vatBps: number; vat: number; grand: number; cost: number }

// ---------- validation helpers ----------
function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[], label = 'field') {
  for (const key of Object.keys(body)) if (!allowed.includes(key)) throw new HttpError(400, `Unknown ${label}: ${key}`);
}
function optionalText(value: unknown, name: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || new TextEncoder().encode(value).length > max) throw new HttpError(400, `Invalid ${name}`);
  return value.trim() || null;
}
function sar(value: unknown, name: string): number {
  if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, `Invalid ${name}`);
  let halalas: number;
  try { halalas = money(value); } catch { throw new HttpError(400, `Invalid ${name}`); }
  if (halalas > MAX_HALALAS) throw new HttpError(400, `${name} exceeds the money limit`);
  return halalas;
}
function oneOf<T extends string>(value: unknown, name: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value.toUpperCase() as T)) throw new HttpError(400, `${name} must be one of ${allowed.join(', ')}`);
  return value.toUpperCase() as T;
}
function optionalId(value: unknown, name: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, `Invalid ${name}`);
  try { return id(String(value)); } catch { throw new HttpError(400, `Invalid ${name}`); }
}
function vatBps(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100 || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new HttpError(400, 'vatRate must be a percentage between 0 and 100');
  return Math.round(n * 100);
}
function parseItems(value: unknown): SaleItem[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, 'items must be a non-empty array');
  if (value.length > 100) throw new HttpError(400, 'A bill can contain at most 100 items');
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, `Invalid item ${index + 1}`);
    const item = raw as Record<string, unknown>;
    rejectUnknown(item, ITEM_FIELDS, 'item field');
    const product = optionalText(item.product, 'product', 255);
    if (!product) throw new HttpError(400, `Item ${index + 1}: product is required`);
    const quantity = item.quantity === undefined ? 1 : Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) throw new HttpError(400, `Item ${index + 1}: quantity must be an integer between 1 and 1000`);
    if (item.unitPrice === undefined) throw new HttpError(400, `Item ${index + 1}: unitPrice is required`);
    const unitPrice = sar(item.unitPrice, 'unitPrice');
    const unitCost = item.unitCost === undefined || item.unitCost === null || item.unitCost === '' ? 0 : sar(item.unitCost, 'unitCost');
    const lineTotal = unitPrice * quantity;
    if (lineTotal > MAX_HALALAS || unitCost * quantity > MAX_HALALAS) throw new HttpError(400, `Item ${index + 1}: line total exceeds the money limit`);
    const category = item.category === undefined || item.category === null || item.category === '' ? 'OTHER' : oneOf(item.category, 'category', ITEM_CATEGORIES);
    return { sl: index + 1, product, category, imei: optionalText(item.imei, 'imei', 50) ?? null, quantity, unitPrice, unitCost, lineTotal };
  });
}
function computeTotals(subtotal: number, cost: number, discount: number, bps: number): Totals {
  if (discount > subtotal) throw new HttpError(400, 'discount cannot exceed the subtotal');
  const taxable = subtotal - discount, vat = Math.round((taxable * bps) / 10000), grand = taxable + vat;
  if (subtotal > MAX_HALALAS || cost > MAX_HALALAS || grand > MAX_HALALAS) throw new HttpError(400, 'Bill total exceeds the money limit');
  return { subtotal, discount, vatBps: bps, vat, grand, cost };
}
const sumItems = (items: SaleItem[]) => ({ subtotal: items.reduce((s, i) => s + i.lineTotal, 0), cost: items.reduce((s, i) => s + i.unitCost * i.quantity, 0) });

// ---------- store scoping ----------
// SUPER_ADMIN sees every store. Other admins assigned to a store are limited to it.
// Admins without an assigned store are not store-restricted.
async function actorStore(db: D1Database, claims: Claims): Promise<number | null> {
  if (claims.role === 'SUPER_ADMIN') return null;
  const actor = await one<{ store_id: number | null }>(db.prepare('SELECT store_id FROM admin_users WHERE id=?').bind(claims.sub));
  return actor?.store_id ?? null;
}
async function checkReferences(db: D1Database, storeId: number | null, staffId: number | null) {
  if (storeId !== null && !await one(db.prepare('SELECT id FROM stores WHERE id=?').bind(storeId))) throw new HttpError(404, 'Store not found');
  if (staffId !== null) {
    const staff = await one<{ store_id: number }>(db.prepare('SELECT store_id FROM staff WHERE id=?').bind(staffId));
    if (!staff) throw new HttpError(404, 'Staff not found');
    if (storeId !== null && staff.store_id !== storeId) throw new HttpError(400, 'Staff must belong to the selected store');
  }
}

// ---------- persistence ----------
function itemStatements(db: D1Database, saleKey: { id: number } | { billNumber: string }, items: SaleItem[]) {
  const statements: D1PreparedStatement[] = [];
  const lookup = 'id' in saleKey ? 'id=?' : 'bill_number=?';
  for (const chunk of chunkRows(items, 1, 8)) {
    const values: unknown[] = ['id' in saleKey ? saleKey.id : saleKey.billNumber];
    for (const i of chunk) values.push(i.sl, i.product, i.category, i.imei, i.quantity, i.unitPrice, i.unitCost, i.lineTotal);
    statements.push(db.prepare(
      `WITH p(id) AS (SELECT id FROM telecom_sales WHERE ${lookup}), r(sl_no,product,category,imei,quantity,unit_price_halalas,unit_cost_halalas,line_total_halalas) AS (VALUES ${chunk.map(() => '(?,?,?,?,?,?,?,?)').join(',')}) ` +
      'INSERT INTO telecom_sale_items(sale_id,sl_no,product,category,imei,quantity,unit_price_halalas,unit_cost_halalas,line_total_halalas) SELECT (SELECT id FROM p),* FROM r'
    ).bind(...values));
  }
  return statements;
}
const saleSelect = 'SELECT s.*,st.store_name,st.store_code,sf.name staff_name,sf.emp_code staff_code,a.name created_by_name FROM telecom_sales s LEFT JOIN stores st ON st.id=s.store_id LEFT JOIN staff sf ON sf.id=s.staff_id LEFT JOIN admin_users a ON a.id=s.created_by';
function publicSale(row: Record<string, unknown>, items?: Record<string, unknown>[]) {
  const value = camel(row);
  for (const key of ['storeName', 'storeCode', 'staffName', 'staffCode', 'createdByName']) delete value[key];
  const net = Number(row.subtotal_halalas) - Number(row.discount_halalas);
  return {
    ...value,
    netAmount: net / 100,
    profit: (net - Number(row.cost_total_halalas)) / 100,
    store: row.store_id ? { id: row.store_id, storeName: row.store_name, storeCode: row.store_code } : null,
    staff: row.staff_id ? { id: row.staff_id, name: row.staff_name, empCode: row.staff_code } : null,
    createdBy: row.created_by ? { id: row.created_by, name: row.created_by_name } : null,
    ...(items ? { items: items.map(i => { const item = camel(i); delete item.saleId; return item; }) } : {}),
  };
}
async function loadSale(db: D1Database, claims: Claims, saleId: number) {
  const scope = await actorStore(db, claims);
  const row = await one<Record<string, unknown>>(db.prepare(`${saleSelect} WHERE s.id=?${scope === null ? '' : ' AND s.store_id=?'}`).bind(...(scope === null ? [saleId] : [saleId, scope])));
  if (!row) throw new HttpError(404, 'Sale not found');
  return { row, scope };
}

// ---------- handlers ----------
export async function getSale(db: D1Database, claims: Claims, saleId: number) {
  const { row } = await loadSale(db, claims, saleId);
  const items = await all<Record<string, unknown>>(db.prepare('SELECT * FROM telecom_sale_items WHERE sale_id=? ORDER BY sl_no').bind(saleId));
  return { success: true, message: 'Sale fetched successfully', data: publicSale(row, items) };
}

export async function listSales(db: D1Database, claims: Claims, query: (name: string) => string | undefined) {
  const page = Number(query('page') ?? 1), limit = Number(query('limit') ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'Invalid pagination');
  const clauses: string[] = [], bindings: unknown[] = [];
  const scope = await actorStore(db, claims);
  if (scope !== null) { clauses.push('s.store_id=?'); bindings.push(scope); }
  const search = query('search');
  if (search !== undefined && search !== '') {
    if (new TextEncoder().encode(search).length > 50) throw new HttpError(400, 'Invalid search');
    const pattern = `%${search.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    clauses.push("(lower(s.bill_number) LIKE ? ESCAPE '\\' OR lower(coalesce(s.customer_name,'')) LIKE ? ESCAPE '\\' OR lower(coalesce(s.customer_mobile,'')) LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM telecom_sale_items i WHERE i.sale_id=s.id AND (lower(i.product) LIKE ? ESCAPE '\\' OR lower(coalesce(i.imei,'')) LIKE ? ESCAPE '\\')))");
    bindings.push(pattern, pattern, pattern, pattern, pattern);
  }
  const startDate = query('startDate'), endDate = query('endDate');
  if (startDate) { clauses.push('s.sale_date>=?'); bindings.push(date(startDate)); }
  if (endDate) { clauses.push('s.sale_date<=?'); bindings.push(date(endDate)); }
  if (startDate && endDate && startDate > endDate) throw new HttpError(400, 'startDate must be before endDate');
  const paymentMethod = query('paymentMethod'), status = query('status'), storeId = query('storeId');
  if (paymentMethod) { clauses.push('s.payment_method=?'); bindings.push(oneOf(paymentMethod, 'paymentMethod', PAYMENT_METHODS)); }
  if (status) { clauses.push('s.status=?'); bindings.push(oneOf(status, 'status', SALE_STATUSES)); }
  if (storeId) { clauses.push('s.store_id=?'); bindings.push(id(storeId)); }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const total = (await one<{ n: number }>(db.prepare(`SELECT count(*) n FROM telecom_sales s${where}`).bind(...bindings)))?.n ?? 0;
  const rows = await all<Record<string, unknown>>(db.prepare(`${saleSelect}${where} ORDER BY s.sale_date DESC,s.id DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, (page - 1) * limit));
  const ids = rows.map(r => Number(r.id));
  const items = ids.length ? await all<Record<string, unknown>>(db.prepare(`SELECT * FROM telecom_sale_items WHERE sale_id IN (${placeholders(ids.length)}) ORDER BY sale_id,sl_no`).bind(...ids)) : [];
  return {
    success: true, message: 'Sales fetched successfully', count: total, page, limit, totalPages: Math.ceil(total / limit),
    data: rows.map(row => publicSale(row, items.filter(i => Number(i.sale_id) === Number(row.id)))),
  };
}

export async function createSale(db: D1Database, claims: Claims, body: Record<string, unknown>) {
  rejectUnknown(body, CREATE_FIELDS);
  const items = parseItems(body.items), sums = sumItems(items);
  const totals = computeTotals(sums.subtotal, sums.cost, body.discount === undefined || body.discount === null || body.discount === '' ? 0 : sar(body.discount, 'discount'), body.vatRate === undefined ? 1500 : vatBps(body.vatRate));
  const scope = await actorStore(db, claims);
  let storeId = optionalId(body.storeId, 'storeId') ?? null;
  if (scope !== null) { if (storeId !== null && storeId !== scope) throw new HttpError(403, 'Access denied: you do not have access to this store'); storeId = scope; }
  const staffId = optionalId(body.staffId, 'staffId') ?? null;
  await checkReferences(db, storeId, staffId);
  const saleDate = body.saleDate === undefined || body.saleDate === null || body.saleDate === '' ? riyadhDate(new Date()) : date(body.saleDate);
  const paymentMethod = body.paymentMethod === undefined ? 'CASH' : oneOf(body.paymentMethod, 'paymentMethod', PAYMENT_METHODS);
  const status = body.status === undefined ? 'PAID' : oneOf(body.status, 'status', SALE_STATUSES);
  const counterRow = await one<{ value: number }>(db.prepare("UPDATE telecom_counters SET next_value=next_value+1,updated_at=? WHERE kind='telecom-sale' AND next_value<2147483647 RETURNING next_value-1 AS value").bind(nowIso()));
  if (!counterRow) throw new HttpError(409, 'Sequence exhausted', 'sequence_exhausted');
  const billNumber = `TS-${String(counterRow.value).padStart(4, '0')}`, created = nowIso();
  const insert = db.prepare('INSERT INTO telecom_sales(bill_number,sale_date,customer_name,customer_mobile,payment_method,status,store_id,staff_id,subtotal_halalas,discount_halalas,vat_rate_bps,vat_amount_halalas,grand_total_halalas,cost_total_halalas,notes,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(billNumber, saleDate, optionalText(body.customerName, 'customerName', 255) ?? null, optionalText(body.customerMobile, 'customerMobile', 50) ?? null, paymentMethod, status, storeId, staffId,
      totals.subtotal, totals.discount, totals.vatBps, totals.vat, totals.grand, totals.cost, optionalText(body.notes, 'notes', 10000) ?? null, claims.sub, created, created);
  await batch(db, [insert, ...itemStatements(db, { billNumber }, items)]);
  const row = await one<{ id: number }>(db.prepare('SELECT id FROM telecom_sales WHERE bill_number=?').bind(billNumber));
  if (!row) throw new HttpError(500, 'Sale creation failed');
  return { ...(await getSale(db, claims, row.id)), message: 'Sale created successfully' };
}

export async function updateSale(db: D1Database, claims: Claims, saleId: number, body: Record<string, unknown>) {
  rejectUnknown(body, CREATE_FIELDS);
  if (!Object.keys(body).length) throw new HttpError(400, 'No changes');
  const { row: current, scope } = await loadSale(db, claims, saleId);
  const assignments: string[] = [], values: unknown[] = [];
  const set = (column: string, value: unknown) => { assignments.push(`${column}=?`); values.push(value); };

  if (body.saleDate !== undefined) { if (body.saleDate === null || body.saleDate === '') throw new HttpError(400, 'saleDate cannot be cleared'); set('sale_date', date(body.saleDate)); }
  if (body.customerName !== undefined) set('customer_name', optionalText(body.customerName, 'customerName', 255));
  if (body.customerMobile !== undefined) set('customer_mobile', optionalText(body.customerMobile, 'customerMobile', 50));
  if (body.notes !== undefined) set('notes', optionalText(body.notes, 'notes', 10000));
  if (body.paymentMethod !== undefined) set('payment_method', oneOf(body.paymentMethod, 'paymentMethod', PAYMENT_METHODS));
  if (body.status !== undefined) set('status', oneOf(body.status, 'status', SALE_STATUSES));

  let storeId = current.store_id as number | null, staffId = current.staff_id as number | null;
  if (body.storeId !== undefined) {
    const next = optionalId(body.storeId, 'storeId') ?? null;
    if (scope !== null && next !== scope) throw new HttpError(403, 'Access denied: you do not have access to this store');
    storeId = next; set('store_id', storeId);
  }
  if (body.staffId !== undefined) { staffId = optionalId(body.staffId, 'staffId') ?? null; set('staff_id', staffId); }
  if (body.storeId !== undefined || body.staffId !== undefined) await checkReferences(db, storeId, staffId);

  const items = body.items === undefined ? undefined : parseItems(body.items);
  if (items || body.discount !== undefined || body.vatRate !== undefined) {
    const sums = items ? sumItems(items) : { subtotal: Number(current.subtotal_halalas), cost: Number(current.cost_total_halalas) };
    const discount = body.discount === undefined ? Number(current.discount_halalas) : body.discount === null || body.discount === '' ? 0 : sar(body.discount, 'discount');
    const totals = computeTotals(sums.subtotal, sums.cost, discount, body.vatRate === undefined ? Number(current.vat_rate_bps) : vatBps(body.vatRate));
    set('subtotal_halalas', totals.subtotal); set('discount_halalas', totals.discount); set('vat_rate_bps', totals.vatBps);
    set('vat_amount_halalas', totals.vat); set('grand_total_halalas', totals.grand); set('cost_total_halalas', totals.cost);
  }
  set('updated_at', nowIso());
  const statements = [db.prepare(`UPDATE telecom_sales SET ${assignments.join(',')} WHERE id=?`).bind(...values, saleId)];
  if (items) statements.push(db.prepare('DELETE FROM telecom_sale_items WHERE sale_id=?').bind(saleId), ...itemStatements(db, { id: saleId }, items));
  await batch(db, statements);
  return { ...(await getSale(db, claims, saleId)), message: 'Sale updated successfully' };
}

export async function deleteSale(db: D1Database, claims: Claims, saleId: number) {
  await loadSale(db, claims, saleId);
  await batch(db, [db.prepare('DELETE FROM telecom_sales WHERE id=?').bind(saleId)]);
  return { success: true, message: 'Sale deleted successfully' };
}

export async function nextSaleNumber(db: D1Database) {
  const row = await one<{ next_value: number }>(db.prepare("SELECT next_value FROM telecom_counters WHERE kind='telecom-sale'"));
  return { success: true, data: { billNumber: `TS-${String(row?.next_value ?? 1).padStart(4, '0')}` } };
}

// ---------- report ----------
export async function salesReport(db: D1Database, claims: Claims, query: (name: string) => string | undefined) {
  const range = reportRange(query);
  const clauses = ['s.sale_date>=?', 's.sale_date<=?'], bindings: unknown[] = [range.start, range.end];
  const scope = await actorStore(db, claims);
  if (scope !== null) { clauses.push('s.store_id=?'); bindings.push(scope); }
  const storeId = query('storeId');
  if (storeId) { clauses.push('s.store_id=?'); bindings.push(id(storeId)); }
  const where = clauses.join(' AND '), active = `${where} AND s.status!='CANCELLED'`;
  const q = <T>(sql: string) => all<T>(db.prepare(sql).bind(...bindings));
  const [summaryRows, itemsSold, byPayment, byStatus, byCategory, byStore, byStaff, daily, topProducts, details] = await Promise.all([
    q<Record<string, number>>(`SELECT count(*) total_bills,coalesce(sum(s.status='CANCELLED'),0) cancelled_bills,coalesce(sum(CASE WHEN s.status!='CANCELLED' THEN s.subtotal_halalas END),0) subtotal,coalesce(sum(CASE WHEN s.status!='CANCELLED' THEN s.discount_halalas END),0) discount,coalesce(sum(CASE WHEN s.status!='CANCELLED' THEN s.vat_amount_halalas END),0) vat,coalesce(sum(CASE WHEN s.status!='CANCELLED' THEN s.grand_total_halalas END),0) grand,coalesce(sum(CASE WHEN s.status!='CANCELLED' THEN s.cost_total_halalas END),0) cost FROM telecom_sales s WHERE ${where}`),
    q<{ n: number }>(`SELECT coalesce(sum(i.quantity),0) n FROM telecom_sale_items i JOIN telecom_sales s ON s.id=i.sale_id WHERE ${active}`),
    q<{ payment_method: string; count: number; amount: number }>(`SELECT s.payment_method,count(*) count,sum(s.grand_total_halalas) amount FROM telecom_sales s WHERE ${active} GROUP BY s.payment_method ORDER BY amount DESC`),
    q<{ status: string; count: number; amount: number }>(`SELECT s.status,count(*) count,sum(s.grand_total_halalas) amount FROM telecom_sales s WHERE ${where} GROUP BY s.status ORDER BY s.status`),
    q<{ category: string; quantity: number; revenue: number; cost: number }>(`SELECT i.category,sum(i.quantity) quantity,sum(i.line_total_halalas) revenue,sum(i.unit_cost_halalas*i.quantity) cost FROM telecom_sale_items i JOIN telecom_sales s ON s.id=i.sale_id WHERE ${active} GROUP BY i.category ORDER BY revenue DESC`),
    q<{ store_id: number | null; store_name: string | null; store_code: string | null; count: number; amount: number }>(`SELECT s.store_id,st.store_name,st.store_code,count(*) count,sum(s.grand_total_halalas) amount FROM telecom_sales s LEFT JOIN stores st ON st.id=s.store_id WHERE ${active} GROUP BY s.store_id ORDER BY amount DESC`),
    q<{ staff_id: number | null; staff_name: string | null; emp_code: string | null; count: number; amount: number }>(`SELECT s.staff_id,sf.name staff_name,sf.emp_code,count(*) count,sum(s.grand_total_halalas) amount FROM telecom_sales s LEFT JOIN staff sf ON sf.id=s.staff_id WHERE ${active} GROUP BY s.staff_id ORDER BY amount DESC`),
    q<{ date: string; count: number; amount: number; net: number; cost: number }>(`SELECT s.sale_date date,count(*) count,sum(s.grand_total_halalas) amount,sum(s.subtotal_halalas-s.discount_halalas) net,sum(s.cost_total_halalas) cost FROM telecom_sales s WHERE ${active} GROUP BY s.sale_date ORDER BY s.sale_date`),
    q<{ product: string; category: string; quantity: number; revenue: number }>(`SELECT i.product,i.category,sum(i.quantity) quantity,sum(i.line_total_halalas) revenue FROM telecom_sale_items i JOIN telecom_sales s ON s.id=i.sale_id WHERE ${active} GROUP BY i.product,i.category ORDER BY revenue DESC,quantity DESC LIMIT 10`),
    all<Record<string, unknown>>(db.prepare(`${saleSelect} WHERE ${where} ORDER BY s.sale_date DESC,s.id DESC LIMIT ? OFFSET ?`).bind(...bindings, range.limit, range.offset)),
  ]);
  const s = summaryRows[0] ?? {}, activeBills = Number(s.total_bills ?? 0) - Number(s.cancelled_bills ?? 0);
  const net = Number(s.subtotal ?? 0) - Number(s.discount ?? 0), toSar = (v: unknown) => Number(v ?? 0) / 100;
  const totalBills = Number(s.total_bills ?? 0);
  return {
    success: true, message: 'Telecom sales report retrieved successfully',
    data: {
      dateRange: { startDate: range.start, endDate: range.end },
      summary: {
        totalBills, activeBills, cancelledBills: Number(s.cancelled_bills ?? 0), itemsSold: itemsSold[0]?.n ?? 0,
        subtotal: toSar(s.subtotal), discount: toSar(s.discount), netSales: net / 100, vat: toSar(s.vat), totalRevenue: toSar(s.grand),
        cost: toSar(s.cost), profit: (net - Number(s.cost ?? 0)) / 100, averageBill: activeBills ? Math.round(Number(s.grand ?? 0) / activeBills) / 100 : 0,
      },
      byPaymentMethod: byPayment.map(r => ({ paymentMethod: r.payment_method, count: r.count, amount: toSar(r.amount) })),
      byStatus: byStatus.map(r => ({ status: r.status, count: r.count, amount: toSar(r.amount) })),
      byCategory: byCategory.map(r => ({ category: r.category, quantity: r.quantity, revenue: toSar(r.revenue), cost: toSar(r.cost), profit: toSar(r.revenue - r.cost) })),
      byStore: byStore.map(r => ({ store: r.store_id ? { id: r.store_id, storeName: r.store_name, storeCode: r.store_code } : null, count: r.count, amount: toSar(r.amount) })),
      byStaff: byStaff.map(r => ({ staff: r.staff_id ? { id: r.staff_id, name: r.staff_name, empCode: r.emp_code } : null, count: r.count, amount: toSar(r.amount) })),
      dailyTrend: daily.map(r => ({ date: r.date, count: r.count, amount: toSar(r.amount), netSales: toSar(r.net), profit: toSar(r.net - r.cost) })),
      topProducts: topProducts.map(r => ({ product: r.product, category: r.category, quantity: r.quantity, revenue: toSar(r.revenue) })),
      bills: details.map(row => publicSale(row)),
      pagination: { page: range.page, limit: range.limit, total: totalBills, totalPages: Math.ceil(totalBills / range.limit) },
    },
  };
}

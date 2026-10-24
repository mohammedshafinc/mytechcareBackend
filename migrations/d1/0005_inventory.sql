-- Inventory module: products for two companies (MYTECHCARE, TELECOM), per-store stock, and stock movement history.
-- TELECOM products must have a division (SIM_RECHARGE, SALES, SERVICE). MYTECHCARE products have none.
INSERT INTO modules(code,name,created_at) VALUES
('INVENTORY','Inventory','1970-01-01T00:00:00.000Z')
ON CONFLICT(code) DO UPDATE SET name=excluded.name;
INSERT INTO submodules(code,name,module_code,created_at) VALUES
('INVENTORY_PRODUCTS','Products','INVENTORY','1970-01-01T00:00:00.000Z'),
('INVENTORY_STOCK','Stock','INVENTORY','1970-01-01T00:00:00.000Z'),
('INVENTORY_REPORTS','Reports','INVENTORY','1970-01-01T00:00:00.000Z')
ON CONFLICT(code) DO UPDATE SET name=excluded.name,module_code=excluded.module_code;
CREATE TABLE inventory_counters (
 kind TEXT PRIMARY KEY CHECK(kind IN ('product-MYTECHCARE','product-TELECOM')),
 next_value INTEGER NOT NULL CHECK(next_value BETWEEN 1 AND 2147483647),
 updated_at TEXT NOT NULL CHECK(length(CAST(updated_at AS BLOB))=24 AND updated_at GLOB '????-??-??T??:??:??.???Z')
);
INSERT INTO inventory_counters(kind,next_value,updated_at) VALUES ('product-MYTECHCARE',1,'1970-01-01T00:00:00.000Z'),('product-TELECOM',1,'1970-01-01T00:00:00.000Z');
CREATE TABLE inventory_products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sku TEXT NOT NULL CHECK(length(sku) BETWEEN 1 AND 50),
 barcode TEXT CHECK(barcode IS NULL OR length(barcode) BETWEEN 1 AND 100),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 255),
 company TEXT NOT NULL CHECK(company IN ('MYTECHCARE','TELECOM')),
 division TEXT CHECK(division IS NULL OR division IN ('SIM_RECHARGE','SALES','SERVICE')),
 category TEXT CHECK(category IS NULL OR length(category)<=100),
 brand TEXT CHECK(brand IS NULL OR length(brand)<=100),
 model TEXT CHECK(model IS NULL OR length(model)<=100),
 unit TEXT NOT NULL DEFAULT 'PCS' CHECK(length(unit) BETWEEN 1 AND 20),
 cost_price_halalas INTEGER NOT NULL DEFAULT 0 CHECK(cost_price_halalas BETWEEN 0 AND 9999999999),
 selling_price_halalas INTEGER NOT NULL DEFAULT 0 CHECK(selling_price_halalas BETWEEN 0 AND 9999999999),
 reorder_level INTEGER NOT NULL DEFAULT 0 CHECK(reorder_level BETWEEN 0 AND 1000000),
 track_stock INTEGER NOT NULL DEFAULT 1 CHECK(track_stock IN (0,1)),
 is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
 description TEXT CHECK(description IS NULL OR length(description)<=10000),
 created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL CHECK(length(CAST(created_at AS BLOB))=24 AND created_at GLOB '????-??-??T??:??:??.???Z'),
 updated_at TEXT NOT NULL CHECK(length(CAST(updated_at AS BLOB))=24 AND updated_at GLOB '????-??-??T??:??:??.???Z'),
 CHECK((company='TELECOM' AND division IS NOT NULL) OR (company='MYTECHCARE' AND division IS NULL))
);
CREATE UNIQUE INDEX ux_inventory_products_sku ON inventory_products(lower(sku));
CREATE UNIQUE INDEX ux_inventory_products_barcode ON inventory_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_products_company ON inventory_products(company,division,is_active);
CREATE INDEX idx_inventory_products_name ON inventory_products(name);
CREATE TABLE inventory_stock (
 product_id INTEGER NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
 store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 0 AND 100000000),
 updated_at TEXT NOT NULL CHECK(length(CAST(updated_at AS BLOB))=24 AND updated_at GLOB '????-??-??T??:??:??.???Z'),
 PRIMARY KEY(product_id,store_id)
);
CREATE INDEX idx_inventory_stock_store ON inventory_stock(store_id);
CREATE TABLE inventory_movements (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER NOT NULL REFERENCES inventory_products(id) ON DELETE RESTRICT,
 store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
 movement_type TEXT NOT NULL CHECK(movement_type IN ('OPENING','PURCHASE','ADJUSTMENT_IN','ADJUSTMENT_OUT','DAMAGED','TRANSFER_IN','TRANSFER_OUT','SALE','SALE_RETURN')),
 quantity_change INTEGER NOT NULL CHECK(quantity_change<>0 AND quantity_change BETWEEN -100000000 AND 100000000),
 balance_after INTEGER NOT NULL CHECK(balance_after>=0),
 unit_cost_halalas INTEGER CHECK(unit_cost_halalas IS NULL OR unit_cost_halalas BETWEEN 0 AND 9999999999),
 reference_type TEXT CHECK(reference_type IS NULL OR reference_type IN ('TELECOM_SALE','TRANSFER')),
 reference_id INTEGER,
 notes TEXT CHECK(notes IS NULL OR length(notes)<=1000),
 created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL CHECK(length(CAST(created_at AS BLOB))=24 AND created_at GLOB '????-??-??T??:??:??.???Z')
);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id,id);
CREATE INDEX idx_inventory_movements_store ON inventory_movements(store_id,created_at);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type,reference_id);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);
ALTER TABLE telecom_sale_items ADD COLUMN product_id INTEGER REFERENCES inventory_products(id) ON DELETE SET NULL;
CREATE INDEX idx_telecom_sale_items_inventory_product ON telecom_sale_items(product_id);

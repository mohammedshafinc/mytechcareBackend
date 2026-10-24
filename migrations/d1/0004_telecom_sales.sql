-- Telecom sales bills, their line items, and the bill-number counter.
-- Money is stored as integer halalas, rates as basis points, dates as YYYY-MM-DD, instants as toISOString().
CREATE TABLE telecom_counters (
 kind TEXT PRIMARY KEY CHECK(kind IN ('telecom-sale')),
 next_value INTEGER NOT NULL CHECK(next_value BETWEEN 1 AND 2147483647),
 updated_at TEXT NOT NULL CHECK(length(CAST(updated_at AS BLOB))=24 AND updated_at GLOB '????-??-??T??:??:??.???Z')
);
INSERT INTO telecom_counters(kind,next_value,updated_at) VALUES ('telecom-sale',1,'1970-01-01T00:00:00.000Z');
CREATE TABLE telecom_sales (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 bill_number TEXT NOT NULL UNIQUE CHECK(length(bill_number) BETWEEN 1 AND 50),
 sale_date TEXT NOT NULL CHECK(length(CAST(sale_date AS BLOB))=10 AND sale_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
 customer_name TEXT CHECK(customer_name IS NULL OR length(customer_name)<=255),
 customer_mobile TEXT CHECK(customer_mobile IS NULL OR length(customer_mobile)<=50),
 payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK(payment_method IN ('CASH','CARD','BANK_TRANSFER','ONLINE','OTHER')),
 status TEXT NOT NULL DEFAULT 'PAID' CHECK(status IN ('PAID','PENDING','CANCELLED')),
 store_id INTEGER REFERENCES stores(id) ON DELETE RESTRICT,
 staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
 subtotal_halalas INTEGER NOT NULL CHECK(subtotal_halalas BETWEEN 0 AND 9999999999),
 discount_halalas INTEGER NOT NULL DEFAULT 0 CHECK(discount_halalas BETWEEN 0 AND 9999999999),
 vat_rate_bps INTEGER NOT NULL DEFAULT 1500 CHECK(vat_rate_bps BETWEEN 0 AND 10000),
 vat_amount_halalas INTEGER NOT NULL CHECK(vat_amount_halalas BETWEEN 0 AND 9999999999),
 grand_total_halalas INTEGER NOT NULL CHECK(grand_total_halalas BETWEEN 0 AND 9999999999),
 cost_total_halalas INTEGER NOT NULL DEFAULT 0 CHECK(cost_total_halalas BETWEEN 0 AND 9999999999),
 notes TEXT CHECK(notes IS NULL OR length(notes)<=10000),
 created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL CHECK(length(CAST(created_at AS BLOB))=24 AND created_at GLOB '????-??-??T??:??:??.???Z'),
 updated_at TEXT NOT NULL CHECK(length(CAST(updated_at AS BLOB))=24 AND updated_at GLOB '????-??-??T??:??:??.???Z'),
 CHECK(discount_halalas<=subtotal_halalas)
);
CREATE INDEX idx_telecom_sales_date ON telecom_sales(sale_date,id);
CREATE INDEX idx_telecom_sales_store_date ON telecom_sales(store_id,sale_date);
CREATE INDEX idx_telecom_sales_mobile ON telecom_sales(customer_mobile);
CREATE INDEX idx_telecom_sales_staff ON telecom_sales(staff_id);
CREATE TABLE telecom_sale_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sale_id INTEGER NOT NULL REFERENCES telecom_sales(id) ON DELETE CASCADE,
 sl_no INTEGER NOT NULL CHECK(sl_no BETWEEN 1 AND 100),
 product TEXT NOT NULL CHECK(length(product) BETWEEN 1 AND 255),
 category TEXT NOT NULL DEFAULT 'OTHER' CHECK(category IN ('MOBILE','ACCESSORY','SIM','RECHARGE','SERVICE','OTHER')),
 imei TEXT CHECK(imei IS NULL OR length(imei)<=50),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 1000),
 unit_price_halalas INTEGER NOT NULL CHECK(unit_price_halalas BETWEEN 0 AND 9999999999),
 unit_cost_halalas INTEGER NOT NULL DEFAULT 0 CHECK(unit_cost_halalas BETWEEN 0 AND 9999999999),
 line_total_halalas INTEGER NOT NULL CHECK(line_total_halalas BETWEEN 0 AND 9999999999),
 UNIQUE(sale_id,sl_no)
);
CREATE INDEX idx_telecom_sale_items_product ON telecom_sale_items(product);

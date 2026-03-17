-- Migration: Create quotations and quotation_items tables
-- Run this SQL against your PostgreSQL database before starting the backend

CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_date DATE NOT NULL,
    valid_until DATE NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(50) NULL,
    customer_vat_number VARCHAR(50) NULL,
    customer_address TEXT NULL,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
    vat_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    service_request_id INT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INT NOT NULL,
    sl_no INT NOT NULL,
    product VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    vat_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_quotation_items_quotation
        FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quotations_service_request_id ON quotations(service_request_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_name ON quotations(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);


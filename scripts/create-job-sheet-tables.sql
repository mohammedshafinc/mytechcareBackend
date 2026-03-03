-- Migration: Create job_sheets and job_sheet_items tables
-- Run this SQL against your PostgreSQL database before starting the backend

CREATE TABLE IF NOT EXISTS job_sheets (
    id SERIAL PRIMARY KEY,
    job_sheet_number VARCHAR(50) NOT NULL UNIQUE,
    service_request_id INT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(50) NULL,
    device VARCHAR(255) NULL,
    device_display_name VARCHAR(255) NULL,
    problem_reported TEXT NULL,
    condition_on_receive TEXT NULL,
    accessories TEXT NULL,
    estimated_cost DECIMAL(10, 2) NULL,
    estimated_delivery_date DATE NULL,
    assigned_technician_id INT NULL,
    work_done TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    received_date DATE NULL,
    completed_date DATE NULL,
    delivered_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_sheet_items (
    id SERIAL PRIMARY KEY,
    job_sheet_id INT NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_job_sheet_items_job_sheet
        FOREIGN KEY (job_sheet_id)
        REFERENCES job_sheets(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_sheets_service_request_id ON job_sheets(service_request_id);
CREATE INDEX IF NOT EXISTS idx_job_sheets_status ON job_sheets(status);
CREATE INDEX IF NOT EXISTS idx_job_sheets_customer_name ON job_sheets(customer_name);
CREATE INDEX IF NOT EXISTS idx_job_sheet_items_job_sheet_id ON job_sheet_items(job_sheet_id);

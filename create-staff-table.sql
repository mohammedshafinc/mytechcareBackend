-- Create staff table (requires stores table to exist)
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    emp_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    iqama_id VARCHAR(50),
    iqama_expiry_date DATE,
    position VARCHAR(100),
    department VARCHAR(100),
    passport_number VARCHAR(50),
    passport_expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for emp_code lookups
CREATE INDEX IF NOT EXISTS idx_staff_emp_code ON staff(emp_code);

-- Index for store_id (filter by store)
CREATE INDEX IF NOT EXISTS idx_staff_store_id ON staff(store_id);

-- Index on created_at for listing
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON staff(created_at DESC);

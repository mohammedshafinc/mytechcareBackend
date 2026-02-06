-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    store_code VARCHAR(20) NOT NULL UNIQUE,
    store_location VARCHAR(500) NOT NULL,
    company_registration_number VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for lookups by store_code (used when generating next code)
CREATE INDEX IF NOT EXISTS idx_stores_store_code ON stores(store_code);

-- Index on created_at for listing/sorting
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores(created_at DESC);

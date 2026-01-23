-- Create b2c_enquiries table
CREATE TABLE IF NOT EXISTS b2c_enquiries (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    enquired_date DATE NOT NULL,
    requirement TEXT NOT NULL,
    additional_notes TEXT,
    mobile_number VARCHAR(20),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_b2c_enquiries_created_at ON b2c_enquiries(created_at DESC);

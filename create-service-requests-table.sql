-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    device VARCHAR(255) NOT NULL,
    device_display_name VARCHAR(255) NOT NULL,
    other_device VARCHAR(255) NULL,
    location_type VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    current_location VARCHAR(255) NULL,
    manual_location VARCHAR(255) NULL,
    description TEXT NULL,
    language VARCHAR(10) NOT NULL,
    date_time VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on timestamp for better query performance
CREATE INDEX IF NOT EXISTS idx_service_requests_timestamp ON service_requests(timestamp);

-- Create index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);


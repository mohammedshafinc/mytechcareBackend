-- ============================================================
-- Migration: Create Rental Vehicles Table
-- Run this SQL against your PostgreSQL database
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_vehicles (
    id SERIAL PRIMARY KEY,

    -- Vehicle info
    vehicle_number VARCHAR(50) NOT NULL,
    model VARCHAR(255) NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,

    -- Rental company info
    rental_company VARCHAR(255) NOT NULL,
    rental_company_contact VARCHAR(100),
    contract_number VARCHAR(100),

    -- Rental period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_return_date DATE,

    -- Financial
    daily_rate DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    -- Assignment
    store_id INT NOT NULL,
    assigned_staff_id INT,

    -- Odometer tracking
    odometer_start DECIMAL(10, 1),
    odometer_return DECIMAL(10, 1),

    -- Status & notes
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_rental_vehicle_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_rental_vehicle_staff
        FOREIGN KEY (assigned_staff_id)
        REFERENCES staff(id)
        ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_vehicle_number ON rental_vehicles(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_store_id ON rental_vehicles(store_id);
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_status ON rental_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_start_date ON rental_vehicles(start_date);
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_end_date ON rental_vehicles(end_date);
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_rental_company ON rental_vehicles(rental_company);
CREATE INDEX IF NOT EXISTS idx_rental_vehicles_deleted_at ON rental_vehicles(deleted_at);

-- Add company registration number and expiry date to stores table (existing DBs)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS company_registration_number VARCHAR(100);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS expiry_date DATE;

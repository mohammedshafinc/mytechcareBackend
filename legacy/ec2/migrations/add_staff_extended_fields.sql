-- Migration: Add extended fields to staff table
-- Date: 2026-04-05
-- Description: Adds personal information, contact details, employment details, visa/legal documents, and professional information fields

-- Personal Information
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);

-- Contact Information
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mobile_primary VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mobile_secondary VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20);

-- Employment Details
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_join DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary DECIMAL(10, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS working_hours_shift VARCHAR(50);

-- Visa & Legal Documents
ALTER TABLE staff ADD COLUMN IF NOT EXISTS visa_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS visa_expiry_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS sponsor_name VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS border_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;

-- Professional Information
ALTER TABLE staff ADD COLUMN IF NOT EXISTS qualification_education VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS years_of_experience INT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS previous_employer VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS previous_employer_salary DECIMAL(10, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills_certifications TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS driving_license_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS driving_license_expiry DATE;

-- System Fields
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS probation_period_end_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_working_day DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes_remarks TEXT;

-- Add comments for documentation
COMMENT ON COLUMN staff.date_of_birth IS 'Date of birth for age verification and benefits calculation';
COMMENT ON COLUMN staff.nationality IS 'Nationality for visa/work permit tracking';
COMMENT ON COLUMN staff.gender IS 'Gender for HR records and compliance';
COMMENT ON COLUMN staff.marital_status IS 'Marital status for benefits and emergency contact';
COMMENT ON COLUMN staff.blood_group IS 'Blood group for medical emergencies';
COMMENT ON COLUMN staff.mobile_primary IS 'Primary mobile number for communication';
COMMENT ON COLUMN staff.mobile_secondary IS 'Secondary mobile number for communication';
COMMENT ON COLUMN staff.email IS 'Email address for official communications';
COMMENT ON COLUMN staff.current_address IS 'Full residential address';
COMMENT ON COLUMN staff.emergency_contact_name IS 'Emergency contact name';
COMMENT ON COLUMN staff.emergency_contact_number IS 'Emergency contact number';
COMMENT ON COLUMN staff.date_of_join IS 'Employment start date';
COMMENT ON COLUMN staff.employment_type IS 'Employment type (Full-time, Part-time, Contract, Temporary)';
COMMENT ON COLUMN staff.salary IS 'Basic salary amount';
COMMENT ON COLUMN staff.bank_account_number IS 'Bank account number for salary transfers';
COMMENT ON COLUMN staff.bank_name IS 'Bank name for direct deposits';
COMMENT ON COLUMN staff.bank_iban IS 'Bank IBAN for direct deposits';
COMMENT ON COLUMN staff.working_hours_shift IS 'Working hours/shift (Morning, Evening, Night, Rotating)';
COMMENT ON COLUMN staff.visa_number IS 'Work visa number';
COMMENT ON COLUMN staff.visa_expiry_date IS 'Visa expiry date for renewal tracking';
COMMENT ON COLUMN staff.sponsor_name IS 'Sponsor name (Kafeel information)';
COMMENT ON COLUMN staff.border_number IS 'Border number for exit/re-entry permit tracking';
COMMENT ON COLUMN staff.insurance_number IS 'Medical insurance number';
COMMENT ON COLUMN staff.insurance_expiry_date IS 'Insurance expiry date for renewal alerts';
COMMENT ON COLUMN staff.qualification_education IS 'Highest degree or qualification';
COMMENT ON COLUMN staff.years_of_experience IS 'Total work experience in years';
COMMENT ON COLUMN staff.previous_employer IS 'Last company name';
COMMENT ON COLUMN staff.previous_employer_salary IS 'Salary at previous employer';
COMMENT ON COLUMN staff.skills_certifications IS 'Technical skills or licenses';
COMMENT ON COLUMN staff.driving_license_number IS 'Driving license number if job requires driving';
COMMENT ON COLUMN staff.driving_license_expiry IS 'Driving license expiry date for renewal tracking';
COMMENT ON COLUMN staff.employee_status IS 'Employee status (Active, On Leave, Resigned, Terminated)';
COMMENT ON COLUMN staff.probation_period_end_date IS 'Probation period end date for new hires';
COMMENT ON COLUMN staff.contract_end_date IS 'Contract end date for contract employees';
COMMENT ON COLUMN staff.last_working_day IS 'Last working day when employee leaves';
COMMENT ON COLUMN staff.notes_remarks IS 'Additional information or remarks';

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_staff_employee_status ON staff(employee_status);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_mobile_primary ON staff(mobile_primary);
CREATE INDEX IF NOT EXISTS idx_staff_visa_expiry ON staff(visa_expiry_date);
CREATE INDEX IF NOT EXISTS idx_staff_insurance_expiry ON staff(insurance_expiry_date);
CREATE INDEX IF NOT EXISTS idx_staff_iqama_expiry ON staff(iqama_expiry_date);
CREATE INDEX IF NOT EXISTS idx_staff_passport_expiry ON staff(passport_expiry_date);
CREATE INDEX IF NOT EXISTS idx_staff_driving_license_expiry ON staff(driving_license_expiry);
CREATE INDEX IF NOT EXISTS idx_staff_date_of_join ON staff(date_of_join);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully: Extended staff fields added';
END $$;

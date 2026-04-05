-- Rollback Migration: Remove extended fields from staff table
-- Date: 2026-04-05
-- Description: Removes all extended fields added to staff table (use only if you need to revert the migration)

-- Drop indexes first
DROP INDEX IF EXISTS idx_staff_employee_status;
DROP INDEX IF EXISTS idx_staff_email;
DROP INDEX IF EXISTS idx_staff_mobile_primary;
DROP INDEX IF EXISTS idx_staff_visa_expiry;
DROP INDEX IF EXISTS idx_staff_insurance_expiry;
DROP INDEX IF EXISTS idx_staff_iqama_expiry;
DROP INDEX IF EXISTS idx_staff_passport_expiry;
DROP INDEX IF EXISTS idx_staff_driving_license_expiry;
DROP INDEX IF EXISTS idx_staff_date_of_join;

-- Remove Personal Information columns
ALTER TABLE staff DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE staff DROP COLUMN IF EXISTS nationality;
ALTER TABLE staff DROP COLUMN IF EXISTS gender;
ALTER TABLE staff DROP COLUMN IF EXISTS marital_status;
ALTER TABLE staff DROP COLUMN IF EXISTS blood_group;

-- Remove Contact Information columns
ALTER TABLE staff DROP COLUMN IF EXISTS mobile_primary;
ALTER TABLE staff DROP COLUMN IF EXISTS mobile_secondary;
ALTER TABLE staff DROP COLUMN IF EXISTS email;
ALTER TABLE staff DROP COLUMN IF EXISTS current_address;
ALTER TABLE staff DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE staff DROP COLUMN IF EXISTS emergency_contact_number;

-- Remove Employment Details columns
ALTER TABLE staff DROP COLUMN IF EXISTS date_of_join;
ALTER TABLE staff DROP COLUMN IF EXISTS employment_type;
ALTER TABLE staff DROP COLUMN IF EXISTS salary;
ALTER TABLE staff DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE staff DROP COLUMN IF EXISTS bank_name;
ALTER TABLE staff DROP COLUMN IF EXISTS bank_iban;
ALTER TABLE staff DROP COLUMN IF EXISTS working_hours_shift;

-- Remove Visa & Legal Documents columns
ALTER TABLE staff DROP COLUMN IF EXISTS visa_number;
ALTER TABLE staff DROP COLUMN IF EXISTS visa_expiry_date;
ALTER TABLE staff DROP COLUMN IF EXISTS sponsor_name;
ALTER TABLE staff DROP COLUMN IF EXISTS border_number;
ALTER TABLE staff DROP COLUMN IF EXISTS insurance_number;
ALTER TABLE staff DROP COLUMN IF EXISTS insurance_expiry_date;

-- Remove Professional Information columns
ALTER TABLE staff DROP COLUMN IF EXISTS qualification_education;
ALTER TABLE staff DROP COLUMN IF EXISTS years_of_experience;
ALTER TABLE staff DROP COLUMN IF EXISTS previous_employer;
ALTER TABLE staff DROP COLUMN IF EXISTS previous_employer_salary;
ALTER TABLE staff DROP COLUMN IF EXISTS skills_certifications;
ALTER TABLE staff DROP COLUMN IF EXISTS driving_license_number;
ALTER TABLE staff DROP COLUMN IF EXISTS driving_license_expiry;

-- Remove System Fields columns
ALTER TABLE staff DROP COLUMN IF EXISTS employee_status;
ALTER TABLE staff DROP COLUMN IF EXISTS probation_period_end_date;
ALTER TABLE staff DROP COLUMN IF EXISTS contract_end_date;
ALTER TABLE staff DROP COLUMN IF EXISTS last_working_day;
ALTER TABLE staff DROP COLUMN IF EXISTS notes_remarks;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Rollback completed successfully: Extended staff fields removed';
END $$;

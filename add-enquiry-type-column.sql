-- Add enquiry_type column to corporate_enquiries table
ALTER TABLE corporate_enquiries 
ADD COLUMN enquiry_type VARCHAR(50);

-- Add enquiry_type column to b2c_enquiries table
ALTER TABLE b2c_enquiries 
ADD COLUMN enquiry_type VARCHAR(50);

-- Fix NULL values in admin_users table before adding NOT NULL constraints
-- This script removes invalid admin records with NULL email or password

-- First, check for records with NULL values
SELECT id, name, email, 
       CASE WHEN password IS NULL THEN 'NULL' ELSE 'HAS VALUE' END as password_status
FROM admin_users 
WHERE email IS NULL OR email = '' OR password IS NULL OR password = '';

-- Delete invalid admin records (those with NULL or empty email/password)
-- This is a security measure - admin accounts must have both email and password
DELETE FROM admin_users 
WHERE email IS NULL OR email = '' OR password IS NULL OR password = '';

-- Verify no NULL values remain
SELECT COUNT(*) as remaining_null_emails
FROM admin_users 
WHERE email IS NULL OR email = '';

SELECT COUNT(*) as remaining_null_passwords
FROM admin_users 
WHERE password IS NULL OR password = '';

-- Now the table is ready for NOT NULL constraints
-- The TypeORM entity will handle adding the constraints on next sync

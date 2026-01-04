-- Update admin password hash for Admin@123
UPDATE admins 
SET password = '$2b$10$tqLg6s9s/lX9/VxLR5TyrOxJhvWsolwPtzJhCyIoP5DGXGeKR3fCC'
WHERE LOWER(email) = LOWER('admin@mtechcare.com');

-- Verify the update
SELECT id, name, email, 
       SUBSTRING(password, 1, 30) as password_hash_preview,
       is_active
FROM admins 
WHERE LOWER(email) = LOWER('admin@mtechcare.com');



# Database Migrations

## Staff Extended Fields Migration

This migration adds comprehensive fields to the staff table for complete employee management.

### Fields Added

#### Personal Information
- Date of Birth
- Nationality
- Gender
- Marital Status
- Blood Group

#### Contact Information
- Mobile Number (Primary & Secondary)
- Email Address
- Current Address
- Emergency Contact Name & Number

#### Employment Details
- Date of Join
- Employment Type
- Salary
- Bank Account Number, Bank Name & IBAN
- Working Hours/Shift

#### Visa & Legal Documents
- Visa Number & Expiry Date
- Sponsor Name
- Border Number
- Insurance Number & Expiry Date

#### Professional Information
- Qualification/Education
- Years of Experience
- Previous Employer
- Skills/Certifications
- Driving License Number & Expiry

#### System Fields
- Employee Status
- Probation Period End Date
- Contract End Date
- Last Working Day
- Notes/Remarks

### How to Run the Migration

1. Connect to your PostgreSQL database:
```bash
psql -h <host> -U <username> -d <database_name>
```

2. Run the migration script:
```bash
\i migrations/add_staff_extended_fields.sql
```

Or using psql command:
```bash
psql -h <host> -U <username> -d <database_name> -f migrations/add_staff_extended_fields.sql
```

### How to Rollback (if needed)

If you need to revert the changes:
```bash
psql -h <host> -U <username> -d <database_name> -f migrations/rollback_staff_extended_fields.sql
```

### Notes

- All new fields are optional (nullable)
- Default value for `employee_status` is 'Active'
- Indexes are created on frequently queried fields for better performance
- The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
- After running the migration, restart your NestJS application to sync the entity changes

### Testing the Changes

After running the migration, you can test the API endpoints:

1. Create a staff member with extended fields:
```bash
POST /api/staff
{
  "empCode": "MTC0100",
  "name": "John Doe",
  "storeId": 1,
  "dateOfBirth": "1990-05-15",
  "nationality": "Saudi Arabia",
  "gender": "Male",
  "mobilePrimary": "+966501234567",
  "email": "john.doe@example.com",
  "dateOfJoin": "2024-01-15",
  "employmentType": "Full-time",
  "salary": 5000.00,
  "employeeStatus": "Active"
}
```

2. Update staff with additional fields:
```bash
PATCH /api/staff/:id
{
  "visaNumber": "V123456789",
  "visaExpiryDate": "2026-12-31",
  "insuranceNumber": "INS123456"
}
```

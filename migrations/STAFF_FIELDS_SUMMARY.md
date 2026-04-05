# Staff Module Fields Summary

## Mandatory Fields (Required)
These fields are required when creating a new staff member:

1. **empCode** - Employee code (e.g., "MTC0100")
2. **name** - Staff member's full name
3. **storeId** - Store ID (must exist in stores table)

---

## Optional Fields (All New Fields Added)
All fields below are optional and can be provided during creation or updated later:

### Existing Optional Fields (Before Update)
4. **iqamaId** - Iqama ID number
5. **iqamaExpiryDate** - Iqama expiry date
6. **position** - Job position/title
7. **department** - Department name
8. **passportNumber** - Passport number
9. **passportExpiryDate** - Passport expiry date

---

### NEW FIELDS ADDED

#### Personal Information (5 fields)
10. **dateOfBirth** - Date of birth (YYYY-MM-DD)
11. **nationality** - Nationality (e.g., "Saudi Arabia")
12. **gender** - Gender (Male/Female/Other)
13. **maritalStatus** - Marital status (Single/Married/Divorced/Widowed)
14. **bloodGroup** - Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)

#### Contact Information (6 fields)
15. **mobilePrimary** - Primary mobile number (e.g., "+966501234567")
16. **mobileSecondary** - Secondary mobile number
17. **email** - Email address
18. **currentAddress** - Full residential address
19. **emergencyContactName** - Emergency contact person name
20. **emergencyContactNumber** - Emergency contact phone number

#### Employment Details (7 fields)
21. **dateOfJoin** - Employment start date (YYYY-MM-DD)
22. **employmentType** - Employment type (Full-time/Part-time/Contract/Temporary)
23. **salary** - Basic salary amount (decimal)
24. **bankAccountNumber** - Bank account number for salary transfer
25. **bankName** - Bank name (e.g., "Al Rajhi Bank")
26. **bankIban** - Bank IBAN (e.g., "SA1234567890123456789012")
27. **workingHoursShift** - Working shift (Morning/Evening/Night/Rotating)

#### Visa & Legal Documents (6 fields)
28. **visaNumber** - Work visa number
29. **visaExpiryDate** - Visa expiry date (YYYY-MM-DD)
30. **sponsorName** - Sponsor/Kafeel name
31. **borderNumber** - Border number for exit/re-entry permit
32. **insuranceNumber** - Medical insurance number
33. **insuranceExpiryDate** - Insurance expiry date (YYYY-MM-DD)

#### Professional Information (7 fields)
34. **qualificationEducation** - Highest degree/qualification
35. **yearsOfExperience** - Total years of work experience (integer)
36. **previousEmployer** - Previous company name
37. **previousEmployerSalary** - Salary at previous employer (decimal) ⭐ NEW
38. **skillsCertifications** - Technical skills or licenses (text)
39. **drivingLicenseNumber** - Driving license number
40. **drivingLicenseExpiry** - Driving license expiry date (YYYY-MM-DD)

#### System Fields (5 fields)
41. **employeeStatus** - Employee status (Active/On Leave/Resigned/Terminated) - Default: "Active"
42. **probationPeriodEndDate** - Probation period end date (YYYY-MM-DD)
43. **contractEndDate** - Contract end date for contract employees (YYYY-MM-DD)
44. **lastWorkingDay** - Last working day when employee leaves (YYYY-MM-DD)
45. **notesRemarks** - Additional notes or remarks (text)

---

## Summary

- **Total Fields**: 45 fields
- **Mandatory Fields**: 3 (empCode, name, storeId)
- **Optional Fields**: 42
  - Existing optional: 6
  - Newly added optional: 36 (including previousEmployerSalary)

---

## Field Categories Breakdown

| Category | Number of Fields | All Optional? |
|----------|------------------|---------------|
| Core (Mandatory) | 3 | No |
| Existing Optional | 6 | Yes |
| Personal Information | 5 | Yes |
| Contact Information | 6 | Yes |
| Employment Details | 7 | Yes |
| Visa & Legal Documents | 6 | Yes |
| Professional Information | 7 | Yes |
| System Fields | 5 | Yes |

---

## Database Changes

### Files Modified:
1. `src/staff/staff.entity.ts` - Entity definition
2. `src/staff/dto/create-staff.dto.ts` - Creation DTO
3. `src/staff/dto/update-staff.dto.ts` - Update DTO

### Files Created:
1. `migrations/add_staff_extended_fields.sql` - Migration script
2. `migrations/rollback_staff_extended_fields.sql` - Rollback script
3. `migrations/README.md` - Migration documentation
4. `migrations/STAFF_FIELDS_SUMMARY.md` - This file

### Database Indexes Created:
- idx_staff_employee_status
- idx_staff_email
- idx_staff_mobile_primary
- idx_staff_visa_expiry
- idx_staff_insurance_expiry
- idx_staff_iqama_expiry
- idx_staff_passport_expiry
- idx_staff_driving_license_expiry
- idx_staff_date_of_join

---

## Usage Example

### Minimal Creation (Only Mandatory Fields):
```json
{
  "empCode": "MTC0100",
  "name": "John Doe",
  "storeId": 1
}
```

### Full Creation (With All New Fields):
```json
{
  "empCode": "MTC0100",
  "name": "John Doe",
  "storeId": 1,
  "iqamaId": "1234567890",
  "iqamaExpiryDate": "2026-12-31",
  "position": "Technician",
  "department": "Repair",
  "passportNumber": "AB1234567",
  "passportExpiryDate": "2027-06-30",
  "dateOfBirth": "1990-05-15",
  "nationality": "Saudi Arabia",
  "gender": "Male",
  "maritalStatus": "Single",
  "bloodGroup": "O+",
  "mobilePrimary": "+966501234567",
  "mobileSecondary": "+966507654321",
  "email": "john.doe@example.com",
  "currentAddress": "Al Olaya, Riyadh, Saudi Arabia",
  "emergencyContactName": "Jane Doe",
  "emergencyContactNumber": "+966501111111",
  "dateOfJoin": "2024-01-15",
  "employmentType": "Full-time",
  "salary": 5000.00,
  "bankAccountNumber": "1234567890123456",
  "bankName": "Al Rajhi Bank",
  "bankIban": "SA1234567890123456789012",
  "workingHoursShift": "Morning",
  "visaNumber": "V123456789",
  "visaExpiryDate": "2026-12-31",
  "sponsorName": "Company Name",
  "borderNumber": "B987654321",
  "insuranceNumber": "INS123456",
  "insuranceExpiryDate": "2026-06-30",
  "qualificationEducation": "Bachelor in Computer Science",
  "yearsOfExperience": 5,
  "previousEmployer": "ABC Company",
  "previousEmployerSalary": 4500.00,
  "skillsCertifications": "Mobile Repair, Laptop Repair, Network Configuration",
  "drivingLicenseNumber": "DL123456789",
  "drivingLicenseExpiry": "2028-03-31",
  "employeeStatus": "Active",
  "probationPeriodEndDate": "2024-04-15",
  "contractEndDate": "2026-01-14",
  "notesRemarks": "Good performer, punctual"
}
```

---

## Next Steps

1. Run the migration: `psql -h <host> -U <user> -d <db> -f migrations/add_staff_extended_fields.sql`
2. Restart your NestJS application
3. Test the API endpoints with the new fields
4. Update your frontend forms to include the new fields

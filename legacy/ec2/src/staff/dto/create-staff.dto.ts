import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffDto {
  @ApiProperty({
    example: 'MTC0100',
    description: 'Employee code (get from GET /staff/next-code when form opens)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  empCode: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Staff name',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 1,
    description: 'Store ID (from stores table)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  storeId: number;

  @ApiProperty({
    example: '1234567890',
    description: 'Iqama ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iqamaId?: string | null;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Iqama expiry date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  iqamaExpiryDate?: string | null;

  @ApiProperty({
    example: 'Technician',
    description: 'Position',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string | null;

  @ApiProperty({
    example: 'Repair',
    description: 'Department',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string | null;

  @ApiProperty({
    example: 'AB1234567',
    description: 'Passport number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string | null;

  @ApiProperty({
    example: '2027-06-30',
    description: 'Passport expiry date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  passportExpiryDate?: string | null;

  // Personal Information
  @ApiProperty({ example: '1990-05-15', description: 'Date of birth (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @ApiProperty({ example: 'Saudi Arabia', description: 'Nationality', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string | null;

  @ApiProperty({ example: 'Male', description: 'Gender (Male/Female/Other)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @ApiProperty({ example: 'Single', description: 'Marital status (Single/Married/Divorced/Widowed)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  maritalStatus?: string | null;

  @ApiProperty({ example: 'O+', description: 'Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string | null;

  // Contact Information
  @ApiProperty({ example: '+966501234567', description: 'Primary mobile number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobilePrimary?: string | null;

  @ApiProperty({ example: '+966507654321', description: 'Secondary mobile number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileSecondary?: string | null;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @ApiProperty({ example: 'Al Olaya, Riyadh, Saudi Arabia', description: 'Current residential address', required: false })
  @IsOptional()
  @IsString()
  currentAddress?: string | null;

  @ApiProperty({ example: 'Jane Doe', description: 'Emergency contact name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string | null;

  @ApiProperty({ example: '+966501111111', description: 'Emergency contact number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactNumber?: string | null;

  // Employment Details
  @ApiProperty({ example: '2024-01-15', description: 'Date of joining (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  dateOfJoin?: string | null;

  @ApiProperty({ example: 'Full-time', description: 'Employment type (Full-time/Part-time/Contract/Temporary)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employmentType?: string | null;

  @ApiProperty({ example: 5000.00, description: 'Basic salary amount', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salary?: number | null;

  @ApiProperty({ example: '1234567890123456', description: 'Bank account number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string | null;

  @ApiProperty({ example: 'Al Rajhi Bank', description: 'Bank name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string | null;

  @ApiProperty({ example: 'SA1234567890123456789012', description: 'Bank IBAN', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankIban?: string | null;

  @ApiProperty({ example: 'Morning', description: 'Working hours/shift (Morning/Evening/Night/Rotating)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workingHoursShift?: string | null;

  // Visa & Legal Documents
  @ApiProperty({ example: 'V123456789', description: 'Visa number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visaNumber?: string | null;

  @ApiProperty({ example: '2026-12-31', description: 'Visa expiry date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  visaExpiryDate?: string | null;

  @ApiProperty({ example: 'Company Name', description: 'Sponsor name (Kafeel)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sponsorName?: string | null;

  @ApiProperty({ example: 'B987654321', description: 'Border number (Exit/re-entry permit)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  borderNumber?: string | null;

  @ApiProperty({ example: 'INS123456', description: 'Medical insurance number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  insuranceNumber?: string | null;

  @ApiProperty({ example: '2026-06-30', description: 'Insurance expiry date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string | null;

  // Professional Information
  @ApiProperty({ example: 'Bachelor in Computer Science', description: 'Highest qualification/education', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  qualificationEducation?: string | null;

  @ApiProperty({ example: 5, description: 'Years of experience', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yearsOfExperience?: number | null;

  @ApiProperty({ example: 'ABC Company', description: 'Previous employer name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  previousEmployer?: string | null;

  @ApiProperty({ example: 4500.00, description: 'Previous employer salary', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  previousEmployerSalary?: number | null;

  @ApiProperty({ example: 'Mobile Repair, Laptop Repair, Network Configuration', description: 'Skills and certifications', required: false })
  @IsOptional()
  @IsString()
  skillsCertifications?: string | null;

  @ApiProperty({ example: 'DL123456789', description: 'Driving license number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  drivingLicenseNumber?: string | null;

  @ApiProperty({ example: '2028-03-31', description: 'Driving license expiry date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  drivingLicenseExpiry?: string | null;

  // System Fields
  @ApiProperty({ example: 'Active', description: 'Employee status (Active/On Leave/Resigned/Terminated)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeStatus?: string | null;

  @ApiProperty({ example: '2024-04-15', description: 'Probation period end date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  probationPeriodEndDate?: string | null;

  @ApiProperty({ example: '2026-01-14', description: 'Contract end date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string | null;

  @ApiProperty({ example: '2026-01-31', description: 'Last working day (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  lastWorkingDay?: string | null;

  @ApiProperty({ example: 'Good performer, punctual', description: 'Additional notes or remarks', required: false })
  @IsOptional()
  @IsString()
  notesRemarks?: string | null;
}

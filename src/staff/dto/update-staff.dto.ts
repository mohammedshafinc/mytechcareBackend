import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStaffDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storeId?: number;

  @ApiProperty({ example: '1234567890', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iqamaId?: string | null;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  iqamaExpiryDate?: string | null;

  @ApiProperty({ example: 'Technician', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string | null;

  @ApiProperty({ example: 'Repair', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string | null;

  @ApiProperty({ example: 'AB1234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string | null;

  @ApiProperty({ example: '2027-06-30', required: false })
  @IsOptional()
  @IsDateString()
  passportExpiryDate?: string | null;

  // Personal Information
  @ApiProperty({ example: '1990-05-15', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @ApiProperty({ example: 'Saudi Arabia', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string | null;

  @ApiProperty({ example: 'Male', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @ApiProperty({ example: 'Single', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  maritalStatus?: string | null;

  @ApiProperty({ example: 'O+', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string | null;

  // Contact Information
  @ApiProperty({ example: '+966501234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobilePrimary?: string | null;

  @ApiProperty({ example: '+966507654321', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileSecondary?: string | null;

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @ApiProperty({ example: 'Al Olaya, Riyadh, Saudi Arabia', required: false })
  @IsOptional()
  @IsString()
  currentAddress?: string | null;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string | null;

  @ApiProperty({ example: '+966501111111', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactNumber?: string | null;

  // Employment Details
  @ApiProperty({ example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  dateOfJoin?: string | null;

  @ApiProperty({ example: 'Full-time', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employmentType?: string | null;

  @ApiProperty({ example: 5000.00, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salary?: number | null;

  @ApiProperty({ example: '1234567890123456', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string | null;

  @ApiProperty({ example: 'Al Rajhi Bank', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string | null;

  @ApiProperty({ example: 'SA1234567890123456789012', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankIban?: string | null;

  @ApiProperty({ example: 'Morning', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workingHoursShift?: string | null;

  // Visa & Legal Documents
  @ApiProperty({ example: 'V123456789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visaNumber?: string | null;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  visaExpiryDate?: string | null;

  @ApiProperty({ example: 'Company Name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sponsorName?: string | null;

  @ApiProperty({ example: 'B987654321', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  borderNumber?: string | null;

  @ApiProperty({ example: 'INS123456', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  insuranceNumber?: string | null;

  @ApiProperty({ example: '2026-06-30', required: false })
  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string | null;

  // Professional Information
  @ApiProperty({ example: 'Bachelor in Computer Science', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  qualificationEducation?: string | null;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yearsOfExperience?: number | null;

  @ApiProperty({ example: 'ABC Company', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  previousEmployer?: string | null;

  @ApiProperty({ example: 4500.00, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  previousEmployerSalary?: number | null;

  @ApiProperty({ example: 'Mobile Repair, Laptop Repair, Network Configuration', required: false })
  @IsOptional()
  @IsString()
  skillsCertifications?: string | null;

  @ApiProperty({ example: 'DL123456789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  drivingLicenseNumber?: string | null;

  @ApiProperty({ example: '2028-03-31', required: false })
  @IsOptional()
  @IsDateString()
  drivingLicenseExpiry?: string | null;

  // System Fields
  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeStatus?: string | null;

  @ApiProperty({ example: '2024-04-15', required: false })
  @IsOptional()
  @IsDateString()
  probationPeriodEndDate?: string | null;

  @ApiProperty({ example: '2026-01-14', required: false })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string | null;

  @ApiProperty({ example: '2026-01-31', required: false })
  @IsOptional()
  @IsDateString()
  lastWorkingDay?: string | null;

  @ApiProperty({ example: 'Good performer, punctual', required: false })
  @IsOptional()
  @IsString()
  notesRemarks?: string | null;
}

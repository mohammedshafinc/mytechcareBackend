import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateCorporateEnquiryDto {
  @ApiProperty({
    example: 'ABC Corporation',
    description: 'Corporate Name',
    required: false,
  })
  @IsOptional()
  @IsString()
  corporateName?: string;

  @ApiProperty({
    example: '2026-01-23',
    description: 'Enquired Date (YYYY-MM-DD format)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  enquiredDate?: string;

  @ApiProperty({
    example: 'We need comprehensive IT support services for our office including hardware maintenance, software updates, and network management.',
    description: 'Requirement details',
    required: false,
  })
  @IsOptional()
  @IsString()
  requirement?: string;

  @ApiProperty({
    example: 'We prefer to have a dedicated technician available during business hours.',
    description: 'Additional Notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiProperty({
    example: '+966501234567',
    description: 'Mobile Number',
    required: false,
  })
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiProperty({
    example: 'Riyadh, Saudi Arabia',
    description: 'Location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: 'IT Support',
    description: 'Type of enquiry',
    required: false,
  })
  @IsOptional()
  @IsString()
  enquiryType?: string;

  @ApiProperty({
    example: 'Pending',
    description: 'Status of the corporate enquiry',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}

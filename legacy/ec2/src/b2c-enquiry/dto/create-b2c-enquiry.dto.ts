import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateB2cEnquiryDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Customer Name',
  })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({
    example: '2026-01-23',
    description: 'Enquired Date (YYYY-MM-DD format)',
  })
  @IsNotEmpty()
  @IsDateString()
  enquiredDate: string;

  @ApiProperty({
    example: 'I need help with my laptop screen repair and battery replacement.',
    description: 'Requirement details',
  })
  @IsNotEmpty()
  @IsString()
  requirement: string;

  @ApiProperty({
    example: 'I prefer home service if available.',
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
    example: 'Repair',
    description: 'Type of enquiry',
    required: false,
  })
  @IsOptional()
  @IsString()
  enquiryType?: string;

  @ApiProperty({
    example: 'Pending',
    description: 'Status of the B2C enquiry',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}

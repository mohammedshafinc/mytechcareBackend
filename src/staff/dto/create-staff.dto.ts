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
}

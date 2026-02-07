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
}

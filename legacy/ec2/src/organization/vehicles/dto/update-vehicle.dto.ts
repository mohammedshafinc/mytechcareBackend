import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VehicleFuelType, VehicleStatus } from '../vehicle.entity';

export class UpdateVehicleDto {
  @ApiProperty({
    example: 'ABC-1234',
    description: 'Vehicle number (unique, will be uppercased and trimmed)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  vehicleNumber?: string;

  @ApiProperty({
    example: 'Toyota Camry 2024',
    description: 'Vehicle model',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @ApiProperty({
    example: 'PETROL',
    description: 'Fuel type: PETROL, DIESEL, ELECTRIC, HYBRID',
    enum: VehicleFuelType,
    required: false,
  })
  @IsOptional()
  @IsEnum(VehicleFuelType)
  fuelType?: VehicleFuelType;

  @ApiProperty({
    example: 1,
    description: 'Store ID (must exist)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  storeId?: number;

  @ApiProperty({
    example: 1,
    description: 'Authorized staff ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  authorizedStaffId?: number | null;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Status: ACTIVE, INACTIVE',
    enum: VehicleStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}

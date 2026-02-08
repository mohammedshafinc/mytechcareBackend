import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VehicleFuelType } from '../vehicle.entity';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'ABC-1234',
    description: 'Vehicle number (unique, will be uppercased and trimmed)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  vehicleNumber: string;

  @ApiProperty({
    example: 'Toyota Camry 2024',
    description: 'Vehicle model',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  model: string;

  @ApiProperty({
    example: 'PETROL',
    description: 'Fuel type: PETROL, DIESEL, ELECTRIC, HYBRID',
    enum: VehicleFuelType,
  })
  @IsNotEmpty()
  @IsEnum(VehicleFuelType)
  fuelType: VehicleFuelType;

  @ApiProperty({
    example: 1,
    description: 'Store ID (must exist)',
  })
  @IsNotEmpty()
  @IsNumber()
  storeId: number;

  @ApiProperty({
    example: 1,
    description: 'Authorized staff ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  authorizedStaffId?: number | null;
}

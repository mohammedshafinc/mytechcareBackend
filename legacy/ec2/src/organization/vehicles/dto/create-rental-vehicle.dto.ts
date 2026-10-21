import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VehicleFuelType } from '../vehicle.entity';
import { RentalPaymentStatus } from '../rental-vehicle.entity';

export class CreateRentalVehicleDto {
  @ApiProperty({ example: 'RNT-5678', description: 'Vehicle plate number' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  vehicleNumber: string;

  @ApiProperty({ example: 'Toyota Hilux 2025', description: 'Vehicle model' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  model: string;

  @ApiProperty({ example: 'PETROL', enum: VehicleFuelType })
  @IsNotEmpty()
  @IsEnum(VehicleFuelType)
  fuelType: VehicleFuelType;

  @ApiProperty({ example: 'Al Jazirah Vehicles', description: 'Rental company name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  rentalCompany: string;

  @ApiProperty({ example: '+966 55 123 4567', description: 'Rental company contact', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rentalCompanyContact?: string;

  @ApiProperty({ example: 'RC-2026-001', description: 'Rental contract/agreement number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  @ApiProperty({ example: '2026-02-24', description: 'Rental start date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-24', description: 'Expected return date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 150.00, description: 'Daily rental rate (SAR)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  dailyRate: number;

  @ApiProperty({ example: 4500.00, description: 'Total rental cost (SAR)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiProperty({ example: 1000.00, description: 'Security deposit amount (SAR)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiProperty({ example: 'PENDING', enum: RentalPaymentStatus, required: false })
  @IsOptional()
  @IsEnum(RentalPaymentStatus)
  paymentStatus?: RentalPaymentStatus;

  @ApiProperty({ example: 1, description: 'Store ID' })
  @IsNotEmpty()
  @IsNumber()
  storeId: number;

  @ApiProperty({ example: 1, description: 'Assigned staff ID', required: false })
  @IsOptional()
  @IsNumber()
  assignedStaffId?: number | null;

  @ApiProperty({ example: 45230.5, description: 'Odometer reading at pickup (km)', required: false })
  @IsOptional()
  @IsNumber()
  odometerStart?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

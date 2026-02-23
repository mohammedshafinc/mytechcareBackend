import { ApiProperty } from '@nestjs/swagger';
import {
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
import { RentalVehicleStatus, RentalPaymentStatus } from '../rental-vehicle.entity';

export class UpdateRentalVehicleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  vehicleNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @ApiProperty({ enum: VehicleFuelType, required: false })
  @IsOptional()
  @IsEnum(VehicleFuelType)
  fuelType?: VehicleFuelType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  rentalCompany?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rentalCompanyContact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Actual return date (set when vehicle is returned)', required: false })
  @IsOptional()
  @IsDateString()
  actualReturnDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dailyRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiProperty({ enum: RentalPaymentStatus, required: false })
  @IsOptional()
  @IsEnum(RentalPaymentStatus)
  paymentStatus?: RentalPaymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  storeId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  assignedStaffId?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  odometerStart?: number;

  @ApiProperty({ description: 'Odometer reading at return (km)', required: false })
  @IsOptional()
  @IsNumber()
  odometerReturn?: number;

  @ApiProperty({ enum: RentalVehicleStatus, required: false })
  @IsOptional()
  @IsEnum(RentalVehicleStatus)
  status?: RentalVehicleStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

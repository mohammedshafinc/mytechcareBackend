import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleExpenseType } from '../vehicle-expense.entity';

export class CreateVehicleExpenseDto {
  @ApiProperty({
    example: 'FUEL',
    description: 'Expense type: FUEL, MAINTENANCE, REPAIR, INSURANCE, OTHER',
    enum: VehicleExpenseType,
  })
  @IsNotEmpty()
  @IsEnum(VehicleExpenseType)
  expenseType: VehicleExpenseType;

  @ApiProperty({
    example: 150.50,
    description: 'Amount (must be > 0)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    example: '2026-02-08',
    description: 'Expense date (must be <= today)',
  })
  @IsNotEmpty()
  @IsDateString()
  expenseDate: string;

  @ApiProperty({
    example: 1,
    description: 'Store ID (must match vehicle.store_id)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  storeId: number;

  @ApiProperty({
    example: 'Monthly fuel refill',
    description: 'Description (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}

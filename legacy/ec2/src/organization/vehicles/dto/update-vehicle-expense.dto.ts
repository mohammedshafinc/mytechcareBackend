import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleExpenseType } from '../vehicle-expense.entity';

export class UpdateVehicleExpenseDto {
  @ApiProperty({
    example: 'FUEL',
    description: 'Expense type: FUEL, MAINTENANCE, REPAIR, INSURANCE, OTHER',
    enum: VehicleExpenseType,
    required: false,
  })
  @IsOptional()
  @IsEnum(VehicleExpenseType)
  expenseType?: VehicleExpenseType;

  @ApiProperty({
    example: 150.50,
    description: 'Amount (must be > 0)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Type(() => Number)
  amount?: number;

  @ApiProperty({
    example: '2026-02-08',
    description: 'Expense date (must be <= today)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiProperty({
    example: 'Monthly fuel refill',
    description: 'Description (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}

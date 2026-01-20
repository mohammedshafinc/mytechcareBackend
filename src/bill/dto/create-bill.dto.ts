import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBillDto {
  @ApiProperty({
    example: '6',
    description: 'Service request ID (used as user_id in bills table). Can be provided as "id" or "serviceRequestId"',
    required: false,
  })
  @Transform(({ obj }) => obj?.serviceRequestId || obj?.id || null)
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @ApiProperty({
    example: '6',
    description: 'Service request ID (alias for serviceRequestId - will be mapped to serviceRequestId)',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    example: '1',
    description: 'Repair item ID',
  })
  @IsNotEmpty()
  @IsString()
  repairItem: string;

  @ApiProperty({
    example: '14.99',
    description: 'Cost price',
  })
  @IsNotEmpty()
  @IsString()
  costPrice: string;

  @ApiProperty({
    example: '20.99',
    description: 'Customer price (selling price)',
  })
  @IsNotEmpty()
  @IsString()
  customerPrice: string;

  @ApiProperty({
    example: '2',
    description: 'Quantity',
  })
  @IsNotEmpty()
  @IsString()
  quantity: string;

  @ApiProperty({
    example: 'ff',
    description: 'Notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: '1',
    description: 'User ID (optional, will use JWT token if not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

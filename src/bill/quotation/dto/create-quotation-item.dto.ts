import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuotationItemDto {
  @ApiProperty({ example: 'Screen Replacement', description: 'Item product/service name' })
  @IsNotEmpty()
  @IsString()
  product: string;

  @ApiProperty({ example: 1, description: 'Quantity', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({ example: 130.43, description: 'Unit price BEFORE VAT' })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}


import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Screen Replacement', description: 'Product or service name' })
  @IsNotEmpty()
  @IsString()
  product: string;

  @ApiProperty({ example: 1, description: 'Quantity', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({ example: 130.43, description: 'Unit price BEFORE VAT' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  unitPrice: number;
}

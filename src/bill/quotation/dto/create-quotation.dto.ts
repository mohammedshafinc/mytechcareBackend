import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuotationItemDto } from './create-quotation-item.dto';

export class CreateQuotationDto {
  @ApiProperty({ example: '2026-02-09', description: 'Quotation date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  quotationDate?: string;

  @ApiProperty({ example: '2026-03-09', description: 'Valid until date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiProperty({ example: 'Ahmed Ali', description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ example: '+966501234567', description: 'Customer mobile number', required: false })
  @IsOptional()
  @IsString()
  customerMobile?: string;

  @ApiProperty({ example: '300000000000003', description: 'Customer VAT number', required: false })
  @IsOptional()
  @IsString()
  customerVatNumber?: string;

  @ApiProperty({ example: 'Riyadh, Saudi Arabia', description: 'Customer address', required: false })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiProperty({
    type: [CreateQuotationItemDto],
    description: 'Quotation line items (at least 1 required)',
    example: [{ product: 'Screen Replacement', quantity: 1, unitPrice: 130.43 }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];

  @ApiProperty({ example: 'Prices valid for 7 days', description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '5', description: 'Service request ID (optional, for linking)', required: false })
  @IsOptional()
  @IsString()
  serviceRequestId?: string;
}


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
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ example: '2026-02-09', description: 'Invoice date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  invoiceDate?: string;

  @ApiProperty({ example: 'Cash', description: 'Payment method', default: 'Cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  // Customer Info
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

  // Items
  @ApiProperty({
    type: [CreateInvoiceItemDto],
    description: 'Invoice line items (at least 1 required)',
    example: [{ product: 'Screen Replacement', quantity: 1, unitPrice: 130.43 }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiProperty({ example: 'Warranty covered for 1 year', description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '5', description: 'Service request ID (optional, for linking)', required: false })
  @IsOptional()
  @IsString()
  serviceRequestId?: string;
}

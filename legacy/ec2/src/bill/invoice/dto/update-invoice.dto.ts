import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class UpdateInvoiceDto {
  @ApiProperty({ example: '2026-02-09', description: 'Invoice date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  invoiceDate?: string;

  @ApiProperty({ example: 'Bank Transfer', description: 'Payment method', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: 'de305d54-75b4-431b-adb2-eb6b9e546014', description: 'Invoice UUID (Phase 2)', required: false })
  @IsOptional()
  @IsUUID()
  uuid?: string;

  @ApiProperty({ example: '1001', description: 'Invoice Counter Value (ICV)', required: false })
  @IsOptional()
  @IsString()
  icv?: string;

  @ApiProperty({ example: 'BASE64_PREVIOUS_HASH', description: 'Previous cleared invoice hash', required: false })
  @IsOptional()
  @IsString()
  previousHash?: string;

  @ApiProperty({ example: '2026-03-26T10:30:00.000Z', description: 'Invoice issue timestamp (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  issueTimestamp?: string;

  @ApiProperty({ example: 'Ahmed Ali', description: 'Customer name', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

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
    type: [CreateInvoiceItemDto],
    description: 'Updated invoice line items (replaces all existing items)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items?: CreateInvoiceItemDto[];

  @ApiProperty({ example: 'Updated notes', description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'confirmed', description: 'Invoice status', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJobSheetItemDto } from './create-job-sheet-item.dto';

export class CreateJobSheetDto {
  @ApiProperty({ example: 'Ahmed Ali', description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ example: '+966501234567', description: 'Customer mobile', required: false })
  @IsOptional()
  @IsString()
  customerMobile?: string;

  @ApiProperty({ example: 'iPhone 15 Pro', description: 'Device name', required: false })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiProperty({ example: 'iPhone 15 Pro Max', description: 'Device display name', required: false })
  @IsOptional()
  @IsString()
  deviceDisplayName?: string;

  @ApiProperty({ example: 'Screen not working', description: 'Problem reported by customer' })
  @IsOptional()
  @IsString()
  problemReported?: string;

  @ApiProperty({ example: 'Minor scratches on back', description: 'Physical condition on receive' })
  @IsOptional()
  @IsString()
  conditionOnReceive?: string;

  @ApiProperty({ example: 'Charger, Case', description: 'Accessories received (comma-separated)' })
  @IsOptional()
  @IsString()
  accessories?: string;

  @ApiProperty({ example: 250.0, description: 'Estimated repair cost', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedCost?: number;

  @ApiProperty({ example: '2026-03-10', description: 'Estimated delivery date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  estimatedDeliveryDate?: string;

  @ApiProperty({ example: 5, description: 'Assigned technician staff ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedTechnicianId?: number;

  @ApiProperty({ example: '2026-03-04', description: 'Date device was received (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  receivedDate?: string;

  @ApiProperty({ example: 'General repair notes', description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '5', description: 'Service request ID (optional, for linking)', required: false })
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @ApiProperty({
    type: [CreateJobSheetItemDto],
    description: 'Parts used (optional)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobSheetItemDto)
  items?: CreateJobSheetItemDto[];
}

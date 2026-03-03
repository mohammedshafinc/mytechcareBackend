import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJobSheetItemDto } from './create-job-sheet-item.dto';

export class UpdateJobSheetDto {
  @ApiProperty({ example: 'Ahmed Ali', description: 'Customer name', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

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

  @ApiProperty({ example: 'Screen not working', description: 'Problem reported', required: false })
  @IsOptional()
  @IsString()
  problemReported?: string;

  @ApiProperty({ example: 'Minor scratches', description: 'Condition on receive', required: false })
  @IsOptional()
  @IsString()
  conditionOnReceive?: string;

  @ApiProperty({ example: 'Charger, Case', description: 'Accessories', required: false })
  @IsOptional()
  @IsString()
  accessories?: string;

  @ApiProperty({ example: 250.0, description: 'Estimated cost', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedCost?: number;

  @ApiProperty({ example: '2026-03-10', description: 'Estimated delivery date', required: false })
  @IsOptional()
  @IsString()
  estimatedDeliveryDate?: string;

  @ApiProperty({ example: 5, description: 'Assigned technician staff ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedTechnicianId?: number;

  @ApiProperty({ example: 'Replaced screen and battery', description: 'Work done', required: false })
  @IsOptional()
  @IsString()
  workDone?: string;

  @ApiProperty({ example: 'in-progress', description: 'Status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: '2026-03-04', description: 'Received date', required: false })
  @IsOptional()
  @IsString()
  receivedDate?: string;

  @ApiProperty({ example: '2026-03-06', description: 'Completed date', required: false })
  @IsOptional()
  @IsString()
  completedDate?: string;

  @ApiProperty({ example: '2026-03-07', description: 'Delivered date', required: false })
  @IsOptional()
  @IsString()
  deliveredDate?: string;

  @ApiProperty({ example: 'Updated notes', description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreateJobSheetItemDto],
    description: 'Updated parts list (replaces all existing items)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobSheetItemDto)
  items?: CreateJobSheetItemDto[];
}

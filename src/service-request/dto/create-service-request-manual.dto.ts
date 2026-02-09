import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateServiceRequestManualDto {
  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '+966501234567', description: 'Customer mobile number' })
  @IsNotEmpty()
  @IsString()
  mobile: string;

  @ApiProperty({ example: 'Mobile', description: 'Device type (e.g. Mobile, Laptop)' })
  @IsNotEmpty()
  @IsString()
  device: string;

  @ApiProperty({
    example: 'Mobile',
    description: 'Device display name (defaults to device if omitted)',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceDisplayName?: string;

  @ApiProperty({ example: null, description: 'Other device info', required: false })
  @IsOptional()
  @IsString()
  otherDevice?: string | null;

  @ApiProperty({
    example: 'manual',
    description: 'Location type: manual or current',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationType?: string;

  @ApiProperty({ example: 'Dammam, Saudi Arabia', description: 'Address or area' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ example: null, description: 'Current location coords', required: false })
  @IsOptional()
  @IsString()
  currentLocation?: string | null;

  @ApiProperty({ example: null, description: 'Manual location text', required: false })
  @IsOptional()
  @IsString()
  manualLocation?: string | null;

  @ApiProperty({ example: 'Screen cracked', description: 'Issue description', required: false })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 'en', description: 'Language code', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    example: 'Request received',
    description: 'Status (default: Request received)',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    example: 1,
    description: 'Assign to staff by ID when creating',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedStaffId?: number | null;
}

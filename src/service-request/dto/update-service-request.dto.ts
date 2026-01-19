import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateServiceRequestDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Customer name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: '+966501234567',
    description: 'Customer mobile number',
    required: false,
  })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({
    example: 'Mobile',
    description: 'Device type',
    required: false,
  })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiProperty({
    example: 'Mobile',
    description: 'Device display name',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceDisplayName?: string;

  @ApiProperty({
    example: null,
    description: 'Other device information',
    required: false,
  })
  @IsOptional()
  @IsString()
  otherDevice?: string | null;

  @ApiProperty({
    example: 'manual',
    description: 'Location type (manual/current)',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationType?: string;

  @ApiProperty({
    example: 'Dammam, Saudi Arabia',
    description: 'Location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: null,
    description: 'Current location coordinates',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentLocation?: string | null;

  @ApiProperty({
    example: 'Dammam, Saudi Arabia',
    description: 'Manual location',
    required: false,
  })
  @IsOptional()
  @IsString()
  manualLocation?: string | null;

  @ApiProperty({
    example: 'Screen is cracked',
    description: 'Service request description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    example: 'en',
    description: 'Language code',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    example: '12/25/2024, 3:45:30 PM',
    description: 'Date and time string',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateTime?: string;
}

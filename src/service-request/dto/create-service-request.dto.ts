import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateServiceRequestDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Customer name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: '+966501234567',
    description: 'Customer mobile number',
  })
  @IsNotEmpty()
  @IsString()
  mobile: string;

  @ApiProperty({
    example: 'Mobile',
    description: 'Device type',
  })
  @IsNotEmpty()
  @IsString()
  device: string;

  @ApiProperty({
    example: 'Mobile',
    description: 'Device display name',
  })
  @IsNotEmpty()
  @IsString()
  deviceDisplayName: string;

  @ApiProperty({
    example: null,
    description: 'Other device information',
    required: false,
  })
  @IsOptional()
  @IsString()
  otherDevice: string | null;

  @ApiProperty({
    example: 'manual',
    description: 'Location type (manual/current)',
  })
  @IsNotEmpty()
  @IsString()
  locationType: string;

  @ApiProperty({
    example: 'Dammam, Saudi Arabia',
    description: 'Location',
  })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({
    example: null,
    description: 'Current location coordinates',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentLocation: string | null;

  @ApiProperty({
    example: 'Dammam, Saudi Arabia',
    description: 'Manual location',
    required: false,
  })
  @IsOptional()
  @IsString()
  manualLocation: string | null;

  @ApiProperty({
    example: 'Screen is cracked',
    description: 'Service request description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiProperty({
    example: 'en',
    description: 'Language code',
  })
  @IsNotEmpty()
  @IsString()
  language: string;

  @ApiProperty({
    example: '12/25/2024, 3:45:30 PM',
    description: 'Date and time string',
  })
  @IsNotEmpty()
  @IsString()
  dateTime: string;

  @ApiProperty({
    example: '2024-12-25T12:45:30.123Z',
    description: 'ISO timestamp',
  })
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;
}


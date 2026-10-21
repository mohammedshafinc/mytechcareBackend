import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';

export class UpdateStoreDto {
  @ApiProperty({
    example: 'MyTechCare Store Riyadh',
    description: 'Store name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  storeName?: string;

  @ApiProperty({
    example: 'MTCSA01',
    description: 'Store code',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  storeCode?: string;

  @ApiProperty({
    example: 'Riyadh, King Fahd Road',
    description: 'Store location/address',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storeLocation?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Company registration number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyRegistrationNumber?: string | null;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Expiry date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;
}

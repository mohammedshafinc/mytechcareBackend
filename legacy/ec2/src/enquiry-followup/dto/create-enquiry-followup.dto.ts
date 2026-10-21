import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';

export class CreateEnquiryFollowupDto {
  @ApiProperty({ example: 1, description: 'Enquiry ID' })
  @IsNotEmpty()
  @IsInt()
  enquiryId: number;

  @ApiProperty({ example: 'b2c', description: 'Enquiry type (b2c or corporate)' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['b2c', 'corporate'])
  enquiryType: string;

  @ApiProperty({ example: 1, description: 'Follow-up number (1, 2, or 3)' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(3)
  followupNumber: number;

  @ApiProperty({ example: '2026-03-25', description: 'Follow-up date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  followupDate: string;

  @ApiProperty({ example: 'Didn\'t Connect', description: 'Follow-up status' })
  @IsNotEmpty()
  @IsString()
  followupStatus: string;

  @ApiProperty({ example: 'Tried calling but no response', description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

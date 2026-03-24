import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateEnquiryFollowupDto {
  @ApiProperty({ example: '2026-03-25', description: 'Follow-up date', required: false })
  @IsOptional()
  @IsDateString()
  followupDate?: string;

  @ApiProperty({ example: 'Interested', description: 'Follow-up status', required: false })
  @IsOptional()
  @IsString()
  followupStatus?: string;

  @ApiProperty({ example: 'Customer showed interest in premium plan', description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '0551234567',
    description: 'Saudi Arabian mobile number',
  })
  @IsNotEmpty()
  @IsString()
  number: string;
}

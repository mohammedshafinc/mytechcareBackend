import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@mtechcare.com',
    description: 'Admin email address',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Admin password',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}


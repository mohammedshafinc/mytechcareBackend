import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '0551234567',
    description: 'Saudi Arabian mobile number',
  })
  number: string;
}

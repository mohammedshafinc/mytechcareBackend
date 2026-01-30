import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class BlockLoginDto {
  @ApiProperty({
    example: true,
    description: 'When true, blocks login for this account. When false, allows login again.',
  })
  @IsNotEmpty({ message: 'blocked is required' })
  @IsBoolean({ message: 'blocked must be true or false' })
  blocked: boolean;
}

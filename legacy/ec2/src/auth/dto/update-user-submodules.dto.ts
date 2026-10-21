import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, Min } from 'class-validator';
import {
  SUBMODULE_CODES,
  type SubmoduleCode,
} from '../constants/modules.constants';

export class UpdateUserSubmodulesDto {
  @ApiProperty({
    description: 'User ID to update submodules for',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'Array of submodule codes to assign to the user',
    example: ['SERVICE_REQUESTS', 'INVOICES', 'B2C_ENQUIRY'],
    isArray: true,
    enum: SUBMODULE_CODES,
  })
  @IsArray()
  @IsIn(SUBMODULE_CODES, { each: true })
  submodules: SubmoduleCode[];
}

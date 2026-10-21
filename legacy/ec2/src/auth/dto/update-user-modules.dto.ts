import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, Min } from 'class-validator';
import { MODULE_CODES, type ModuleCode } from '../constants/modules.constants';

export class UpdateUserModulesDto {
  @ApiProperty({
    description: 'User ID to update modules for',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'Array of module codes to assign to the user',
    example: ['AUTH', 'CLIENTS', 'REPORTS'],
    isArray: true,
    enum: MODULE_CODES,
  })
  @IsArray()
  @IsIn(MODULE_CODES, { each: true })
  modules: ModuleCode[];
}


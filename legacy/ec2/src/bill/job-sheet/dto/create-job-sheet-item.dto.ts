import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobSheetItemDto {
  @ApiProperty({ example: 'LCD Screen', description: 'Part or component name' })
  @IsNotEmpty()
  @IsString()
  partName: string;

  @ApiProperty({ example: 1, description: 'Quantity', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({ example: 50.0, description: 'Unit cost of the part' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;
}

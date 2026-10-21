import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateUblXmlDto {
  @ApiProperty({
    description: 'UBL XML content to validate',
    example:
      '<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"></Invoice>',
  })
  @IsString()
  @IsNotEmpty()
  xml: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength ,IsBoolean} from 'class-validator';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT', 'VIEWER'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export class CreateAdminUserDto {
  @ApiProperty({
    example: 'user@mtechcare.com',
    description: 'Admin email address (used for login)',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 6 characters)',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'User role',
    enum: ADMIN_ROLES,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsIn(ADMIN_ROLES, { message: `Role must be one of: ${ADMIN_ROLES.join(', ')}` })
  role: AdminRole;

  @ApiProperty({
    example: 'John Doe',
    description: 'Display name (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
  @ApiProperty({
    example: false,
    description: 'Read-only access (cannot create/update/delete)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  viewOnly?: boolean;
}

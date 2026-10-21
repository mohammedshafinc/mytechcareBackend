import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ADMIN_ROLES } from './create-admin-user.dto';
import type { AdminRole } from './create-admin-user.dto';

export class UpdateAdminUserDto {
  @ApiProperty({
    example: 'user@mtechcare.com',
    description: 'Admin email address (optional)',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email' })
  email?: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password (optional, min 6 characters when provided)',
    minLength: 6,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'User role (optional)',
    enum: ADMIN_ROLES,
    required: false,
  })
  @IsOptional()
  @IsIn(ADMIN_ROLES, { message: `Role must be one of: ${ADMIN_ROLES.join(', ')}` })
  role?: AdminRole;

  @ApiProperty({
    example: 'John Doe',
    description: 'Display name (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the admin account is active (optional)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the user has view-only access (cannot edit, delete, or create)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  viewOnly?: boolean;
}

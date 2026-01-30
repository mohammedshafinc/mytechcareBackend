import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { BlockLoginDto } from './dto/block-login.dto';
import { UpdateUserModulesDto } from './dto/update-user-modules.dto';
import { ModuleGuard } from './guards/module.guard';
import { RequireModule } from './decorators/require-module.decorator';
import type { Request } from 'express';
import type { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid Saudi number' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto.number);

    // Determine cookie options based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // Only secure in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' requires secure in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };

    // Only set domain in production (not for localhost)
    if (isProduction) {
      cookieOptions.domain = '.mtechcare.com';
    }

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    const { refreshToken, ...rest } = result;
    return rest;
  }

  
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login', description: 'Login endpoint for admin users with email and password' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({ status: 200, description: 'Admin login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Email and password are required' })
  async adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.adminLogin(
      adminLoginDto.email,
      adminLoginDto.password,
    );

    // Determine cookie options based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // Only secure in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' requires secure in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };

    // Only set domain in production (not for localhost)
    if (isProduction) {
      cookieOptions.domain = '.mtechcare.com';
    }

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    const { refreshToken, ...rest } = result;
    return rest;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token', description: 'Issue a new access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Access token refreshed' })
  @ApiResponse({ status: 401, description: 'Missing/invalid refresh token' })
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) throw new UnauthorizedException();

    return this.authService.refreshAccessToken(refreshToken);
  }

  @Get('admin/permissions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current admin permissions',
    description: 'Returns the authenticated admin’s id, email, name, role, and allowed module codes. Requires JWT.',
  })
  @ApiResponse({ status: 200, description: 'Admin and permissions returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminPermissions(@Req() req: Request & { user?: { sub: number; email?: string; role?: string } }) {
    const userId = req.user?.sub;
    if (userId == null) throw new UnauthorizedException();
    return this.authService.getAdminMe(Number(userId));
  }

  @Get('admin/users')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admin users', description: 'Fetch all admin users from the database (passwords are excluded for security)' })
  @ApiResponse({ status: 200, description: 'Admins fetched successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – AUTH module required' })
  getAllAdmins() {
    return this.authService.getAllAdmins();
  }

  @Get('admin/modules')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all modules',
    description: 'Returns all available modules in the system',
  })
  @ApiResponse({ status: 200, description: 'Modules fetched successfully' })
  getAllModules() {
    return this.authService.getAllModules();
  }

  @Get('admin/users/modules')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users with modules',
    description:
      'Returns all admin users with their assigned modules for RBAC management',
  })
  @ApiResponse({ status: 200, description: 'Users with modules fetched successfully' })
  getAllUsersWithModules() {
    return this.authService.getAllUsersWithModules();
  }

  @Post('admin/users/modules')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user modules',
    description:
      'Update module permissions for a specific user. Cannot modify SUPER_ADMIN.',
  })
  @ApiBody({ type: UpdateUserModulesDto })
  @ApiResponse({ status: 200, description: 'User modules updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify Super Admin or invalid modules',
  })
  updateUserModules(
    @Body() dto: UpdateUserModulesDto,
    @Req() req: Request & { user?: { sub: number } },
  ) {
    const requestingUserId = req.user?.sub;
    if (!requestingUserId) throw new UnauthorizedException();
    return this.authService.updateUserModules(
      dto.userId,
      dto.modules,
      requestingUserId,
    );
  }

  @Post('admin/users/:userId/reset-modules')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset user to role modules',
    description: 'Remove custom module assignments and reset to role-based defaults',
  })
  @ApiResponse({ status: 200, description: 'User reset to role-based modules' })
  resetUserModules(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: Request & { user?: { sub: number } },
  ) {
    const requestingUserId = req.user?.sub;
    if (!requestingUserId) throw new UnauthorizedException();
    return this.authService.resetUserToRoleModules(userId, requestingUserId);
  }

  @Post('admin/users')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create admin user',
    description: 'Create a new admin user. Requires authentication. Provide email, password, and role. The new user can log in with email and password.',
  })
  @ApiBody({ type: CreateAdminUserDto })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (invalid email, short password, invalid role)' })
  @ApiResponse({ status: 409, description: 'An admin with this email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – AUTH module required' })
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.authService.createAdminUser(dto);
  }

  @Patch('admin/users/:userId')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit admin user',
    description:
      'Update an existing admin user. Provide only the fields you want to change (email, password, role, name, isActive).',
  })
  @ApiBody({ type: UpdateAdminUserDto })
  @ApiResponse({ status: 200, description: 'Admin user updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or user not found' })
  @ApiResponse({ status: 409, description: 'An admin with this email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – AUTH module required' })
  updateAdminUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.authService.updateAdminUser(userId, dto);
  }

  @Patch('admin/users/:userId/block-login')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Block or allow login',
    description:
      'When blocked is true, this account cannot log in. When false, login is allowed again. Blocked users see "Authentication blocked for this account" on login.',
  })
  @ApiBody({ type: BlockLoginDto })
  @ApiResponse({ status: 200, description: 'Block/login state updated' })
  @ApiResponse({ status: 400, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – AUTH module required' })
  setBlockLogin(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: BlockLoginDto,
  ) {
    return this.authService.setBlockLogin(userId, dto);
  }

  @Delete('admin/users/:userId')
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('AUTH')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete admin user',
    description:
      'Permanently delete an admin user. Cannot delete Super Admin or your own account. User modules are removed first.',
  })
  @ApiResponse({ status: 200, description: 'Admin user deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete Super Admin or your own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – AUTH module required' })
  deleteAdminUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: Request & { user?: { sub: number } },
  ) {
    const requestingUserId = req.user?.sub;
    if (!requestingUserId) throw new UnauthorizedException();
    return this.authService.deleteAdminUser(userId, requestingUserId);
  }
}

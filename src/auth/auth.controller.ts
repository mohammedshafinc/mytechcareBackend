import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import type { Request } from 'express';
import type { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid Saudi number' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.number);
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

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: '.mtechcare.com',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

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

  @Get('admin/users')
  @ApiOperation({ summary: 'Get all admin users', description: 'Fetch all admin users from the database (passwords are excluded for security)' })
  @ApiResponse({ status: 200, description: 'Admins fetched successfully' })
  getAllAdmins() {
    return this.authService.getAllAdmins();
  }
}

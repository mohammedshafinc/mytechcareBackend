import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

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
  adminLogin(@Body() adminLoginDto: AdminLoginDto) {
    return this.authService.adminLogin(adminLoginDto.email, adminLoginDto.password);
  }

  @Get('admin/users')
  @ApiOperation({ summary: 'Get all admin users', description: 'Fetch all admin users from the database (passwords are excluded for security)' })
  @ApiResponse({ status: 200, description: 'Admins fetched successfully' })
  getAllAdmins() {
    return this.authService.getAllAdmins();
  }
}

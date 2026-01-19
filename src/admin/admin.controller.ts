import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  @UseGuards(AuthGuard('jwt'))
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard' })
  @ApiResponse({ status: 200, description: 'Admin dashboard' })
  getDashboard() {
    return 'Admin dashboard';
  }
}


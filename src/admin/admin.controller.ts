import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ModuleGuard } from '../auth/guards/module.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  @UseGuards(AuthGuard('jwt'), ModuleGuard)
  @RequireModule('REPORTS')
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard' })
  @ApiResponse({ status: 200, description: 'Admin dashboard' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – REPORTS module required' })
  getDashboard() {
    return 'Admin dashboard';
  }
}


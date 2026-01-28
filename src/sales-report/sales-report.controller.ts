import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesReportService } from './sales-report.service';
import { ModuleGuard } from '../auth/guards/module.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('Sales Report')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('REPORTS')
@Controller('sales-report')
export class SalesReportController {
  constructor(private readonly salesReportService: SalesReportService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get sales dashboard',
    description: 'Get comprehensive sales dashboard with financial metrics, service requests, enquiries, and trends',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2026-01-31',
  })
  @ApiResponse({ status: 200, description: 'Sales dashboard data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSalesDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesReportService.getSalesDashboard(startDate, endDate);
  }

  @Get('financial')
  @ApiOperation({
    summary: 'Get financial report',
    description: 'Get detailed financial report with revenue breakdown, profit analysis, top performers, and financial trends',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2026-01-31',
  })
  @ApiResponse({ status: 200, description: 'Financial report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFinancialReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesReportService.getFinancialReport(startDate, endDate);
  }

  @Get('service')
  @ApiOperation({
    summary: 'Get service report',
    description: 'Get detailed service report with service requests analytics, enquiry metrics, conversion rates, and service trends',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2026-01-31',
  })
  @ApiResponse({ status: 200, description: 'Service report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getServiceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesReportService.getServiceReport(startDate, endDate);
  }

  @Get('customer')
  @ApiOperation({
    summary: 'Get customer report',
    description: 'Get detailed customer report with customer analytics, segmentation, top customers, and customer trends',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2026-01-31',
  })
  @ApiResponse({ status: 200, description: 'Customer report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCustomerReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesReportService.getCustomerReport(startDate, endDate);
  }
}

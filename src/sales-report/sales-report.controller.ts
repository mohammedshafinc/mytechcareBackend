import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesReportService } from './sales-report.service';
import { ModuleGuard } from '../auth/guards/module.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequireSubmodule } from '../auth/decorators/require-submodule.decorator';

@ApiTags('Sales Report')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('REPORTS')
@RequireSubmodule('SALES_REPORT')
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

  @Get('quotation')
  @ApiOperation({ summary: 'Get quotation report', description: 'Get quotation analytics including status distribution, conversion rates, top products, and trends' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD format)', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD format)', example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Quotation report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuotationReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.salesReportService.getQuotationReport(startDate, endDate);
  }

  @Get('invoice')
  @ApiOperation({ summary: 'Get invoice report', description: 'Get invoice analytics including payment methods, status, quotation vs invoice comparison, and trends' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD format)', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD format)', example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Invoice report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInvoiceReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.salesReportService.getInvoiceReport(startDate, endDate);
  }

  @Get('jobsheet')
  @ApiOperation({ summary: 'Get job sheet report', description: 'Get job sheet analytics including status distribution, repair times, technician workload, and parts usage' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD format)', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD format)', example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Job sheet report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getJobSheetReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.salesReportService.getJobSheetReport(startDate, endDate);
  }

  @Get('staff-performance')
  @ApiOperation({ summary: 'Get staff performance report', description: 'Get staff performance analytics including workload, completion rates, and department breakdown' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD format)', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD format)', example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Staff performance report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStaffPerformanceReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.salesReportService.getStaffPerformanceReport(startDate, endDate);
  }

  @Get('store')
  @ApiOperation({ summary: 'Get store report', description: 'Get store-level analytics combining bills, service requests, job sheets, and more across all stores' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD format)', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD format)', example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Store report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStoreReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.salesReportService.getStoreReport(startDate, endDate);
  }
}

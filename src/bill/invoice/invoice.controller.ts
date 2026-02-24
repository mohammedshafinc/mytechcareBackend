import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ModuleGuard } from '../../auth/guards/module.guard';
import { ViewOnlyGuard } from '../../auth/guards/view-only.guard';
import { RequireModule } from '../../auth/decorators/require-module.decorator';

@ApiTags('Invoice')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('BILLING')
@Controller('bill/invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Create invoice',
    description: 'Create a new invoice directly with customer info and line items',
  })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all invoices',
    description: 'Fetch all invoices with pagination and optional search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by customer name, invoice number, or mobile' })
  @ApiResponse({ status: 200, description: 'Invoices fetched successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.invoiceService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('next-number')
  @ApiOperation({
    summary: 'Get next invoice number',
    description: 'Returns the next available invoice number for form pre-fill',
  })
  @ApiResponse({ status: 200, description: 'Next invoice number returned' })
  async getNextInvoiceNumber() {
    return this.invoiceService.getNextInvoiceNumber();
  }

  @Get('by-service-request/:serviceRequestId')
  @ApiOperation({
    summary: 'Get invoices by service request ID',
    description: 'Fetch all invoices linked to a specific service request',
  })
  @ApiParam({ name: 'serviceRequestId', type: Number, description: 'Service Request ID' })
  @ApiResponse({ status: 200, description: 'Invoices fetched successfully' })
  async findByServiceRequest(
    @Param('serviceRequestId', ParseIntPipe) serviceRequestId: number,
  ) {
    return this.invoiceService.findByServiceRequestId(serviceRequestId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Fetch a single invoice by its ID including line items',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice fetched successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.findOne(id);
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Update invoice',
    description: 'Update an existing invoice. If items are provided, all existing items are replaced.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Delete invoice',
    description: 'Delete an invoice and all its line items',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.remove(id);
  }
}

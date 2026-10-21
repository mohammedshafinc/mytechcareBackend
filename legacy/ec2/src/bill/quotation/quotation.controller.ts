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
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ModuleGuard } from '../../auth/guards/module.guard';
import { ViewOnlyGuard } from '../../auth/guards/view-only.guard';
import { RequireModule } from '../../auth/decorators/require-module.decorator';
import { RequireSubmodule } from '../../auth/decorators/require-submodule.decorator';

@ApiTags('Quotation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('BILLING')
@RequireSubmodule('QUOTATIONS')
@Controller('bill/quotation')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Create quotation',
    description: 'Create a new quotation directly with customer info and line items',
  })
  @ApiBody({ type: CreateQuotationDto })
  @ApiResponse({ status: 201, description: 'Quotation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateQuotationDto) {
    return this.quotationService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all quotations',
    description: 'Fetch all quotations with pagination and optional search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by customer name, quotation number, or mobile' })
  @ApiResponse({ status: 200, description: 'Quotations fetched successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.quotationService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('next-number')
  @ApiOperation({
    summary: 'Get next quotation number',
    description: 'Returns the next available quotation number for form pre-fill',
  })
  @ApiResponse({ status: 200, description: 'Next quotation number returned' })
  async getNextQuotationNumber() {
    return this.quotationService.getNextQuotationNumber();
  }

  @Get('by-service-request/:serviceRequestId')
  @ApiOperation({
    summary: 'Get quotations by service request ID',
    description: 'Fetch all quotations linked to a specific service request',
  })
  @ApiParam({ name: 'serviceRequestId', type: Number, description: 'Service Request ID' })
  @ApiResponse({ status: 200, description: 'Quotations fetched successfully' })
  async findByServiceRequest(
    @Param('serviceRequestId', ParseIntPipe) serviceRequestId: number,
  ) {
    return this.quotationService.findByServiceRequestId(serviceRequestId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quotation by ID',
    description: 'Fetch a single quotation by its ID including line items',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Quotation ID' })
  @ApiResponse({ status: 200, description: 'Quotation fetched successfully' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotationService.findOne(id);
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Update quotation',
    description: 'Update an existing quotation. If items are provided, all existing items are replaced.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Quotation ID' })
  @ApiBody({ type: UpdateQuotationDto })
  @ApiResponse({ status: 200, description: 'Quotation updated successfully' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Delete quotation',
    description: 'Delete a quotation and all its line items',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Quotation ID' })
  @ApiResponse({ status: 200, description: 'Quotation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.quotationService.remove(id);
  }
}


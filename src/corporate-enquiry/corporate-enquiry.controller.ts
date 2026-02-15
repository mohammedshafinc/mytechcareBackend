import { Controller, Post, Get, Put, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CorporateEnquiryService } from './corporate-enquiry.service';
import { CreateCorporateEnquiryDto } from './dto/create-corporate-enquiry.dto';
import { UpdateCorporateEnquiryDto } from './dto/update-corporate-enquiry.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { ViewOnlyGuard } from '../auth/guards/view-only.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('Corporate Enquiry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('ENQUIRE')
@Controller('enquire/corporate')
export class CorporateEnquiryController {
  constructor(private readonly corporateEnquiryService: CorporateEnquiryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all corporate enquiries',
    description: 'Retrieve all corporate enquiries',
  })
  @ApiResponse({ status: 200, description: 'Corporate enquiries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.corporateEnquiryService.findAll();
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get all enquiries',
    description: 'Retrieve all enquiries from both corporate and B2C tables',
  })
  @ApiResponse({ status: 200, description: 'All enquiries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllEnquiries() {
    return this.corporateEnquiryService.findAllEnquiries();
  }

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Create corporate enquiry',
    description: 'Create a new corporate enquiry with corporate name, enquired date, requirement, and additional notes',
  })
  @ApiBody({ type: CreateCorporateEnquiryDto })
  @ApiResponse({ status: 201, description: 'Corporate enquiry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createCorporateEnquiryDto: CreateCorporateEnquiryDto) {
    return this.corporateEnquiryService.create(createCorporateEnquiryDto);
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({
    summary: 'Update corporate enquiry',
    description: 'Update an existing corporate enquiry by ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Corporate enquiry ID',
  })
  @ApiBody({ type: UpdateCorporateEnquiryDto })
  @ApiResponse({ status: 200, description: 'Corporate enquiry updated successfully' })
  @ApiResponse({ status: 404, description: 'Corporate enquiry not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCorporateEnquiryDto: UpdateCorporateEnquiryDto,
  ) {
    return this.corporateEnquiryService.update(id, updateCorporateEnquiryDto);
  }
}

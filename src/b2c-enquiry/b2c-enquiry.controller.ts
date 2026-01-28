import { Controller, Post, Get, Put, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { B2cEnquiryService } from './b2c-enquiry.service';
import { CreateB2cEnquiryDto } from './dto/create-b2c-enquiry.dto';
import { UpdateB2cEnquiryDto } from './dto/update-b2c-enquiry.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('B2C Enquiry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('ENQUIRE')
@Controller('enquire/b2c')
export class B2cEnquiryController {
  constructor(private readonly b2cEnquiryService: B2cEnquiryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all B2C enquiries',
    description: 'Retrieve all B2C enquiries',
  })
  @ApiResponse({ status: 200, description: 'B2C enquiries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.b2cEnquiryService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Create B2C enquiry',
    description: 'Create a new B2C enquiry with customer name, enquired date, requirement, and additional notes',
  })
  @ApiBody({ type: CreateB2cEnquiryDto })
  @ApiResponse({ status: 201, description: 'B2C enquiry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createB2cEnquiryDto: CreateB2cEnquiryDto) {
    return this.b2cEnquiryService.create(createB2cEnquiryDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update B2C enquiry',
    description: 'Update an existing B2C enquiry by ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'B2C enquiry ID',
  })
  @ApiBody({ type: UpdateB2cEnquiryDto })
  @ApiResponse({ status: 200, description: 'B2C enquiry updated successfully' })
  @ApiResponse({ status: 404, description: 'B2C enquiry not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateB2cEnquiryDto: UpdateB2cEnquiryDto,
  ) {
    return this.b2cEnquiryService.update(id, updateB2cEnquiryDto);
  }
}

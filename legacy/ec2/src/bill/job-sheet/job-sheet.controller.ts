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
import { JobSheetService } from './job-sheet.service';
import { CreateJobSheetDto } from './dto/create-job-sheet.dto';
import { UpdateJobSheetDto } from './dto/update-job-sheet.dto';
import { ModuleGuard } from '../../auth/guards/module.guard';
import { ViewOnlyGuard } from '../../auth/guards/view-only.guard';
import { RequireModule } from '../../auth/decorators/require-module.decorator';
import { RequireSubmodule } from '../../auth/decorators/require-submodule.decorator';

@ApiTags('Job Sheet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@RequireModule('BILLING')
@RequireSubmodule('JOB_SHEETS')
@Controller('bill/job-sheet')
export class JobSheetController {
  constructor(private readonly jobSheetService: JobSheetService) {}

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Create job sheet', description: 'Create a new job sheet for device intake' })
  @ApiBody({ type: CreateJobSheetDto })
  @ApiResponse({ status: 201, description: 'Job sheet created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateJobSheetDto) {
    return this.jobSheetService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job sheets', description: 'Fetch all job sheets with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Job sheets fetched successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.jobSheetService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('next-number')
  @ApiOperation({ summary: 'Get next job sheet number' })
  @ApiResponse({ status: 200, description: 'Next job sheet number returned' })
  async getNextNumber() {
    return this.jobSheetService.getNextJobSheetNumber();
  }

  @Get('by-service-request/:serviceRequestId')
  @ApiOperation({ summary: 'Get job sheets by service request ID' })
  @ApiParam({ name: 'serviceRequestId', type: Number })
  @ApiResponse({ status: 200, description: 'Job sheets fetched successfully' })
  async findByServiceRequest(
    @Param('serviceRequestId', ParseIntPipe) serviceRequestId: number,
  ) {
    return this.jobSheetService.findByServiceRequestId(serviceRequestId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job sheet by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Job sheet fetched successfully' })
  @ApiResponse({ status: 404, description: 'Job sheet not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobSheetService.findOne(id);
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Update job sheet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateJobSheetDto })
  @ApiResponse({ status: 200, description: 'Job sheet updated successfully' })
  @ApiResponse({ status: 404, description: 'Job sheet not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobSheetDto,
  ) {
    return this.jobSheetService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ summary: 'Delete job sheet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Job sheet deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job sheet not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobSheetService.remove(id);
  }
}

import { Body, Controller, Delete, Get, Post, Put, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ServiceRequestService } from './service-request.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { CreateServiceRequestManualDto } from './dto/create-service-request-manual.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { ViewOnlyGuard } from '../auth/guards/view-only.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('Service Request')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@Controller('admin/service-request')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @UseGuards(ViewOnlyGuard)
  @ApiOperation({ 
    summary: 'Create service request', 
    description: 'Create a new service request from frontend' 
  })
  @ApiBody({ type: CreateServiceRequestDto })
  @ApiResponse({ status: 201, description: 'Service request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() createServiceRequestDto: CreateServiceRequestDto) {
    return this.serviceRequestService.create(createServiceRequestDto);
  }

  @Post('manual')
  @UseGuards(ViewOnlyGuard)
  @RequireModule('CLIENTS')
  @ApiOperation({ 
    summary: 'Create service request manually (admin)', 
    description: 'Create a service request from admin with minimal required fields. Date/time and optional staff assignment use defaults.' 
  })
  @ApiBody({ type: CreateServiceRequestManualDto })
  @ApiResponse({ status: 201, description: 'Service request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  createManual(@Body() dto: CreateServiceRequestManualDto) {
    return this.serviceRequestService.createManual(dto);
  }

  @Get()
  @RequireModule('CLIENTS')
  @ApiOperation({ 
    summary: 'Get all service requests', 
    description: 'Fetch all service requests from the database, ordered by creation date (newest first)' 
  })
  @ApiResponse({ status: 200, description: 'Service requests fetched successfully' })
  findAll() {
    return this.serviceRequestService.findAll();
  }

  @Get('assigned')
  @RequireModule('CLIENTS')
  @ApiOperation({ 
    summary: 'Get assigned service requests', 
    description: 'Fetch service requests that are assigned to staff, with staff details' 
  })
  @ApiResponse({ status: 200, description: 'Assigned service requests fetched successfully' })
  findAssigned() {
    return this.serviceRequestService.findAssigned();
  }

  @Get(':id')
  @RequireModule('CLIENTS')
  @ApiOperation({
    summary: 'Get service request by ID or UUID',
    description: 'Fetch a single service request by numeric ID or UUID for detail page',
  })
  @ApiParam({ name: 'id', description: 'Service request ID (number) or UUID' })
  @ApiResponse({ status: 200, description: 'Service request fetched successfully' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  async findOne(@Param('id') id: string) {
    const serviceRequest = await this.serviceRequestService.findOne(id);
    return {
      success: true,
      data: serviceRequest,
    };
  }

  @Put(':id')
  @UseGuards(ViewOnlyGuard)
  @RequireModule('CLIENTS')
  @ApiOperation({ 
    summary: 'Update service request', 
    description: 'Update a service request by ID' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Service request ID (number) or UUID' 
  })
  @ApiBody({ type: UpdateServiceRequestDto })
  @ApiResponse({ status: 200, description: 'Service request updated successfully' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRequestDto,
  ) {
    const updatedRequest = await this.serviceRequestService.update(id, updateDto);
    
    return {
      message: 'Service request updated successfully',
      request: updatedRequest,
      data: updatedRequest,
    };
  }

  @Delete(':id')
  @UseGuards(ViewOnlyGuard)
  @RequireModule('CLIENTS')
  @ApiOperation({
    summary: 'Delete service request',
    description: 'Delete a service request by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Service request ID (number) or UUID',
  })
  @ApiResponse({ status: 200, description: 'Service request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  @ApiResponse({ status: 409, description: 'Service request has linked bills; use ?force=true to confirm' })
  async remove(@Param('id') id: string, @Query('force') force?: string) {
    return this.serviceRequestService.remove(id, { force: force === 'true' });
  }
}


import { Body, Controller, Delete, Get, Post, Put, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ServiceRequestService } from './service-request.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { ModuleGuard } from '../auth/guards/module.guard';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@ApiTags('Service Request')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ModuleGuard)
@Controller('admin/service-request')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
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

  @Put(':id')
  @RequireModule('CLIENTS')
  @ApiOperation({ 
    summary: 'Update service request', 
    description: 'Update a service request by ID' 
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Service request ID' 
  })
  @ApiBody({ type: UpdateServiceRequestDto })
  @ApiResponse({ status: 200, description: 'Service request updated successfully' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id', ParseIntPipe) id: number,
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
  @RequireModule('CLIENTS')
  @ApiOperation({
    summary: 'Delete service request',
    description: 'Delete a service request by ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Service request ID',
  })
  @ApiResponse({ status: 200, description: 'Service request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.serviceRequestService.remove(id);
  }
}


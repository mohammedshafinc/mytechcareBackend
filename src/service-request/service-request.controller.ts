import { Body, Controller, Get, Post, Put, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ServiceRequestService } from './service-request.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';

@ApiTags('Service Request')
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
  @ApiOperation({ 
    summary: 'Get all service requests', 
    description: 'Fetch all service requests from the database, ordered by creation date (newest first)' 
  })
  @ApiResponse({ status: 200, description: 'Service requests fetched successfully' })
  findAll() {
    return this.serviceRequestService.findAll();
  }

  @Put(':id')
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
}


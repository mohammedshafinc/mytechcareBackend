import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceRequestService } from './service-request.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

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
}


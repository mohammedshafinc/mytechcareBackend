import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceRequestService } from './service-request.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

/**
 * Public controller for client-side lookups. No authentication required.
 * User enters mobile number and gets all service requests for that number.
 */
@ApiTags('Service Request (Public)')
@Controller('service-request')
export class ServiceRequestPublicController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Create service request (public)',
    description:
      'Create a new service request from client-side without requiring module permissions.',
  })
  @ApiBody({ type: CreateServiceRequestDto })
  @ApiResponse({ status: 201, description: 'Service request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() dto: CreateServiceRequestDto) {
    return this.serviceRequestService.create(dto);
  }

  @Get('by-mobile')
  @ApiOperation({
    summary: 'Look up service requests by mobile (public)',
    description: 'Returns all service requests for the given mobile number. No login required.',
  })
  @ApiQuery({ name: 'mobile', required: true, description: 'Phone number to look up' })
  @ApiResponse({ status: 200, description: 'List of requests with id, status, name, device' })
  @ApiResponse({ status: 400, description: 'mobile is required' })
  async getByMobile(@Query('mobile') mobile: string) {
    if (!mobile?.trim()) {
      throw new BadRequestException('mobile query parameter is required');
    }
    const data = await this.serviceRequestService.findByMobile(mobile.trim());
    return { success: true, count: data.length, data };
  }
}

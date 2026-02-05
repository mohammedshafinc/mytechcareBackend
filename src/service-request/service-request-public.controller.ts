import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceRequestService } from './service-request.service';

/**
 * Public controller for client-side lookups. No authentication required.
 * User enters mobile number and gets all service requests for that number.
 */
@ApiTags('Service Request (Public)')
@Controller('service-request')
export class ServiceRequestPublicController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

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

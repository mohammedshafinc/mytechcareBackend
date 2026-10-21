import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('expiry-alerts')
  @ApiOperation({
    summary: 'Get staff expiry alerts',
    description:
      'Returns staff whose passport or iqama expiry dates are expired or expiring within the given number of days. Defaults to 30 days.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days ahead to check for expiry (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Expiry alerts returned successfully',
  })
  async getExpiryAlerts(@Query('days') days?: string) {
    const daysThreshold = days ? parseInt(days, 10) : 30;
    return this.notificationService.getExpiryAlerts(
      isNaN(daysThreshold) ? 30 : daysThreshold,
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StaffService } from '../staff/staff.service';
import { AdminGateway } from '../admin/admin.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly staffService: StaffService,
    private readonly adminGateway: AdminGateway,
  ) {}

  /**
   * Runs every day at 8:00 AM to check for expiring documents
   * and push alerts to all connected admin clients via WebSocket.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleExpiryCheck() {
    this.logger.log('Running scheduled expiry check...');
    try {
      const result = await this.staffService.getExpiryAlerts(30);
      if (result.count > 0) {
        this.adminGateway.server
          .to('admins')
          .emit('expiry-alerts', result);
        this.logger.log(`Sent ${result.count} expiry alert(s) to admins`);
      } else {
        this.logger.log('No expiry alerts found');
      }
    } catch (error) {
      this.logger.error('Failed to run expiry check', error);
    }
  }

  /**
   * Manually fetch expiry alerts (called by controller).
   * @param daysThreshold - number of days ahead to check (default 30)
   */
  async getExpiryAlerts(daysThreshold = 30) {
    return this.staffService.getExpiryAlerts(daysThreshold);
  }
}

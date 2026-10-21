import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { StaffModule } from '../staff/staff.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [StaffModule, AdminModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

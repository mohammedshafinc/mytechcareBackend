import { Module } from '@nestjs/common';
import { AdminGateway } from './admin.gateway';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { SalesReportModule } from '../sales-report/sales-report.module';

@Module({
  imports: [AuthModule, SalesReportModule],
  controllers: [AdminController],
  providers: [AdminGateway, AdminService],
  exports: [AdminGateway],
})
export class AdminModule {}

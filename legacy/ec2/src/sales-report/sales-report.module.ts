import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesReportController } from './sales-report.controller';
import { SalesReportService } from './sales-report.service';
import { Bill } from '../bill/bill.entity';
import { ServiceRequest } from '../service-request/service-request.entity';
import { CorporateEnquiry } from '../corporate-enquiry/corporate-enquiry.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';
import { Quotation } from '../bill/quotation/quotation.entity';
import { Invoice } from '../bill/invoice/invoice.entity';
import { JobSheet } from '../bill/job-sheet/job-sheet.entity';
import { Staff } from '../staff/staff.entity';
import { Store } from '../store/store.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bill, ServiceRequest, CorporateEnquiry, B2cEnquiry,
      Quotation, Invoice, JobSheet, Staff, Store,
    ]),
    AuthModule,
  ],
  controllers: [SalesReportController],
  providers: [SalesReportService],
  exports: [SalesReportService],
})
export class SalesReportModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';
import { Bill } from './bill.entity';
import { ServiceRequest } from '../service-request/service-request.entity';
import { RepairItem } from '../repair-item/repair-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bill, ServiceRequest, RepairItem]),
  ],
  controllers: [BillController],
  providers: [BillService],
  exports: [BillService],
})
export class BillModule {}

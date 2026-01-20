import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairItemController } from './repair-item.controller';
import { RepairItemService } from './repair-item.service';
import { RepairItem } from './repair-item.entity';
import { BillModule } from '../bill/bill.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepairItem]),
    BillModule,
  ],
  controllers: [RepairItemController],
  providers: [RepairItemService],
  exports: [RepairItemService],
})
export class RepairItemModule {}

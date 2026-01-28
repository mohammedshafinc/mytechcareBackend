import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairItemController } from './repair-item.controller';
import { RepairItemService } from './repair-item.service';
import { RepairItem } from './repair-item.entity';
import { BillModule } from '../bill/bill.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepairItem]),
    BillModule,
    AuthModule,
  ],
  controllers: [RepairItemController],
  providers: [RepairItemService],
  exports: [RepairItemService],
})
export class RepairItemModule {}

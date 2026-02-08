import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { VehicleExpense } from './vehicle-expense.entity';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { Store } from '../../store/store.entity';
import { Admin } from '../../user/admin.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleExpense, Store, Admin]),
    AuthModule,
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehiclesModule {}

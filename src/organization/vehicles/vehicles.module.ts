import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { VehicleExpense } from './vehicle-expense.entity';
import { RentalVehicle } from './rental-vehicle.entity';
import { VehicleController } from './vehicle.controller';
import { RentalVehicleController } from './rental-vehicle.controller';
import { VehicleService } from './vehicle.service';
import { RentalVehicleService } from './rental-vehicle.service';
import { Store } from '../../store/store.entity';
import { Admin } from '../../user/admin.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleExpense, RentalVehicle, Store, Admin]),
    AuthModule,
  ],
  controllers: [VehicleController, RentalVehicleController],
  providers: [VehicleService, RentalVehicleService],
  exports: [VehicleService, RentalVehicleService],
})
export class VehiclesModule {}

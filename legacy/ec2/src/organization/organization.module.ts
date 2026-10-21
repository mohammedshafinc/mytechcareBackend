import { Module } from '@nestjs/common';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [VehiclesModule],
  exports: [VehiclesModule],
})
export class OrganizationModule {}

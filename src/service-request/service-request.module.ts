import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequestController } from './service-request.controller';
import { ServiceRequestPublicController } from './service-request-public.controller';
import { ServiceRequestService } from './service-request.service';
import { ServiceRequest } from './service-request.entity';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest]),
    AdminModule,
    AuthModule,
  ],
  controllers: [ServiceRequestController, ServiceRequestPublicController],
  providers: [ServiceRequestService],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}



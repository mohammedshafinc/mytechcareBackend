import { Module } from '@nestjs/common';
import { AdminGateway } from './admin.gateway';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [AdminGateway],
  exports: [AdminGateway],
})
export class AdminModule {}

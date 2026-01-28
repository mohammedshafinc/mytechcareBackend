import { Module } from '@nestjs/common';
import { AdminGateway } from './admin.gateway';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminGateway],
  exports: [AdminGateway],
})
export class AdminModule {}

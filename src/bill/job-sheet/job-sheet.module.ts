import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSheetController } from './job-sheet.controller';
import { JobSheetService } from './job-sheet.service';
import { JobSheet } from './job-sheet.entity';
import { JobSheetItem } from './job-sheet-item.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobSheet, JobSheetItem]),
    AuthModule,
  ],
  controllers: [JobSheetController],
  providers: [JobSheetService],
  exports: [JobSheetService],
})
export class JobSheetModule {}

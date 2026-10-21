import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { Quotation } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quotation, QuotationItem]),
    AuthModule,
  ],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}


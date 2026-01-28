import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporateEnquiryController } from './corporate-enquiry.controller';
import { CorporateEnquiryService } from './corporate-enquiry.service';
import { CorporateEnquiry } from './corporate-enquiry.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CorporateEnquiry, B2cEnquiry]),
    AuthModule,
  ],
  controllers: [CorporateEnquiryController],
  providers: [CorporateEnquiryService],
  exports: [CorporateEnquiryService],
})
export class CorporateEnquiryModule {}

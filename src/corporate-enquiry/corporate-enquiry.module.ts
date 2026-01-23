import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporateEnquiryController } from './corporate-enquiry.controller';
import { CorporateEnquiryService } from './corporate-enquiry.service';
import { CorporateEnquiry } from './corporate-enquiry.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CorporateEnquiry, B2cEnquiry]),
  ],
  controllers: [CorporateEnquiryController],
  providers: [CorporateEnquiryService],
  exports: [CorporateEnquiryService],
})
export class CorporateEnquiryModule {}

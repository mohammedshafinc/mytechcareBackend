import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnquiryFollowupController } from './enquiry-followup.controller';
import { EnquiryFollowupService } from './enquiry-followup.service';
import { EnquiryFollowup } from './enquiry-followup.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';
import { CorporateEnquiry } from '../corporate-enquiry/corporate-enquiry.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnquiryFollowup, B2cEnquiry, CorporateEnquiry]),
    AuthModule,
  ],
  controllers: [EnquiryFollowupController],
  providers: [EnquiryFollowupService],
  exports: [EnquiryFollowupService],
})
export class EnquiryFollowupModule {}

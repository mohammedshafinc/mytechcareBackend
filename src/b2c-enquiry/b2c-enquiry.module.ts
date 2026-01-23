import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { B2cEnquiryController } from './b2c-enquiry.controller';
import { B2cEnquiryService } from './b2c-enquiry.service';
import { B2cEnquiry } from './b2c-enquiry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([B2cEnquiry]),
  ],
  controllers: [B2cEnquiryController],
  providers: [B2cEnquiryService],
  exports: [B2cEnquiryService],
})
export class B2cEnquiryModule {}

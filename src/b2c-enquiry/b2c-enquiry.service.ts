import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { B2cEnquiry } from './b2c-enquiry.entity';
import { CreateB2cEnquiryDto } from './dto/create-b2c-enquiry.dto';
import { UpdateB2cEnquiryDto } from './dto/update-b2c-enquiry.dto';

@Injectable()
export class B2cEnquiryService {
  constructor(
    @InjectRepository(B2cEnquiry)
    private b2cEnquiryRepository: Repository<B2cEnquiry>,
  ) {}

  async findAll() {
    const enquiries = await this.b2cEnquiryRepository.find({
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'B2C enquiries retrieved successfully',
      data: enquiries,
    };
  }

  async create(createB2cEnquiryDto: CreateB2cEnquiryDto) {
    const b2cEnquiry = this.b2cEnquiryRepository.create({
      customerName: createB2cEnquiryDto.customerName,
      enquiredDate: new Date(createB2cEnquiryDto.enquiredDate),
      requirement: createB2cEnquiryDto.requirement,
      additionalNotes: createB2cEnquiryDto.additionalNotes || null,
      mobileNumber: createB2cEnquiryDto.mobileNumber || null,
      location: createB2cEnquiryDto.location || null,
      enquiryType: createB2cEnquiryDto.enquiryType || null,
      status: createB2cEnquiryDto.status || 'Pending',
    });

    const savedEnquiry = await this.b2cEnquiryRepository.save(b2cEnquiry);

    return {
      success: true,
      message: 'B2C enquiry created successfully',
      data: savedEnquiry,
    };
  }

  async update(id: number, updateDto: UpdateB2cEnquiryDto) {
    // Find the B2C enquiry
    const b2cEnquiry = await this.b2cEnquiryRepository.findOne({
      where: { id },
    });

    if (!b2cEnquiry) {
      throw new NotFoundException('B2C enquiry not found');
    }

    // Update fields if provided
    if (updateDto.customerName !== undefined) {
      b2cEnquiry.customerName = updateDto.customerName;
    }
    if (updateDto.enquiredDate !== undefined) {
      b2cEnquiry.enquiredDate = new Date(updateDto.enquiredDate);
    }
    if (updateDto.requirement !== undefined) {
      b2cEnquiry.requirement = updateDto.requirement;
    }
    if (updateDto.additionalNotes !== undefined) {
      b2cEnquiry.additionalNotes = updateDto.additionalNotes || null;
    }
    if (updateDto.mobileNumber !== undefined) {
      b2cEnquiry.mobileNumber = updateDto.mobileNumber || null;
    }
    if (updateDto.location !== undefined) {
      b2cEnquiry.location = updateDto.location || null;
    }
    if (updateDto.enquiryType !== undefined) {
      b2cEnquiry.enquiryType = updateDto.enquiryType || null;
    }
    if (updateDto.status !== undefined) {
      b2cEnquiry.status = updateDto.status || null;
    }

    // Save the updated B2C enquiry
    const updatedEnquiry = await this.b2cEnquiryRepository.save(b2cEnquiry);

    return {
      success: true,
      message: 'B2C enquiry updated successfully',
      data: updatedEnquiry,
    };
  }
}

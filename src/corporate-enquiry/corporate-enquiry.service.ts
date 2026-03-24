import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorporateEnquiry } from './corporate-enquiry.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';
import { EnquiryFollowup } from '../enquiry-followup/enquiry-followup.entity';
import { CreateCorporateEnquiryDto } from './dto/create-corporate-enquiry.dto';
import { UpdateCorporateEnquiryDto } from './dto/update-corporate-enquiry.dto';

@Injectable()
export class CorporateEnquiryService {
  constructor(
    @InjectRepository(CorporateEnquiry)
    private corporateEnquiryRepository: Repository<CorporateEnquiry>,
    @InjectRepository(B2cEnquiry)
    private b2cEnquiryRepository: Repository<B2cEnquiry>,
    @InjectRepository(EnquiryFollowup)
    private followupRepository: Repository<EnquiryFollowup>,
  ) {}

  async findAll() {
    const [enquiries, allFollowups] = await Promise.all([
      this.corporateEnquiryRepository.find({
        order: { createdAt: 'DESC' },
      }),
      this.followupRepository.find({
        where: { enquiryType: 'corporate' },
        order: { followupNumber: 'ASC' },
      }),
    ]);

    const followupMap = new Map<number, EnquiryFollowup[]>();
    for (const fu of allFollowups) {
      if (!followupMap.has(fu.enquiryId)) followupMap.set(fu.enquiryId, []);
      followupMap.get(fu.enquiryId)!.push(fu);
    }

    const data = enquiries.map(enquiry => ({
      ...enquiry,
      followups: followupMap.get(enquiry.id) || [],
    }));

    return {
      success: true,
      message: 'Corporate enquiries retrieved successfully',
      data,
    };
  }

  async findAllEnquiries() {
    const [corporateEnquiries, b2cEnquiries, allFollowups] = await Promise.all([
      this.corporateEnquiryRepository.find({
        order: { createdAt: 'DESC' },
      }),
      this.b2cEnquiryRepository.find({
        order: { createdAt: 'DESC' },
      }),
      this.followupRepository.find({
        order: { followupNumber: 'ASC' },
      }),
    ]);

    const followupMap = new Map<string, EnquiryFollowup[]>();
    for (const fu of allFollowups) {
      const key = `${fu.enquiryType}_${fu.enquiryId}`;
      if (!followupMap.has(key)) followupMap.set(key, []);
      followupMap.get(key)!.push(fu);
    }

    const allEnquiries = [
      ...corporateEnquiries.map(enquiry => ({
        ...enquiry,
        enquiryCategory: 'corporate',
        followups: followupMap.get(`corporate_${enquiry.id}`) || [],
      })),
      ...b2cEnquiries.map(enquiry => ({
        ...enquiry,
        enquiryCategory: 'b2c',
        followups: followupMap.get(`b2c_${enquiry.id}`) || [],
      })),
    ].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      success: true,
      message: 'All enquiries retrieved successfully',
      data: allEnquiries,
      counts: {
        corporate: corporateEnquiries.length,
        b2c: b2cEnquiries.length,
        total: allEnquiries.length,
      },
    };
  }

  async create(createCorporateEnquiryDto: CreateCorporateEnquiryDto) {
    const corporateEnquiry = this.corporateEnquiryRepository.create({
      corporateName: createCorporateEnquiryDto.corporateName,
      enquiredDate: new Date(createCorporateEnquiryDto.enquiredDate),
      requirement: createCorporateEnquiryDto.requirement,
      additionalNotes: createCorporateEnquiryDto.additionalNotes || null,
      mobileNumber: createCorporateEnquiryDto.mobileNumber || null,
      location: createCorporateEnquiryDto.location || null,
      enquiryType: createCorporateEnquiryDto.enquiryType || null,
      status: createCorporateEnquiryDto.status || 'Pending',
    });

    const savedEnquiry = await this.corporateEnquiryRepository.save(corporateEnquiry);

    return {
      success: true,
      message: 'Corporate enquiry created successfully',
      data: savedEnquiry,
    };
  }

  async update(id: number, updateDto: UpdateCorporateEnquiryDto) {
    // Find the corporate enquiry
    const corporateEnquiry = await this.corporateEnquiryRepository.findOne({
      where: { id },
    });

    if (!corporateEnquiry) {
      throw new NotFoundException('Corporate enquiry not found');
    }

    // Update fields if provided
    if (updateDto.corporateName !== undefined) {
      corporateEnquiry.corporateName = updateDto.corporateName;
    }
    if (updateDto.enquiredDate !== undefined) {
      corporateEnquiry.enquiredDate = new Date(updateDto.enquiredDate);
    }
    if (updateDto.requirement !== undefined) {
      corporateEnquiry.requirement = updateDto.requirement;
    }
    if (updateDto.additionalNotes !== undefined) {
      corporateEnquiry.additionalNotes = updateDto.additionalNotes || null;
    }
    if (updateDto.mobileNumber !== undefined) {
      corporateEnquiry.mobileNumber = updateDto.mobileNumber || null;
    }
    if (updateDto.location !== undefined) {
      corporateEnquiry.location = updateDto.location || null;
    }
    if (updateDto.enquiryType !== undefined) {
      corporateEnquiry.enquiryType = updateDto.enquiryType || null;
    }
    if (updateDto.status !== undefined) {
      corporateEnquiry.status = updateDto.status || null;
    }

    // Save the updated corporate enquiry
    const updatedEnquiry = await this.corporateEnquiryRepository.save(corporateEnquiry);

    return {
      success: true,
      message: 'Corporate enquiry updated successfully',
      data: updatedEnquiry,
    };
  }

  async remove(id: number) {
    const corporateEnquiry = await this.corporateEnquiryRepository.findOne({
      where: { id },
    });

    if (!corporateEnquiry) {
      throw new NotFoundException('Corporate enquiry not found');
    }

    await this.corporateEnquiryRepository.remove(corporateEnquiry);

    return {
      success: true,
      message: 'Corporate enquiry deleted successfully',
    };
  }
}

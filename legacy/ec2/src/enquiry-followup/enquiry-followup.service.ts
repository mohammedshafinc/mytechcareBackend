import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EnquiryFollowup } from './enquiry-followup.entity';
import { B2cEnquiry } from '../b2c-enquiry/b2c-enquiry.entity';
import { CorporateEnquiry } from '../corporate-enquiry/corporate-enquiry.entity';
import { CreateEnquiryFollowupDto } from './dto/create-enquiry-followup.dto';
import { UpdateEnquiryFollowupDto } from './dto/update-enquiry-followup.dto';

@Injectable()
export class EnquiryFollowupService {
  constructor(
    @InjectRepository(EnquiryFollowup)
    private followupRepository: Repository<EnquiryFollowup>,
    @InjectRepository(B2cEnquiry)
    private b2cEnquiryRepository: Repository<B2cEnquiry>,
    @InjectRepository(CorporateEnquiry)
    private corporateEnquiryRepository: Repository<CorporateEnquiry>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getFollowupsByEnquiry(enquiryId: number, enquiryType: string) {
    const followups = await this.followupRepository.find({
      where: { enquiryId, enquiryType },
      order: { followupNumber: 'ASC' },
    });

    return {
      success: true,
      message: 'Follow-ups retrieved successfully',
      data: followups,
    };
  }

  async create(dto: CreateEnquiryFollowupDto) {
    await this.validateEnquiryExists(dto.enquiryId, dto.enquiryType);

    if (dto.followupNumber > 1) {
      const previousFollowup = await this.followupRepository.findOne({
        where: {
          enquiryId: dto.enquiryId,
          enquiryType: dto.enquiryType,
          followupNumber: dto.followupNumber - 1,
        },
      });

      if (!previousFollowup) {
        throw new BadRequestException(
          `Follow-up #${dto.followupNumber - 1} must be completed before creating follow-up #${dto.followupNumber}`,
        );
      }
    }

    const existing = await this.followupRepository.findOne({
      where: {
        enquiryId: dto.enquiryId,
        enquiryType: dto.enquiryType,
        followupNumber: dto.followupNumber,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Follow-up #${dto.followupNumber} already exists for this enquiry`,
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EnquiryFollowup);
      const followup = repo.create({
        enquiryId: dto.enquiryId,
        enquiryType: dto.enquiryType,
        followupNumber: dto.followupNumber,
        followupDate: new Date(dto.followupDate),
        followupStatus: dto.followupStatus,
        description: dto.description || null,
      });
      const row = await repo.save(followup);
      await this.closeParentEnquiryIfFollowupClosed(
        manager,
        row.enquiryId,
        row.enquiryType,
        row.followupStatus,
      );
      return row;
    });

    return {
      success: true,
      message: `Follow-up #${dto.followupNumber} created successfully`,
      data: saved,
    };
  }

  async update(id: number, dto: UpdateEnquiryFollowupDto) {
    const followup = await this.followupRepository.findOne({ where: { id } });

    if (!followup) {
      throw new NotFoundException('Follow-up not found');
    }

    if (dto.followupDate !== undefined) {
      followup.followupDate = new Date(dto.followupDate);
    }
    if (dto.followupStatus !== undefined) {
      followup.followupStatus = dto.followupStatus;
    }
    if (dto.description !== undefined) {
      followup.description = dto.description || null;
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      const row = await manager.getRepository(EnquiryFollowup).save(followup);
      await this.closeParentEnquiryIfFollowupClosed(
        manager,
        row.enquiryId,
        row.enquiryType,
        row.followupStatus,
      );
      return row;
    });

    return {
      success: true,
      message: 'Follow-up updated successfully',
      data: updated,
    };
  }

  async remove(id: number) {
    const followup = await this.followupRepository.findOne({ where: { id } });

    if (!followup) {
      throw new NotFoundException('Follow-up not found');
    }

    await this.followupRepository.remove(followup);

    return {
      success: true,
      message: 'Follow-up deleted successfully',
    };
  }

  private async validateEnquiryExists(enquiryId: number, enquiryType: string) {
    if (enquiryType === 'b2c') {
      const exists = await this.b2cEnquiryRepository.findOne({ where: { id: enquiryId } });
      if (!exists) throw new NotFoundException('B2C enquiry not found');
    } else {
      const exists = await this.corporateEnquiryRepository.findOne({ where: { id: enquiryId } });
      if (!exists) throw new NotFoundException('Corporate enquiry not found');
    }
  }

  private isFollowupClosedStatus(status: string): boolean {
    return status.trim().toLowerCase() === 'closed';
  }

  private async closeParentEnquiryIfFollowupClosed(
    manager: EntityManager,
    enquiryId: number,
    enquiryType: string,
    followupStatus: string,
  ): Promise<void> {
    if (!this.isFollowupClosedStatus(followupStatus)) {
      return;
    }
    if (enquiryType === 'b2c') {
      await manager.update(B2cEnquiry, { id: enquiryId }, { status: 'Closed' });
    } else {
      await manager.update(CorporateEnquiry, { id: enquiryId }, { status: 'Closed' });
    }
  }
}

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JobSheet } from './job-sheet.entity';
import { JobSheetItem } from './job-sheet-item.entity';
import { CreateJobSheetDto } from './dto/create-job-sheet.dto';
import { UpdateJobSheetDto } from './dto/update-job-sheet.dto';

@Injectable()
export class JobSheetService {
  constructor(
    @InjectRepository(JobSheet)
    private jobSheetRepository: Repository<JobSheet>,
    @InjectRepository(JobSheetItem)
    private jobSheetItemRepository: Repository<JobSheetItem>,
    private dataSource: DataSource,
  ) {}

  private async generateJobSheetNumber(): Promise<string> {
    const result = await this.jobSheetRepository
      .createQueryBuilder('js')
      .select('MAX(js.id)', 'maxId')
      .getRawOne();

    const nextId = (result?.maxId || 0) + 1;
    return `JS-${String(nextId).padStart(4, '0')}`;
  }

  async create(dto: CreateJobSheetDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const jobSheetNumber = await this.generateJobSheetNumber();

      const jobSheet = this.jobSheetRepository.create({
        jobSheetNumber,
        serviceRequestId: dto.serviceRequestId
          ? parseInt(dto.serviceRequestId)
          : null,
        customerName: dto.customerName,
        customerMobile: dto.customerMobile || null,
        device: dto.device || null,
        deviceDisplayName: dto.deviceDisplayName || null,
        problemReported: dto.problemReported || null,
        conditionOnReceive: dto.conditionOnReceive || null,
        accessories: dto.accessories || null,
        estimatedCost: dto.estimatedCost ?? null,
        estimatedDeliveryDate: dto.estimatedDeliveryDate
          ? new Date(dto.estimatedDeliveryDate)
          : null,
        assignedTechnicianId: dto.assignedTechnicianId ?? null,
        receivedDate: dto.receivedDate
          ? new Date(dto.receivedDate)
          : new Date(),
        notes: dto.notes || null,
        status: 'received',
      });

      const savedJobSheet = await queryRunner.manager.save(JobSheet, jobSheet);

      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((item) => {
          const qty = item.quantity || 1;
          const cost = item.unitCost || 0;
          return this.jobSheetItemRepository.create({
            jobSheetId: savedJobSheet.id,
            partName: item.partName,
            quantity: qty,
            unitCost: cost,
            total: Math.round(qty * cost * 100) / 100,
          });
        });
        await queryRunner.manager.save(JobSheetItem, items);
      }

      await queryRunner.commitTransaction();

      const complete = await this.jobSheetRepository.findOne({
        where: { id: savedJobSheet.id },
        relations: ['items'],
      });

      return {
        success: true,
        message: 'Job sheet created successfully',
        data: complete,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const qb = this.jobSheetRepository
      .createQueryBuilder('js')
      .leftJoinAndSelect('js.items', 'items')
      .orderBy('js.createdAt', 'DESC');

    if (search) {
      qb.where(
        'js.customerName ILIKE :search OR js.jobSheetNumber ILIKE :search OR js.customerMobile ILIKE :search OR js.device ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      success: true,
      message: 'Job sheets fetched successfully',
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async findOne(id: number) {
    const js = await this.jobSheetRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!js) {
      throw new NotFoundException(`Job sheet with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Job sheet fetched successfully',
      data: js,
    };
  }

  async update(id: number, dto: UpdateJobSheetDto) {
    const js = await this.jobSheetRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!js) {
      throw new NotFoundException(`Job sheet with ID ${id} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.customerName !== undefined) js.customerName = dto.customerName;
      if (dto.customerMobile !== undefined) js.customerMobile = dto.customerMobile || null;
      if (dto.device !== undefined) js.device = dto.device || null;
      if (dto.deviceDisplayName !== undefined) js.deviceDisplayName = dto.deviceDisplayName || null;
      if (dto.problemReported !== undefined) js.problemReported = dto.problemReported || null;
      if (dto.conditionOnReceive !== undefined) js.conditionOnReceive = dto.conditionOnReceive || null;
      if (dto.accessories !== undefined) js.accessories = dto.accessories || null;
      if (dto.estimatedCost !== undefined) js.estimatedCost = dto.estimatedCost ?? null;
      if (dto.estimatedDeliveryDate !== undefined) {
        js.estimatedDeliveryDate = dto.estimatedDeliveryDate
          ? new Date(dto.estimatedDeliveryDate)
          : null;
      }
      if (dto.assignedTechnicianId !== undefined) js.assignedTechnicianId = dto.assignedTechnicianId ?? null;
      if (dto.workDone !== undefined) js.workDone = dto.workDone || null;
      if (dto.status !== undefined) js.status = dto.status;
      if (dto.receivedDate !== undefined) {
        js.receivedDate = dto.receivedDate ? new Date(dto.receivedDate) : null;
      }
      if (dto.completedDate !== undefined) {
        js.completedDate = dto.completedDate ? new Date(dto.completedDate) : null;
      }
      if (dto.deliveredDate !== undefined) {
        js.deliveredDate = dto.deliveredDate ? new Date(dto.deliveredDate) : null;
      }
      if (dto.notes !== undefined) js.notes = dto.notes || null;

      if (dto.items && dto.items.length > 0) {
        await queryRunner.manager.delete(JobSheetItem, { jobSheetId: id });

        const items = dto.items.map((item) => {
          const qty = item.quantity || 1;
          const cost = item.unitCost || 0;
          return this.jobSheetItemRepository.create({
            jobSheetId: id,
            partName: item.partName,
            quantity: qty,
            unitCost: cost,
            total: Math.round(qty * cost * 100) / 100,
          });
        });
        await queryRunner.manager.save(JobSheetItem, items);
      }

      await queryRunner.manager.save(JobSheet, js);
      await queryRunner.commitTransaction();

      const updated = await this.jobSheetRepository.findOne({
        where: { id },
        relations: ['items'],
      });

      return {
        success: true,
        message: 'Job sheet updated successfully',
        data: updated,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const js = await this.jobSheetRepository.findOne({ where: { id } });

    if (!js) {
      throw new NotFoundException(`Job sheet with ID ${id} not found`);
    }

    await this.jobSheetRepository.remove(js);

    return {
      success: true,
      message: 'Job sheet deleted successfully',
    };
  }

  async findByServiceRequestId(serviceRequestId: number) {
    const data = await this.jobSheetRepository.find({
      where: { serviceRequestId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Job sheets fetched successfully',
      count: data.length,
      data,
    };
  }

  async getNextJobSheetNumber() {
    const num = await this.generateJobSheetNumber();
    return {
      success: true,
      data: { jobSheetNumber: num },
    };
  }
}

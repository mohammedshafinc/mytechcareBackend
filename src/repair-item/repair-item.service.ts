import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepairItem } from './repair-item.entity';

@Injectable()
export class RepairItemService {
  constructor(
    @InjectRepository(RepairItem)
    private repairItemRepository: Repository<RepairItem>,
  ) {}

  async findAll() {
    const repairItems = await this.repairItemRepository.find({
      order: { id: 'ASC' },
    });

    return {
      success: true,
      message: 'Repair items fetched successfully',
      count: repairItems.length,
      data: repairItems,
    };
  }
}

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

const STORE_CODE_PREFIX = 'MTCSA';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {}

  /**
   * Returns the next available store code for the form.
   * If no stores exist: MTCSA01. Otherwise: max existing number + 1 (e.g. MTCSA02).
   */
  async getNextStoreCode(): Promise<{ success: boolean; storeCode: string }> {
    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .select('store.storeCode')
      .where('store.storeCode LIKE :prefix', { prefix: `${STORE_CODE_PREFIX}%` })
      .getMany();

    let nextNum = 1;
    for (const s of stores) {
      const match = s.storeCode.match(new RegExp(`^${STORE_CODE_PREFIX}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    }

    const storeCode = `${STORE_CODE_PREFIX}${String(nextNum).padStart(2, '0')}`;
    return { success: true, storeCode };
  }

  async findAll() {
    const stores = await this.storeRepository.find({
      order: { createdAt: 'DESC' },
    });
    return {
      success: true,
      message: 'Stores fetched successfully',
      count: stores.length,
      data: stores,
    };
  }

  async create(createStoreDto: CreateStoreDto) {
    const existing = await this.storeRepository.findOne({
      where: { storeCode: createStoreDto.storeCode },
    });
    if (existing) {
      throw new ConflictException(`Store code "${createStoreDto.storeCode}" is already in use.`);
    }

    const store = this.storeRepository.create({
      storeName: createStoreDto.storeName,
      storeCode: createStoreDto.storeCode,
      storeLocation: createStoreDto.storeLocation,
      companyRegistrationNumber: createStoreDto.companyRegistrationNumber ?? null,
      expiryDate: createStoreDto.expiryDate ? new Date(createStoreDto.expiryDate) : null,
    });

    const saved = await this.storeRepository.save(store);
    return {
      success: true,
      message: 'Store created successfully',
      data: {
        id: saved.id,
        storeName: saved.storeName,
        storeCode: saved.storeCode,
        storeLocation: saved.storeLocation,
        companyRegistrationNumber: saved.companyRegistrationNumber,
        expiryDate: saved.expiryDate,
        createdAt: saved.createdAt,
      },
    };
  }

  async update(id: number, updateStoreDto: UpdateStoreDto) {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (updateStoreDto.storeCode && updateStoreDto.storeCode !== store.storeCode) {
      const existing = await this.storeRepository.findOne({
        where: { storeCode: updateStoreDto.storeCode },
      });
      if (existing) {
        throw new ConflictException(`Store code "${updateStoreDto.storeCode}" is already in use.`);
      }
    }
    Object.assign(store, updateStoreDto);
    if (updateStoreDto.expiryDate !== undefined) store.expiryDate = updateStoreDto.expiryDate ? new Date(updateStoreDto.expiryDate) : null;
    if (updateStoreDto.companyRegistrationNumber !== undefined) store.companyRegistrationNumber = updateStoreDto.companyRegistrationNumber ?? null;
    const updated = await this.storeRepository.save(store);
    return {
      success: true,
      message: 'Store updated successfully',
      data: {
        id: updated.id,
        storeName: updated.storeName,
        storeCode: updated.storeCode,
        storeLocation: updated.storeLocation,
        companyRegistrationNumber: updated.companyRegistrationNumber,
        expiryDate: updated.expiryDate,
        createdAt: updated.createdAt,
      },
    };
  }

  async remove(id: number) {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    await this.storeRepository.remove(store);
    return { success: true, message: 'Store deleted successfully' };
  }
}

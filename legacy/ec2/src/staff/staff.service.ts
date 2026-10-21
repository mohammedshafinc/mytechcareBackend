import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Staff } from './staff.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const EMP_CODE_PREFIX = 'MTC';
const EMP_CODE_START = 100;
const EMP_CODE_PAD = 4;

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
  ) {}

  /**
   * Returns the next available emp code. First: MTC0100, then MTC0101, MTC0102, etc.
   */
  async getNextEmpCode(): Promise<{ success: boolean; empCode: string }> {
    const staffList = await this.staffRepository
      .createQueryBuilder('staff')
      .select('staff.empCode')
      .where('staff.empCode LIKE :prefix', { prefix: `${EMP_CODE_PREFIX}%` })
      .getMany();

    let nextNum = EMP_CODE_START;
    const regex = new RegExp(`^${EMP_CODE_PREFIX}(\\d+)$`);
    for (const s of staffList) {
      const match = s.empCode.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    }

    const empCode = `${EMP_CODE_PREFIX}${String(nextNum).padStart(EMP_CODE_PAD, '0')}`;
    return { success: true, empCode };
  }

  async findAll() {
    const staff = await this.staffRepository.find({
      relations: ['store'],
      order: { createdAt: 'DESC' },
    });
    return {
      success: true,
      message: 'Staff fetched successfully',
      count: staff.length,
      data: staff,
    };
  }

  /**
   * Find all staff for a given store code (from FE).
   */
  async findByStoreCode(storeCode: string) {
    const staff = await this.staffRepository.find({
      where: { store: { storeCode: storeCode.trim() } },
      relations: ['store'],
      order: { createdAt: 'DESC' },
    });
    return {
      success: true,
      message: 'Staff fetched by store code',
      count: staff.length,
      data: staff,
    };
  }

  async create(createStaffDto: CreateStaffDto) {
    const existing = await this.staffRepository.findOne({
      where: { empCode: createStaffDto.empCode },
    });
    if (existing) {
      throw new ConflictException(`Employee code "${createStaffDto.empCode}" is already in use.`);
    }

    const staff = this.staffRepository.create({
      empCode: createStaffDto.empCode,
      name: createStaffDto.name,
      storeId: createStaffDto.storeId,
      iqamaId: createStaffDto.iqamaId ?? null,
      iqamaExpiryDate: createStaffDto.iqamaExpiryDate ? new Date(createStaffDto.iqamaExpiryDate) : null,
      position: createStaffDto.position ?? null,
      department: createStaffDto.department ?? null,
      passportNumber: createStaffDto.passportNumber ?? null,
      passportExpiryDate: createStaffDto.passportExpiryDate ? new Date(createStaffDto.passportExpiryDate) : null,
    });

    const saved = await this.staffRepository.save(staff);
    const withStore = await this.staffRepository.findOne({
      where: { id: saved.id },
      relations: ['store'],
    });

    return {
      success: true,
      message: 'Staff created successfully',
      data: withStore ?? saved,
    };
  }

  async update(id: number, updateStaffDto: UpdateStaffDto) {
    const staff = await this.staffRepository.findOne({ where: { id } });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    Object.assign(staff, updateStaffDto);
    if (updateStaffDto.iqamaExpiryDate !== undefined) staff.iqamaExpiryDate = updateStaffDto.iqamaExpiryDate ? new Date(updateStaffDto.iqamaExpiryDate) : null;
    if (updateStaffDto.passportExpiryDate !== undefined) staff.passportExpiryDate = updateStaffDto.passportExpiryDate ? new Date(updateStaffDto.passportExpiryDate) : null;
    const updated = await this.staffRepository.save(staff);
    const withStore = await this.staffRepository.findOne({
      where: { id: updated.id },
      relations: ['store'],
    });
    return {
      success: true,
      message: 'Staff updated successfully',
      data: withStore ?? updated,
    };
  }

  async remove(id: number) {
    const staff = await this.staffRepository.findOne({ where: { id } });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    await this.staffRepository.remove(staff);
    return { success: true, message: 'Staff deleted successfully' };
  }

  /**
   * Returns staff whose passport or iqama expiry dates are
   * already expired OR expiring within the given number of days.
   */
  async getExpiryAlerts(daysThreshold = 30) {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + daysThreshold);

    // Format as YYYY-MM-DD for date comparison
    const todayStr = today.toISOString().split('T')[0];
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    const staffList = await this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.store', 'store')
      .where(
        '(staff.passportExpiryDate IS NOT NULL AND staff.passportExpiryDate <= :threshold)',
        { threshold: thresholdStr },
      )
      .orWhere(
        '(staff.iqamaExpiryDate IS NOT NULL AND staff.iqamaExpiryDate <= :threshold)',
        { threshold: thresholdStr },
      )
      .orderBy('staff.passportExpiryDate', 'ASC')
      .addOrderBy('staff.iqamaExpiryDate', 'ASC')
      .getMany();

    const alerts = staffList.map((s) => {
      const notifications: Array<{
        type: string;
        field: string;
        expiryDate: string;
        status: 'expired' | 'expiring_soon';
        daysRemaining: number;
      }> = [];

      if (s.passportExpiryDate) {
        const expiry = new Date(s.passportExpiryDate);
        const diffMs = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= daysThreshold) {
          notifications.push({
            type: diffDays <= 0 ? 'expired' : 'expiring_soon',
            field: 'passportExpiryDate',
            expiryDate: expiry.toISOString().split('T')[0],
            status: diffDays <= 0 ? 'expired' : 'expiring_soon',
            daysRemaining: diffDays,
          });
        }
      }

      if (s.iqamaExpiryDate) {
        const expiry = new Date(s.iqamaExpiryDate);
        const diffMs = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= daysThreshold) {
          notifications.push({
            type: diffDays <= 0 ? 'expired' : 'expiring_soon',
            field: 'iqamaExpiryDate',
            expiryDate: expiry.toISOString().split('T')[0],
            status: diffDays <= 0 ? 'expired' : 'expiring_soon',
            daysRemaining: diffDays,
          });
        }
      }

      return {
        staffId: s.id,
        empCode: s.empCode,
        name: s.name,
        storeName: s.store?.storeCode ?? null,
        notifications,
      };
    }).filter((a) => a.notifications.length > 0);

    return {
      success: true,
      message: 'Expiry alerts fetched successfully',
      count: alerts.length,
      data: alerts,
    };
  }
}

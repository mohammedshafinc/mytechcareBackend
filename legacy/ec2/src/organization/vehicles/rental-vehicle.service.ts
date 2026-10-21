import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RentalVehicle, RentalVehicleStatus, RentalPaymentStatus } from './rental-vehicle.entity';
import { Store } from '../../store/store.entity';
import { Admin } from '../../user/admin.entity';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';

export type RequestUser = {
  sub: number;
  email?: string;
  role?: string;
  modules?: string[];
};

@Injectable()
export class RentalVehicleService {
  constructor(
    @InjectRepository(RentalVehicle)
    private rentalVehicleRepository: Repository<RentalVehicle>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  private async getAccessibleStoreIds(user: RequestUser): Promise<number[] | null> {
    if (user.role === 'SUPER_ADMIN') return null;
    const admin = await this.adminRepository.findOne({
      where: { id: user.sub },
      select: ['storeId'],
    });
    if (admin?.storeId) return [admin.storeId];
    return [];
  }

  private async assertStoreAccess(storeId: number, user: RequestUser): Promise<void> {
    const allowed = await this.getAccessibleStoreIds(user);
    if (allowed === null) return;
    if (!allowed.includes(storeId)) {
      throw new ForbiddenException('Access denied: you do not have access to this store');
    }
  }

  private calculateTotalCost(dailyRate: number, startDate: Date, endDate: Date): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1);
    return Math.round(dailyRate * days * 100) / 100;
  }

  async create(dto: CreateRentalVehicleDto, user: RequestUser) {
    await this.assertStoreAccess(dto.storeId, user);

    const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
    if (!store) {
      throw new BadRequestException('Store does not exist');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const totalCost = dto.totalCost ?? this.calculateTotalCost(dto.dailyRate, startDate, endDate);

    const rental = this.rentalVehicleRepository.create({
      vehicleNumber: dto.vehicleNumber,
      model: dto.model,
      fuelType: dto.fuelType,
      rentalCompany: dto.rentalCompany,
      rentalCompanyContact: dto.rentalCompanyContact || null,
      contractNumber: dto.contractNumber || null,
      startDate,
      endDate,
      dailyRate: dto.dailyRate,
      totalCost,
      depositAmount: dto.depositAmount ?? 0,
      paymentStatus: dto.paymentStatus ?? RentalPaymentStatus.PENDING,
      storeId: dto.storeId,
      assignedStaffId: dto.assignedStaffId ?? null,
      odometerStart: dto.odometerStart ?? null,
      status: RentalVehicleStatus.ACTIVE,
      notes: dto.notes || null,
    });

    const saved = await this.rentalVehicleRepository.save(rental);
    return {
      success: true,
      message: 'Rental vehicle created successfully',
      data: saved,
    };
  }

  async findAll(user: RequestUser) {
    const allowed = await this.getAccessibleStoreIds(user);

    const qb = this.rentalVehicleRepository
      .createQueryBuilder('rv')
      .leftJoinAndSelect('rv.store', 'store')
      .leftJoinAndSelect('rv.assignedStaff', 'staff')
      .where('rv.deleted_at IS NULL')
      .orderBy('rv.created_at', 'DESC');

    if (allowed !== null && allowed.length > 0) {
      qb.andWhere('rv.store_id IN (:...storeIds)', { storeIds: allowed });
    } else if (allowed !== null) {
      return { success: true, message: 'Rental vehicles fetched successfully', count: 0, data: [] };
    }

    const rentals = await qb.getMany();
    return {
      success: true,
      message: 'Rental vehicles fetched successfully',
      count: rentals.length,
      data: rentals,
    };
  }

  async findOne(id: number, user: RequestUser) {
    const rental = await this.rentalVehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['store', 'assignedStaff'],
    });

    if (!rental) throw new NotFoundException('Rental vehicle not found');
    await this.assertStoreAccess(rental.storeId, user);

    return { success: true, message: 'Rental vehicle fetched successfully', data: rental };
  }

  async update(id: number, dto: UpdateRentalVehicleDto, user: RequestUser) {
    const rental = await this.rentalVehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!rental) throw new NotFoundException('Rental vehicle not found');
    await this.assertStoreAccess(rental.storeId, user);

    if (dto.storeId !== undefined) {
      await this.assertStoreAccess(dto.storeId, user);
      const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
      if (!store) throw new BadRequestException('Store does not exist');
      rental.storeId = dto.storeId;
    }

    if (dto.vehicleNumber !== undefined) rental.vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
    if (dto.model !== undefined) rental.model = dto.model;
    if (dto.fuelType !== undefined) rental.fuelType = dto.fuelType;
    if (dto.rentalCompany !== undefined) rental.rentalCompany = dto.rentalCompany;
    if (dto.rentalCompanyContact !== undefined) rental.rentalCompanyContact = dto.rentalCompanyContact || null;
    if (dto.contractNumber !== undefined) rental.contractNumber = dto.contractNumber || null;
    if (dto.startDate !== undefined) rental.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) rental.endDate = new Date(dto.endDate);
    if (dto.actualReturnDate !== undefined) rental.actualReturnDate = new Date(dto.actualReturnDate);
    if (dto.dailyRate !== undefined) rental.dailyRate = dto.dailyRate;
    if (dto.totalCost !== undefined) rental.totalCost = dto.totalCost;
    if (dto.depositAmount !== undefined) rental.depositAmount = dto.depositAmount;
    if (dto.paymentStatus !== undefined) rental.paymentStatus = dto.paymentStatus;
    if (dto.assignedStaffId !== undefined) rental.assignedStaffId = dto.assignedStaffId;
    if (dto.odometerStart !== undefined) rental.odometerStart = dto.odometerStart;
    if (dto.odometerReturn !== undefined) rental.odometerReturn = dto.odometerReturn;
    if (dto.status !== undefined) rental.status = dto.status;
    if (dto.notes !== undefined) rental.notes = dto.notes || null;

    // Auto-recalculate total cost if daily rate or dates changed and totalCost not explicitly set
    if (dto.totalCost === undefined && (dto.dailyRate !== undefined || dto.startDate !== undefined || dto.endDate !== undefined)) {
      rental.totalCost = this.calculateTotalCost(rental.dailyRate, rental.startDate, rental.endDate);
    }

    const updated = await this.rentalVehicleRepository.save(rental);
    return { success: true, message: 'Rental vehicle updated successfully', data: updated };
  }

  async remove(id: number, user: RequestUser) {
    const rental = await this.rentalVehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!rental) throw new NotFoundException('Rental vehicle not found');
    await this.assertStoreAccess(rental.storeId, user);

    rental.deletedAt = new Date();
    rental.status = RentalVehicleStatus.CANCELLED;
    await this.rentalVehicleRepository.save(rental);

    return { success: true, message: 'Rental vehicle deleted successfully' };
  }

  async markReturned(id: number, dto: { actualReturnDate?: string; odometerReturn?: number }, user: RequestUser) {
    const rental = await this.rentalVehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!rental) throw new NotFoundException('Rental vehicle not found');
    await this.assertStoreAccess(rental.storeId, user);

    if (rental.status === RentalVehicleStatus.RETURNED) {
      throw new BadRequestException('Vehicle is already marked as returned');
    }

    rental.actualReturnDate = dto.actualReturnDate ? new Date(dto.actualReturnDate) : new Date();
    if (dto.odometerReturn !== undefined) rental.odometerReturn = dto.odometerReturn;
    rental.status = RentalVehicleStatus.RETURNED;

    // Recalculate total cost based on actual days
    // DB may return dates as strings, so ensure we have Date objects
    const startDate = new Date(rental.startDate);
    const actualReturnDate = rental.actualReturnDate;
    const actualDays = Math.max(
      Math.ceil((actualReturnDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      1,
    );
    rental.totalCost = Math.round(rental.dailyRate * actualDays * 100) / 100;

    const updated = await this.rentalVehicleRepository.save(rental);
    return { success: true, message: 'Rental vehicle marked as returned', data: updated };
  }
}

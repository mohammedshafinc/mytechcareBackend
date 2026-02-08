import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Vehicle, VehicleStatus } from './vehicle.entity';
import { VehicleExpense } from './vehicle-expense.entity';
import { Store } from '../../store/store.entity';
import { Admin } from '../../user/admin.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleExpenseDto } from './dto/create-vehicle-expense.dto';
import { UpdateVehicleExpenseDto } from './dto/update-vehicle-expense.dto';

export type RequestUser = {
  sub: number;
  email?: string;
  role?: string;
  modules?: string[];
};

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleExpense)
    private expenseRepository: Repository<VehicleExpense>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  /** Get store IDs the user can access. SUPER_ADMIN: all. Store manager: only their store. */
  private async getAccessibleStoreIds(user: RequestUser): Promise<number[] | null> {
    if (user.role === 'SUPER_ADMIN') {
      return null; // null = all stores
    }
    const admin = await this.adminRepository.findOne({
      where: { id: user.sub },
      select: ['storeId'],
    });
    if (admin?.storeId) {
      return [admin.storeId];
    }
    return []; // No store = no access
  }

  /** Ensure user can access the given store. Throws ForbiddenException if not. */
  private async assertStoreAccess(storeId: number, user: RequestUser): Promise<void> {
    const allowed = await this.getAccessibleStoreIds(user);
    if (allowed === null) return; // SUPER_ADMIN
    if (!allowed.includes(storeId)) {
      throw new ForbiddenException('Access denied: you do not have access to this store');
    }
  }

  async create(dto: CreateVehicleDto, user: RequestUser) {
    await this.assertStoreAccess(dto.storeId, user);

    const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
    if (!store) {
      throw new BadRequestException('Store does not exist');
    }

    const vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
    const existing = await this.vehicleRepository.findOne({
      where: { vehicleNumber },
      withDeleted: true,
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`Vehicle number "${vehicleNumber}" is already in use`);
    }

    const vehicle = this.vehicleRepository.create({
      vehicleNumber,
      model: dto.model,
      fuelType: dto.fuelType,
      storeId: dto.storeId,
      authorizedStaffId: dto.authorizedStaffId ?? null,
      status: VehicleStatus.ACTIVE,
    });

    const saved = await this.vehicleRepository.save(vehicle);
    return {
      success: true,
      message: 'Vehicle created successfully',
      data: saved,
    };
  }

  async findAll(user: RequestUser) {
    const allowed = await this.getAccessibleStoreIds(user);

    const qb = this.vehicleRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.store', 'store')
      .leftJoinAndSelect('v.authorizedStaff', 'staff')
      .where('v.deleted_at IS NULL')
      .orderBy('v.created_at', 'DESC');

    if (allowed !== null && allowed.length > 0) {
      qb.andWhere('v.store_id IN (:...storeIds)', { storeIds: allowed });
    } else if (allowed !== null) {
      return {
        success: true,
        message: 'Vehicles fetched successfully',
        count: 0,
        data: [],
      };
    }

    const vehicles = await qb.getMany();
    return {
      success: true,
      message: 'Vehicles fetched successfully',
      count: vehicles.length,
      data: vehicles,
    };
  }

  async findOne(id: number, user: RequestUser) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['store', 'authorizedStaff'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.assertStoreAccess(vehicle.storeId, user);

    return {
      success: true,
      message: 'Vehicle fetched successfully',
      data: vehicle,
    };
  }

  async update(id: number, dto: UpdateVehicleDto, user: RequestUser) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.assertStoreAccess(vehicle.storeId, user);

    if (dto.storeId !== undefined) {
      await this.assertStoreAccess(dto.storeId, user);
      const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
      if (!store) {
        throw new BadRequestException('Store does not exist');
      }
      vehicle.storeId = dto.storeId;
    }

    if (dto.vehicleNumber !== undefined) {
      const vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
      const existing = await this.vehicleRepository.findOne({
        where: { vehicleNumber },
        withDeleted: true,
      });
      if (existing && existing.id !== id && !existing.deletedAt) {
        throw new ConflictException(`Vehicle number "${vehicleNumber}" is already in use`);
      }
      vehicle.vehicleNumber = vehicleNumber;
    }

    if (dto.model !== undefined) vehicle.model = dto.model;
    if (dto.fuelType !== undefined) vehicle.fuelType = dto.fuelType;
    if (dto.authorizedStaffId !== undefined) vehicle.authorizedStaffId = dto.authorizedStaffId;
    if (dto.status !== undefined) vehicle.status = dto.status;

    const updated = await this.vehicleRepository.save(vehicle);
    return {
      success: true,
      message: 'Vehicle updated successfully',
      data: updated,
    };
  }

  async remove(id: number, user: RequestUser) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.assertStoreAccess(vehicle.storeId, user);

    vehicle.deletedAt = new Date();
    vehicle.status = VehicleStatus.INACTIVE;
    await this.vehicleRepository.save(vehicle);

    return {
      success: true,
      message: 'Vehicle soft deleted successfully',
    };
  }

  // --- Vehicle Expenses ---

  private parseDate(dateStr: string): Date {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      throw new BadRequestException('Invalid expense date');
    }
    return d;
  }

  async createExpense(
    vehicleId: number,
    dto: CreateVehicleExpenseDto,
    user: RequestUser,
  ) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, deletedAt: IsNull() },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.assertStoreAccess(vehicle.storeId, user);

    if (vehicle.status !== VehicleStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE vehicles can receive expenses');
    }

    if (dto.storeId !== vehicle.storeId) {
      throw new BadRequestException('store_id must match the vehicle\'s store');
    }

    const expenseDate = this.parseDate(dto.expenseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (expenseDate > today) {
      throw new BadRequestException('expense_date must be <= today');
    }

    const expense = this.expenseRepository.create({
      vehicleId,
      storeId: dto.storeId,
      expenseType: dto.expenseType,
      amount: dto.amount,
      expenseDate,
      description: dto.description ?? null,
      addedBy: user.sub,
    });

    const saved = await this.expenseRepository.save(expense);
    return {
      success: true,
      message: 'Expense added successfully',
      data: saved,
    };
  }

  async findExpenses(vehicleId: number, user: RequestUser) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, deletedAt: IsNull() },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.assertStoreAccess(vehicle.storeId, user);

    const expenses = await this.expenseRepository.find({
      where: { vehicleId, deletedAt: IsNull() },
      relations: ['addedByUser'],
      order: { expenseDate: 'DESC', createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Expenses fetched successfully',
      count: expenses.length,
      data: expenses,
    };
  }

  async updateExpense(
    expenseId: number,
    dto: UpdateVehicleExpenseDto,
    user: RequestUser,
  ) {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, deletedAt: IsNull() },
      relations: ['vehicle'],
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.assertStoreAccess(expense.storeId, user);

    if (dto.expenseDate !== undefined) {
      const expenseDate = this.parseDate(dto.expenseDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (expenseDate > today) {
        throw new BadRequestException('expense_date must be <= today');
      }
      expense.expenseDate = expenseDate;
    }

    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.expenseType !== undefined) expense.expenseType = dto.expenseType;
    if (dto.description !== undefined) expense.description = dto.description;

    const updated = await this.expenseRepository.save(expense);
    return {
      success: true,
      message: 'Expense updated successfully',
      data: updated,
    };
  }

  async removeExpense(expenseId: number, user: RequestUser) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete expenses');
    }

    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Soft delete - never hard delete
    expense.deletedAt = new Date();
    await this.expenseRepository.save(expense);

    return {
      success: true,
      message: 'Expense soft deleted successfully',
    };
  }

  /** Vehicles report: summary, expenses by type, per-store and per-vehicle breakdown. */
  async getVehiclesReport(
    user: RequestUser,
    startDate?: string,
    endDate?: string,
  ) {
    const allowed = await this.getAccessibleStoreIds(user);

    const vehicleQb = this.vehicleRepository
      .createQueryBuilder('v')
      .where('v.deleted_at IS NULL');

    if (allowed !== null && allowed.length > 0) {
      vehicleQb.andWhere('v.store_id IN (:...storeIds)', { storeIds: allowed });
    } else if (allowed !== null) {
      return {
        success: true,
        message: 'Vehicles report retrieved successfully',
        data: {
          summary: { total: 0, active: 0, inactive: 0 },
          expenses: { total: 0, byType: {}, byStore: [], byVehicle: [] },
          dateRange: { startDate: startDate || null, endDate: endDate || null },
        },
      };
    }

    const vehicles = await vehicleQb
      .leftJoinAndSelect('v.store', 'store')
      .orderBy('v.created_at', 'DESC')
      .getMany();

    const summary = {
      total: vehicles.length,
      active: vehicles.filter((v) => v.status === VehicleStatus.ACTIVE).length,
      inactive: vehicles.filter((v) => v.status === VehicleStatus.INACTIVE).length,
    };

    const { start, end } = this.buildExpenseDateRange(startDate, endDate);
    const storeIds =
      allowed === null
        ? [...new Set(vehicles.map((v) => v.storeId))]
        : allowed;

    if (storeIds.length === 0) {
      return {
        success: true,
        message: 'Vehicles report retrieved successfully',
        data: {
          summary,
          expenses: {
            total: 0,
            byType: {},
            byStore: [],
            byVehicle: [],
          },
          dateRange: { startDate: startDate || null, endDate: endDate || null },
        },
      };
    }

    const expenseQb = this.expenseRepository
      .createQueryBuilder('e')
      .where('e.deleted_at IS NULL')
      .andWhere('e.store_id IN (:...storeIds)', { storeIds });

    if (start || end) {
      const rangeStart = start || new Date('1970-01-01');
      const rangeEnd = end || new Date();
      expenseQb.andWhere('e.expense_date BETWEEN :rangeStart AND :rangeEnd', {
        rangeStart,
        rangeEnd,
      });
    }

    const expenses = await expenseQb.getMany();

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const byType: Record<string, number> = {};
    for (const e of expenses) {
      byType[e.expenseType] = (byType[e.expenseType] || 0) + Number(e.amount);
    }

    const byStoreMap: Record<number, { storeId: number; storeCode?: string; total: number }> = {};
    for (const e of expenses) {
      if (!byStoreMap[e.storeId]) {
        const store = vehicles.find((v) => v.storeId === e.storeId)?.store;
        byStoreMap[e.storeId] = {
          storeId: e.storeId,
          storeCode: store?.storeCode,
          total: 0,
        };
      }
      byStoreMap[e.storeId].total += Number(e.amount);
    }
    const byStore = Object.values(byStoreMap).map((s) => ({
      ...s,
      total: Number(s.total.toFixed(2)),
    }));

    const byVehicleMap: Record<number, { vehicleId: number; vehicleNumber?: string; model?: string; total: number }> = {};
    for (const e of expenses) {
      if (!byVehicleMap[e.vehicleId]) {
        const vehicle = vehicles.find((v) => v.id === e.vehicleId);
        byVehicleMap[e.vehicleId] = {
          vehicleId: e.vehicleId,
          vehicleNumber: vehicle?.vehicleNumber,
          model: vehicle?.model,
          total: 0,
        };
      }
      byVehicleMap[e.vehicleId].total += Number(e.amount);
    }
    const byVehicle = Object.values(byVehicleMap)
      .map((v) => ({ ...v, total: Number(v.total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);

    return {
      success: true,
      message: 'Vehicles report retrieved successfully',
      data: {
        summary,
        expenses: {
          total: Number(totalExpense.toFixed(2)),
          byType: Object.fromEntries(
            Object.entries(byType).map(([k, v]) => [k, Number(Number(v).toFixed(2))]),
          ),
          byStore,
          byVehicle,
        },
        dateRange: { startDate: startDate || null, endDate: endDate || null },
      },
    };
  }

  private buildExpenseDateRange(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

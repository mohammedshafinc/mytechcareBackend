import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Store } from '../../store/store.entity';
import { Admin } from '../../user/admin.entity';

export enum VehicleExpenseType {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

@Entity('vehicle_expenses')
export class VehicleExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_id', type: 'int' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.expenses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'store_id', type: 'int' })
  storeId: number;

  @ManyToOne(() => Store, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'expense_type', type: 'varchar', length: 20 })
  expenseType: VehicleExpenseType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'added_by', type: 'int', nullable: true })
  addedBy: number | null;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'added_by' })
  addedByUser: Admin | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}

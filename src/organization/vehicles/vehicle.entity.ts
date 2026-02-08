import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Store } from '../../store/store.entity';
import { Staff } from '../../staff/staff.entity';
import { VehicleExpense } from './vehicle-expense.entity';

export enum VehicleFuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 50 })
  vehicleNumber: string;

  @Column({ type: 'varchar', length: 255 })
  model: string;

  @Column({ name: 'fuel_type', type: 'varchar', length: 20 })
  fuelType: VehicleFuelType;

  @Column({ name: 'store_id', type: 'int' })
  storeId: number;

  @ManyToOne(() => Store, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'authorized_staff_id', type: 'int', nullable: true })
  authorizedStaffId: number | null;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'authorized_staff_id' })
  authorizedStaff: Staff | null;

  @Column({ type: 'varchar', length: 20, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => VehicleExpense, (expense) => expense.vehicle)
  expenses: VehicleExpense[];
}

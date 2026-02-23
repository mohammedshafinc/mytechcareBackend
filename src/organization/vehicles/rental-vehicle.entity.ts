import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from '../../store/store.entity';
import { Staff } from '../../staff/staff.entity';

export enum RentalVehicleStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum RentalPaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  PENDING = 'PENDING',
}

@Entity('rental_vehicles')
export class RentalVehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 50 })
  vehicleNumber: string;

  @Column({ type: 'varchar', length: 255 })
  model: string;

  @Column({ name: 'fuel_type', type: 'varchar', length: 20 })
  fuelType: string;

  // Rental company info
  @Column({ name: 'rental_company', type: 'varchar', length: 255 })
  rentalCompany: string;

  @Column({ name: 'rental_company_contact', type: 'varchar', length: 100, nullable: true })
  rentalCompanyContact: string | null;

  @Column({ name: 'contract_number', type: 'varchar', length: 100, nullable: true })
  contractNumber: string | null;

  // Rental period
  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'actual_return_date', type: 'date', nullable: true })
  actualReturnDate: Date | null;

  // Financial
  @Column({ name: 'daily_rate', type: 'decimal', precision: 10, scale: 2 })
  dailyRate: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: RentalPaymentStatus.PENDING })
  paymentStatus: RentalPaymentStatus;

  // Assignment
  @Column({ name: 'store_id', type: 'int' })
  storeId: number;

  @ManyToOne(() => Store, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'assigned_staff_id', type: 'int', nullable: true })
  assignedStaffId: number | null;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff: Staff | null;

  // Odometer tracking
  @Column({ name: 'odometer_start', type: 'decimal', precision: 10, scale: 1, nullable: true })
  odometerStart: number | null;

  @Column({ name: 'odometer_return', type: 'decimal', precision: 10, scale: 1, nullable: true })
  odometerReturn: number | null;

  @Column({ type: 'varchar', length: 20, default: RentalVehicleStatus.ACTIVE })
  status: RentalVehicleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { JobSheetItem } from './job-sheet-item.entity';

@Entity('job_sheets')
export class JobSheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_sheet_number', type: 'varchar', length: 50, unique: true })
  jobSheetNumber: string;

  @Column({ name: 'service_request_id', type: 'int', nullable: true })
  serviceRequestId: number | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customer_mobile', type: 'varchar', length: 50, nullable: true })
  customerMobile: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device: string | null;

  @Column({ name: 'device_display_name', type: 'varchar', length: 255, nullable: true })
  deviceDisplayName: string | null;

  @Column({ name: 'problem_reported', type: 'text', nullable: true })
  problemReported: string | null;

  @Column({ name: 'condition_on_receive', type: 'text', nullable: true })
  conditionOnReceive: string | null;

  @Column({ type: 'text', nullable: true })
  accessories: string | null;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedCost: number | null;

  @Column({ name: 'estimated_delivery_date', type: 'date', nullable: true })
  estimatedDeliveryDate: Date | null;

  @Column({ name: 'assigned_technician_id', type: 'int', nullable: true })
  assignedTechnicianId: number | null;

  @Column({ name: 'work_done', type: 'text', nullable: true })
  workDone: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'received',
  })
  status: string;

  @Column({ name: 'received_date', type: 'date', nullable: true })
  receivedDate: Date | null;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date | null;

  @Column({ name: 'delivered_date', type: 'date', nullable: true })
  deliveredDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => JobSheetItem, (item) => item.jobSheet, {
    cascade: true,
    eager: true,
  })
  items: JobSheetItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

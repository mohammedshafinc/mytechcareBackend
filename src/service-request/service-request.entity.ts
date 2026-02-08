import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Staff } from '../staff/staff.entity';

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  mobile: string;

  @Column()
  device: string;

  @Column({ name: 'device_display_name' })
  deviceDisplayName: string;

  @Column({ name: 'other_device', type: 'varchar', nullable: true })
  otherDevice: string | null;

  @Column({ name: 'location_type' })
  locationType: string;

  @Column()
  location: string;

  @Column({ name: 'current_location', type: 'varchar', nullable: true })
  currentLocation: string | null;

  @Column({ name: 'manual_location', type: 'varchar', nullable: true })
  manualLocation: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  language: string;

  @Column({ name: 'date_time' })
  dateTime: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ 
    name: 'status',
    type: 'varchar', 
    length: 50, 
    default: 'Request received',
    nullable: true 
  })
  status: string;

  @Column({ name: 'assigned_staff_id', type: 'int', nullable: true })
  assignedStaffId: number | null;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff: Staff | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}


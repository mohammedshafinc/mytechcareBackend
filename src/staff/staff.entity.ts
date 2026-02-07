import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from '../store/store.entity';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'emp_code', unique: true, length: 20 })
  empCode: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'store_id', type: 'int' })
  storeId: number;

  @ManyToOne(() => Store, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'iqama_id', type: 'varchar', length: 50, nullable: true })
  iqamaId: string | null;

  @Column({ name: 'iqama_expiry_date', type: 'date', nullable: true })
  iqamaExpiryDate: Date | null;

  @Column({ name: 'position', type: 'varchar', length: 100, nullable: true })
  position: string | null;

  @Column({ name: 'department', type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ name: 'passport_number', type: 'varchar', length: 50, nullable: true })
  passportNumber: string | null;

  @Column({ name: 'passport_expiry_date', type: 'date', nullable: true })
  passportExpiryDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

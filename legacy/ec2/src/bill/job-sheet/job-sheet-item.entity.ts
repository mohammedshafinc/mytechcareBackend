import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobSheet } from './job-sheet.entity';

@Entity('job_sheet_items')
export class JobSheetItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_sheet_id', type: 'int' })
  jobSheetId: number;

  @Column({ name: 'part_name', type: 'varchar', length: 255 })
  partName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @ManyToOne(() => JobSheet, (js) => js.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_sheet_id' })
  jobSheet: JobSheet;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'repair_item_id', type: 'int' })
  repairItemId: number;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2 })
  costPrice: number;

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2 })
  sellingPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('repair_items')
export class RepairItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'device_type' })
  deviceType: string;
}

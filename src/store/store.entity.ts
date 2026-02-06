import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_name' })
  storeName: string;

  @Column({ name: 'store_code', unique: true, length: 20 })
  storeCode: string;

  @Column({ name: 'store_location', type: 'varchar', length: 500 })
  storeLocation: string;

  @Column({ name: 'company_registration_number', type: 'varchar', length: 100, nullable: true })
  companyRegistrationNumber: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QuotationItem } from './quotation-item.entity';

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quotation_number', type: 'varchar', length: 50, unique: true })
  quotationNumber: string;

  @Column({ name: 'quotation_date', type: 'date' })
  quotationDate: Date;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date | null;

  // Customer Info
  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customer_mobile', type: 'varchar', length: 50, nullable: true })
  customerMobile: string | null;

  @Column({ name: 'customer_vat_number', type: 'varchar', length: 50, nullable: true })
  customerVatNumber: string | null;

  @Column({ name: 'customer_address', type: 'text', nullable: true })
  customerAddress: string | null;

  // Calculated totals
  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  vatRate: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'service_request_id', type: 'int', nullable: true })
  serviceRequestId: number | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @OneToMany(() => QuotationItem, (item) => item.quotation, {
    cascade: true,
    eager: true,
  })
  items: QuotationItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


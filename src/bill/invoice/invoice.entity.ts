import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_number', type: 'varchar', length: 50, unique: true })
  invoiceNumber: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: Date;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, default: 'Cash' })
  paymentMethod: string;

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

  @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2, default: 15.00 })
  vatRate: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Optional link to service request (null when creating directly)
  @Column({ name: 'service_request_id', type: 'int', nullable: true })
  serviceRequestId: number | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
    eager: true,
  })
  items: InvoiceItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

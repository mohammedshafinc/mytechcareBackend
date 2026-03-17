import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quotation } from './quotation.entity';

@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quotation_id', type: 'int' })
  quotationId: number;

  @Column({ name: 'sl_no', type: 'int' })
  slNo: number;

  @Column({ type: 'varchar', length: 255 })
  product: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  lineTotal: number;

  @ManyToOne(() => Quotation, (quotation) => quotation.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;
}


import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('corporate_enquiries')
export class CorporateEnquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'corporate_name' })
  corporateName: string;

  @Column({ name: 'enquired_date', type: 'date' })
  enquiredDate: Date;

  @Column({ type: 'text' })
  requirement: string;

  @Column({ name: 'additional_notes', type: 'text', nullable: true })
  additionalNotes: string | null;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true })
  mobileNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ 
    name: 'enquiry_type',
    type: 'varchar', 
    length: 50, 
    nullable: true 
  })
  enquiryType: string | null;

  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'Pending',
    nullable: true 
  })
  status: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

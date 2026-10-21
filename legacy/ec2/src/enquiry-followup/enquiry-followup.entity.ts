import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('enquiry_followups')
export class EnquiryFollowup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enquiry_id' })
  enquiryId: number;

  @Column({ name: 'enquiry_type', type: 'varchar', length: 20 })
  enquiryType: string;

  @Column({ name: 'followup_number', type: 'int' })
  followupNumber: number;

  @Column({ name: 'followup_date', type: 'date' })
  followupDate: Date;

  @Column({ name: 'followup_status', type: 'varchar', length: 50 })
  followupStatus: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

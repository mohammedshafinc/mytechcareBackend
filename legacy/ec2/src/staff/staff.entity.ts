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

  // Personal Information
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ name: 'nationality', type: 'varchar', length: 100, nullable: true })
  nationality: string | null;

  @Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ name: 'marital_status', type: 'varchar', length: 50, nullable: true })
  maritalStatus: string | null;

  @Column({ name: 'blood_group', type: 'varchar', length: 10, nullable: true })
  bloodGroup: string | null;

  // Contact Information
  @Column({ name: 'mobile_primary', type: 'varchar', length: 20, nullable: true })
  mobilePrimary: string | null;

  @Column({ name: 'mobile_secondary', type: 'varchar', length: 20, nullable: true })
  mobileSecondary: string | null;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'current_address', type: 'text', nullable: true })
  currentAddress: string | null;

  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 255, nullable: true })
  emergencyContactName: string | null;

  @Column({ name: 'emergency_contact_number', type: 'varchar', length: 20, nullable: true })
  emergencyContactNumber: string | null;

  // Employment Details
  @Column({ name: 'date_of_join', type: 'date', nullable: true })
  dateOfJoin: Date | null;

  @Column({ name: 'employment_type', type: 'varchar', length: 50, nullable: true })
  employmentType: string | null;

  @Column({ name: 'salary', type: 'decimal', precision: 10, scale: 2, nullable: true })
  salary: number | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 50, nullable: true })
  bankAccountNumber: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_iban', type: 'varchar', length: 50, nullable: true })
  bankIban: string | null;

  @Column({ name: 'working_hours_shift', type: 'varchar', length: 50, nullable: true })
  workingHoursShift: string | null;

  // Visa & Legal Documents
  @Column({ name: 'visa_number', type: 'varchar', length: 50, nullable: true })
  visaNumber: string | null;

  @Column({ name: 'visa_expiry_date', type: 'date', nullable: true })
  visaExpiryDate: Date | null;

  @Column({ name: 'sponsor_name', type: 'varchar', length: 255, nullable: true })
  sponsorName: string | null;

  @Column({ name: 'border_number', type: 'varchar', length: 50, nullable: true })
  borderNumber: string | null;

  @Column({ name: 'insurance_number', type: 'varchar', length: 50, nullable: true })
  insuranceNumber: string | null;

  @Column({ name: 'insurance_expiry_date', type: 'date', nullable: true })
  insuranceExpiryDate: Date | null;

  // Professional Information
  @Column({ name: 'qualification_education', type: 'varchar', length: 255, nullable: true })
  qualificationEducation: string | null;

  @Column({ name: 'years_of_experience', type: 'int', nullable: true })
  yearsOfExperience: number | null;

  @Column({ name: 'previous_employer', type: 'varchar', length: 255, nullable: true })
  previousEmployer: string | null;

  @Column({ name: 'previous_employer_salary', type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousEmployerSalary: number | null;

  @Column({ name: 'skills_certifications', type: 'text', nullable: true })
  skillsCertifications: string | null;

  @Column({ name: 'driving_license_number', type: 'varchar', length: 50, nullable: true })
  drivingLicenseNumber: string | null;

  @Column({ name: 'driving_license_expiry', type: 'date', nullable: true })
  drivingLicenseExpiry: Date | null;

  // System Fields
  @Column({ name: 'employee_status', type: 'varchar', length: 50, nullable: true, default: 'Active' })
  employeeStatus: string | null;

  @Column({ name: 'probation_period_end_date', type: 'date', nullable: true })
  probationPeriodEndDate: Date | null;

  @Column({ name: 'contract_end_date', type: 'date', nullable: true })
  contractEndDate: Date | null;

  @Column({ name: 'last_working_day', type: 'date', nullable: true })
  lastWorkingDay: Date | null;

  @Column({ name: 'notes_remarks', type: 'text', nullable: true })
  notesRemarks: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

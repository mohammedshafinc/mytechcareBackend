import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('user_modules')
@Unique(['userId', 'moduleCode'])
export class UserModuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'module_code', type: 'varchar', length: 50 })
  moduleCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}


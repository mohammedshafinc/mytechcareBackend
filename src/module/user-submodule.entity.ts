import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('user_submodules')
@Unique(['userId', 'submoduleCode'])
export class UserSubmoduleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'submodule_code', type: 'varchar', length: 50 })
  submoduleCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

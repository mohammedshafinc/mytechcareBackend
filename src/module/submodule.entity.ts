import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import type { SubmoduleCode } from '../auth/constants/modules.constants';
import type { ModuleCode } from '../auth/constants/modules.constants';

@Entity('submodules')
export class SubmoduleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: SubmoduleCode;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ name: 'module_code', type: 'varchar', length: 50 })
  moduleCode: ModuleCode;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

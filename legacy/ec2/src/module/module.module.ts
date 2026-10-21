import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleEntity } from './module.entity';
import { SubmoduleEntity } from './submodule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity, SubmoduleEntity])],
  exports: [TypeOrmModule],
})
export class ModuleDefinitionModule {}

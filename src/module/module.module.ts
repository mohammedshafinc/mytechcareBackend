import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleEntity } from './module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity])],
  exports: [TypeOrmModule],
})
export class ModuleDefinitionModule {}

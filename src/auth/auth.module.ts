import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../user/user.entity';
import { Admin } from '../user/admin.entity';
import { UserModuleEntity } from '../module/user-module.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ModuleGuard } from './guards/module.guard';
import { ViewOnlyGuard } from './guards/view-only.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Admin, UserModuleEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ModuleGuard, ViewOnlyGuard],
  exports: [AuthService, PassportModule, ModuleGuard, ViewOnlyGuard],
})
export class AuthModule {}

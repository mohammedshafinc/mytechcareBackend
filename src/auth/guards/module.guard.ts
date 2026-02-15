import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';
import type { ModuleCode } from '../constants/modules.constants';

export type RequestUser = {
  sub: number;
  email?: string;
  role?: string;
  modules?: string[];
  viewOnly?: boolean;
};

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.get<ModuleCode | undefined>(
      REQUIRE_MODULE_KEY,
      context.getHandler(),
    ) ?? this.reflector.get<ModuleCode | undefined>(
      REQUIRE_MODULE_KEY,
      context.getClass(),
    );

    if (requiredModule == null) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const modules: string[] =
      user.modules ?? (await this.authService.getModulesForRole(user.role ?? ''));

    if (modules.includes(requiredModule)) {
      return true;
    }

    throw new ForbiddenException(`Access to module '${requiredModule}' is not allowed`);
  }
}

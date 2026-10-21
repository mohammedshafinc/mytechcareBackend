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
import { REQUIRE_SUBMODULE_KEY } from '../decorators/require-submodule.decorator';
import type { ModuleCode, SubmoduleCode } from '../constants/modules.constants';
import { SUBMODULE_TO_MODULE } from '../constants/modules.constants';

export type RequestUser = {
  sub: number;
  email?: string;
  role?: string;
  modules?: string[];
  submodules?: string[];
  viewOnly?: boolean;
};

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule =
      this.reflector.get<ModuleCode | undefined>(
        REQUIRE_MODULE_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<ModuleCode | undefined>(
        REQUIRE_MODULE_KEY,
        context.getClass(),
      );

    const requiredSubmodule =
      this.reflector.get<SubmoduleCode | undefined>(
        REQUIRE_SUBMODULE_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<SubmoduleCode | undefined>(
        REQUIRE_SUBMODULE_KEY,
        context.getClass(),
      );

    if (requiredModule == null && requiredSubmodule == null) {
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
      user.modules ??
      (await this.authService.getModulesForRole(user.role ?? ''));

    // Check module-level access
    const effectiveModule =
      requiredModule ?? (requiredSubmodule ? SUBMODULE_TO_MODULE[requiredSubmodule] : undefined);

    if (effectiveModule && !modules.includes(effectiveModule)) {
      throw new ForbiddenException(
        `Access to module '${effectiveModule}' is not allowed`,
      );
    }

    // Check submodule-level access
    if (requiredSubmodule) {
      const submodules: string[] =
        user.submodules ??
        (await this.authService.getSubmodulesForUser(user.sub));

      if (!submodules.includes(requiredSubmodule)) {
        throw new ForbiddenException(
          `Access to submodule '${requiredSubmodule}' is not allowed`,
        );
      }
    }

    return true;
  }
}

import { SetMetadata } from '@nestjs/common';
import type { ModuleCode } from '../constants/modules.constants';

export const REQUIRE_MODULE_KEY = 'requireModule';

/**
 * Marks a route or controller as requiring access to the given module.
 * Use with ModuleGuard and AuthGuard('jwt').
 * Method-level value overrides class-level.
 */
export const RequireModule = (moduleCode: ModuleCode) =>
  SetMetadata(REQUIRE_MODULE_KEY, moduleCode);

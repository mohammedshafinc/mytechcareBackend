import { SetMetadata } from '@nestjs/common';
import type { SubmoduleCode } from '../constants/modules.constants';

export const REQUIRE_SUBMODULE_KEY = 'requireSubmodule';

/**
 * Marks a route or controller as requiring access to the given submodule.
 * Use with ModuleGuard and AuthGuard('jwt').
 * Method-level value overrides class-level.
 */
export const RequireSubmodule = (submoduleCode: SubmoduleCode) =>
  SetMetadata(REQUIRE_SUBMODULE_KEY, submoduleCode);

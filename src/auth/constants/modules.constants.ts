/**
 * Module codes – keep in sync with frontend and DB seed.
 * Single source of truth for TypeScript usage and for seeding the modules table.
 */
export const MODULE_CODES = [
  'AUTH',
  'CLIENTS',
  'ORGANIZATION',
  'REPORTS',
  'ENQUIRE',
  'DASHBOARD',
  'BILLING',
  'TOOLS'
] as const;

export type ModuleCode = (typeof MODULE_CODES)[number];

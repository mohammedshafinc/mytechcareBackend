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
  'TOOLS',
] as const;

export type ModuleCode = (typeof MODULE_CODES)[number];

/**
 * Submodule codes – keep in sync with frontend and DB seed.
 */
export const SUBMODULE_CODES = [
  'USER_MANAGEMENT',
  'MODULE_MANAGEMENT',
  'SERVICE_REQUESTS',
  'BILLS',
  'REPAIR_ITEMS',
  'INVOICES',
  'JOB_SHEETS',
  'QUOTATIONS',
  'B2C_ENQUIRY',
  'CORPORATE_ENQUIRY',
  'ENQUIRY_FOLLOWUP',
  'SALES_REPORT',
  'DASHBOARD_VIEW',
  'VEHICLES',
  'RENTAL_VEHICLES',
  'STORE_DETAILS',
  'STAFF',
] as const;

export type SubmoduleCode = (typeof SUBMODULE_CODES)[number];

/**
 * Maps each module to its child submodules.
 * A user with a module enabled can have any subset of its submodules.
 */
export const MODULE_SUBMODULES: Record<ModuleCode, readonly SubmoduleCode[]> = {
  DASHBOARD: ['DASHBOARD_VIEW'],
  AUTH: ['USER_MANAGEMENT', 'MODULE_MANAGEMENT'],
  CLIENTS: ['SERVICE_REQUESTS', 'BILLS', 'REPAIR_ITEMS'],
  BILLING: ['INVOICES', 'JOB_SHEETS', 'QUOTATIONS'],
  ORGANIZATION: ['STAFF', 'STORE_DETAILS', 'VEHICLES', 'RENTAL_VEHICLES'],
  REPORTS: ['SALES_REPORT'],
  ENQUIRE: ['B2C_ENQUIRY', 'CORPORATE_ENQUIRY', 'ENQUIRY_FOLLOWUP'],
  TOOLS: [],
};

/** Reverse lookup: submodule code -> parent module code */
export const SUBMODULE_TO_MODULE: Record<SubmoduleCode, ModuleCode> =
  Object.entries(MODULE_SUBMODULES).reduce(
    (acc, [mod, subs]) => {
      for (const sub of subs) {
        acc[sub as SubmoduleCode] = mod as ModuleCode;
      }
      return acc;
    },
    {} as Record<SubmoduleCode, ModuleCode>,
  );

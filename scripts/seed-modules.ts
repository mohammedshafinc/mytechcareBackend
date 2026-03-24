/**
 * Seeds the modules AND submodules tables from constants.
 * Run after create-modules-table.sql and create-submodule-tables.sql.
 * Requires DB_* env vars (e.g. from .env.development).
 *
 * Usage: npm run seed:modules
 * Or: node --env-file=.env.development -r ts-node/register -r tsconfig-paths/register scripts/seed-modules.ts
 */
import { DataSource } from 'typeorm';
import {
  MODULE_CODES,
  MODULE_SUBMODULES,
} from '../src/auth/constants/modules.constants';

async function seedModules() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  await dataSource.initialize();

  const moduleNames: Record<string, string> = {
    DASHBOARD: 'Dashboard',
    AUTH: 'Authentication',
    CLIENTS: 'Clients',
    BILLING: 'Invoice',
    ORGANIZATION: 'Organization',
    REPORTS: 'Reports',
    ENQUIRE: 'Enquire',
    TOOLS: 'Tools',
  };

  for (const code of MODULE_CODES) {
    await dataSource.query(
      `INSERT INTO modules (code, name) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
      [code, moduleNames[code] ?? code],
    );
  }
  console.log(
    `Seeded ${MODULE_CODES.length} module(s): ${MODULE_CODES.join(', ')}`,
  );

  // Rename old codes if they exist
  const renames: [string, string][] = [['STORES', 'STORE_DETAILS']];
  for (const [oldCode, newCode] of renames) {
    await dataSource.query(
      `UPDATE user_submodules SET submodule_code = $2 WHERE submodule_code = $1`,
      [oldCode, newCode],
    );
    await dataSource.query(
      `UPDATE submodules SET code = $2 WHERE code = $1`,
      [oldCode, newCode],
    );
  }

  const submoduleNames: Record<string, string> = {
    DASHBOARD_VIEW: 'Dashboard',
    USER_MANAGEMENT: 'Users',
    MODULE_MANAGEMENT: 'Access Control',
    SERVICE_REQUESTS: 'Requests',
    BILLS: 'Bills',
    REPAIR_ITEMS: 'Repair Items',
    INVOICES: 'Generate Invoice',
    JOB_SHEETS: 'Job Sheets',
    QUOTATIONS: 'Quotation',
    STAFF: 'Staff',
    STORE_DETAILS: 'Store Details',
    VEHICLES: 'Vehicles',
    RENTAL_VEHICLES: 'Rental Vehicles',
    SALES_REPORT: 'Sales Report',
    B2C_ENQUIRY: 'B2C Enquiry',
    CORPORATE_ENQUIRY: 'Corporate Enquiry',
    ENQUIRY_FOLLOWUP: 'Enquiry Follow-up',
  };

  let subCount = 0;
  for (const [moduleCode, subs] of Object.entries(MODULE_SUBMODULES)) {
    for (const code of subs) {
      await dataSource.query(
        `INSERT INTO submodules (code, name, module_code) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, module_code = EXCLUDED.module_code`,
        [code, submoduleNames[code] ?? code, moduleCode],
      );
      subCount++;
    }
  }
  console.log(`Seeded ${subCount} submodule(s)`);

  await dataSource.destroy();
}

seedModules().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

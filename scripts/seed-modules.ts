/**
 * Seeds the modules table from MODULE_CODES constant.
 * Run after create-modules-table.sql. Requires DB_* env vars (e.g. from .env.development).
 *
 * Usage: npm run seed:modules
 * Or: node --env-file=.env.development -r ts-node/register -r tsconfig-paths/register scripts/seed-modules.ts
 */
import { DataSource } from 'typeorm';
import { MODULE_CODES } from '../src/auth/constants/modules.constants';
import { ModuleEntity } from '../src/module/module.entity';

async function seedModules() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [ModuleEntity],
    synchronize: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();

  const repo = dataSource.getRepository(ModuleEntity);
  for (const code of MODULE_CODES) {
    await repo.upsert({ code }, { conflictPaths: ['code'] });
  }

  console.log(`Seeded ${MODULE_CODES.length} module(s): ${MODULE_CODES.join(', ')}`);
  await dataSource.destroy();
}

seedModules().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

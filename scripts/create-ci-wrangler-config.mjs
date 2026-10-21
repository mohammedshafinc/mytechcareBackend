import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../wrangler.example.jsonc', import.meta.url), 'utf8');
const output = source
  .replaceAll('REPLACE_WITH_STAGING_D1_DATABASE_ID', '00000000-0000-0000-0000-000000000000')
  .replaceAll('REPLACE_WITH_PRODUCTION_D1_DATABASE_ID', '00000000-0000-0000-0000-000000000000');
await writeFile(new URL('../.wrangler-ci.jsonc', import.meta.url), output, { mode: 0o600 });

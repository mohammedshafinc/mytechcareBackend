# MyTechCare Cloudflare Worker backend

The active backend is a Cloudflare Worker using Hono and D1. It does not start a Node server and has no runtime dependency on NestJS, TypeORM, PostgreSQL, Socket.IO, Docker, EC2, RDS, or in-process scheduling.

## Local validation

```bash
npm ci
npm run typecheck
npm run build
npm run lint
npm test -- --run
npm run config:ci
npm run db:migrate:local -- --config .wrangler-ci.jsonc --persist-to .tmp/local-d1
npm run deploy:dry-run -- --config .wrangler-ci.jsonc
```

Do not deploy `wrangler.example.jsonc`; copy it to an ignored environment config and replace placeholders there. No credentials, account IDs, D1 IDs, or default password belong in git.

## Deployment

Follow [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) in order. Start with `workers.dev`; custom DNS is a later manual step. Production browser refresh requires Vercel on a sibling custom hostname such as `app.mtechcare.com` and the Worker on `api.mtechcare.com`. A `vercel.app`-only frontend is not supported for this cookie design.

The old EC2/PostgreSQL implementation is historical only under `legacy/ec2/NOT ACTIVE — DO NOT DEPLOY`. This migration does not import old RDS data and does not modify or delete AWS resources.


dont take this is dumpline '
To access your new D1 Database in your Worker, add the following snippet to your configuration file:
{
  "d1_databases": [
    {
      "binding": "mytechcare_staging",
      "database_name": "mytechcare-staging",
      "database_id": "3d21579f-1d69-44c7-92c2-9f9287b5a61f"
    }
  ]}
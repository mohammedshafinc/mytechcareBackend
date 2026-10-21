# Cloudflare Migration Analysis

**Repository:** `/home/shafin/Downloads/mtc admin BE/mytechcareBackend`  
**Analysis date / platform-information target:** 2026-10-20  
**Scope:** Read-only repository and platform investigation. No application files, infrastructure, database, or server were changed. Build/test commands were identified but not run because they generate files or can connect to the configured database.

## Summary answer

### Short answer

The backend **cannot be moved unchanged from EC2 to the Cloudflare Workers Free plan**. It is a NestJS 11 application built for a persistent Node/Express process, PostgreSQL, TypeORM, Socket.IO, and an in-process daily scheduler. Cloudflare Workers now has strong Node/Express compatibility, but the current database, WebSocket, scheduler, lifecycle, and CPU assumptions still require deliberate adapters or rewrites.

A Cloudflare-native deployment can probably reach **$0/month** if all of these gates pass:

1. The complete PostgreSQL database, including indexes, is below D1's **500 MB per-database Free limit**.
2. Production remains below **100,000 Worker requests/day**, **5 million D1 rows read/day**, and **100,000 D1 rows written/day**.
3. Login, JWT, XML, and report requests remain within the Free plan's **10 ms CPU per invocation**. This is the most doubtful gate because admin login uses pure-JavaScript bcrypt with cost 10, and report endpoints load and aggregate entire tables in JavaScript.
4. The business accepts that exceeding a Free daily quota causes requests or database operations to fail until the UTC reset; there is no free overage.
5. The frontend can be changed from the Socket.IO protocol to a Cloudflare Durable Object WebSocket protocol, or real-time notifications can be replaced by polling.

### Primary recommendation: Cloudflare Workers + D1 + Durable Objects + Cron Triggers

Use a Worker-compatible HTTP entry point, D1 for application data, one SQLite-backed Durable Object for the admin notification channel, and a Worker Cron Trigger for the 08:00 expiry check. Keep Nest controllers/services where practical, but introduce a database repository boundary and replace TypeORM/PostgreSQL access with D1-compatible data access (prefer a D1-supported query layer such as Drizzle or explicit prepared SQL). Do **not** attempt to make the current TypeORM entities work against D1 merely by changing `type: 'postgres'` to SQLite; the installed TypeORM has no D1 binding driver, and the code contains PostgreSQL SQL and transaction assumptions.

This is the best long-term fit when the overriding requirement is the lowest Cloudflare cost. It removes EC2 and RDS entirely and has a credible free-tier target. However, it is a migration project rather than a hosting setting. Treat the Free plan as a measured target, not a promise. If only the CPU gate fails, Workers Paid starts at **$5 USD/month** and is still likely much cheaper than EC2 + RDS.

### Lower-effort fallback: unchanged NestJS on Render Free + Neon Free Postgres, optionally behind Cloudflare Free DNS/proxy

For urgent cost reduction, deploy the existing Docker/Node service to a free Node host and move RDS to a free PostgreSQL provider. The concrete fallback assessed here is **Render Free Web Service + Neon Free Postgres**, with Cloudflare Free used for DNS/proxying the API domain. This preserves PostgreSQL, TypeORM, Socket.IO, bcrypt, and nearly all Nest code.

This fallback is much faster but is suitable only if downtime and cold starts are acceptable: Render explicitly says Free services are not for production, sleeps them after 15 minutes without inbound HTTP/WebSocket activity, can take about a minute to wake, offers 750 running hours/month, and uses an ephemeral filesystem. Neon Free currently provides 1 GB PostgreSQL storage per project, 100 CU-hours/month, 5 GB public transfer/month, and scales to zero after five minutes. The in-process 08:00 cron is not reliable while Render is asleep, so move that schedule to a Cloudflare Worker Cron calling a protected endpoint, or use a paid always-on service. See [Render Free limitations](https://render.com/free) and [Neon Free quotas](https://neon.com/faqs/free-plan-limits-and-quotas).

**If this API is business-critical, requires instant responses, or handles active staff/payroll/identity records, budget at least $5–$10/month rather than choosing an architecture that fails hard at a free quota.**

### Critical safety warning

> **Do not terminate EC2 or delete RDS before a verified RDS snapshot and independently restorable `pg_dump` exist, the new production deployment has passed functional and data-reconciliation checks, DNS has been cut over, and a rollback window has completed.** Stop resources only after validation; delete them only after the agreed retention window.

## Evidence from the repository

### Runtime, build, and deployment

- `package.json` identifies NestJS 11 with `@nestjs/platform-express`, TypeORM 0.3.28, `pg` 8.16.3, Socket.IO 4.8.3, `@nestjs/schedule`, Swagger, Passport/JWT, `bcryptjs`, XML libraries, and Node types 22. The real commands are `npm run build`, `npm run test`, `npm run test:e2e`, `npm run test:cov`, and `npm run start:prod`.
- `src/main.ts:8-39` calls `NestFactory.create(AppModule)`, installs Express cookie parsing, permissive credentialed CORS, a global `api` prefix, validation, Swagger at `/api/docs`, and `app.listen(PORT || 3001)`. Workers dispatch `fetch()`/`scheduled()` events rather than managing a conventional always-running port.
- Cloudflare now officially documents Express on Workers through `cloudflare:node`'s `httpServerHandler`, and Node HTTP server support is available with current compatibility dates. This makes an HTTP proof of concept reasonable, but it does not by itself solve Nest bootstrap, database lifecycle, Socket.IO, or CPU limits. See [Cloudflare's Express tutorial](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/), [Node HTTP support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/), and [Node compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).
- `Dockerfile` uses Node 20 Alpine, runs `npm ci` and `npm run build`, exposes 3000, then starts `dist/src/main.js`. This conflicts with `package.json`'s `node dist/main` and `src/main.ts`'s default port 3001; confirm the actual compiled path and `PORT` before any fallback deployment.
- `.github/workflows/deploy.yml` builds `main` and pushes `mytechcare/mytechcare-backend:latest` to Docker Hub. `src/main.ts:10` mentions Watchtower, indicating EC2 likely auto-pulls that tag. There is no repository Terraform, CloudFormation, CDK, ECS, RDS SDK, or AWS SDK coupling.
- `README.md` names `https://api.mtechcare.com/api/docs` as the production verification URL. `src/auth/auth.controller.ts:33-101` hard-codes production refresh-cookie domain `.mtechcare.com`; staging on `workers.dev` will require a configurable/omitted cookie domain.
- `.gitignore` excludes all environment files and explicitly allows `.env.example`, but no `.env.example` is present. The observed runtime keys are `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` (`src/app.module.ts`, `src/main.ts`, `src/auth/*`, `scripts/seed-modules.ts`). No secret values were inspected.

### Modules and API surface

`src/app.module.ts:25-65` registers Config, Schedule, Auth, Admin, Service Request, Invoice, Job Sheet, Quotation, Bill, Corporate Enquiry, B2C Enquiry, Enquiry Follow-up, Sales Report, module definitions/RBAC, Store, Staff, Organization/Vehicles, Notification, and TypeORM. The module inventory confirms 19 Nest modules:

- `src/auth/auth.module.ts`
- `src/admin/admin.module.ts`
- `src/service-request/service-request.module.ts`
- `src/bill/bill.module.ts`
- `src/bill/invoice/invoice.module.ts`
- `src/bill/job-sheet/job-sheet.module.ts`
- `src/bill/quotation/quotation.module.ts`
- `src/corporate-enquiry/corporate-enquiry.module.ts`
- `src/b2c-enquiry/b2c-enquiry.module.ts`
- `src/enquiry-followup/enquiry-followup.module.ts`
- `src/sales-report/sales-report.module.ts`
- `src/module/module.module.ts`
- `src/store/store.module.ts`
- `src/staff/staff.module.ts`
- `src/organization/organization.module.ts`
- `src/organization/vehicles/vehicles.module.ts`
- `src/notification/notification.module.ts`
- `src/repair-item/repair-item.module.ts`
- root `src/app.module.ts`

Useful inferred smoke endpoints after the production `api` prefix are:

- `GET /api` — returns `Hello World!` (`src/app.controller.ts`, `src/app.service.ts`).
- `GET /api/docs` — Swagger UI (`src/main.ts:26-38`).
- `POST /api/auth/admin/login`, `POST /api/auth/refresh`, and `GET /api/auth/admin/permissions` (`src/auth/auth.controller.ts`).
- `POST /api/service-request` and `GET /api/service-request/by-mobile?mobile=...` are public (`src/service-request/service-request-public.controller.ts`).
- `GET /api/admin/service-request` is authenticated (`src/service-request/service-request.controller.ts`).
- `GET /api/notifications/expiry-alerts?days=30` (`src/notification/notification.controller.ts`). This endpoint currently has no auth guard and exposes staff-document expiry information; protect it before using it as an external cron target.
- `GET /api/sales-report/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` and related financial, customer, invoice, quotation, job-sheet, staff, and store reports (`src/sales-report/sales-report.controller.ts`).

### Current database and schema model

The database is unambiguously **PostgreSQL**:

- `src/app.module.ts:48-62` sets TypeORM `type: 'postgres'`, `autoLoadEntities: true`, `synchronize: false`, and production TLS with `rejectUnauthorized: false`.
- `docker-compose.yml` runs PostgreSQL 15 locally.
- `scripts/seed-modules.ts:16-100` creates a PostgreSQL `DataSource` and uses `$1` placeholders and `ON CONFLICT`.
- `migrations/README.md` directs operators to `psql`.

There are 23 TypeORM entity classes/tables in source:

1. `users` — `src/user/user.entity.ts`
2. `admin_users` — `src/user/admin.entity.ts`
3. `stores` — `src/store/store.entity.ts`
4. `staff` — `src/staff/staff.entity.ts`
5. `service_requests` — `src/service-request/service-request.entity.ts`
6. `repair_items` — `src/repair-item/repair-item.entity.ts`
7. `bills` — `src/bill/bill.entity.ts`
8. `b2c_enquiries` — `src/b2c-enquiry/b2c-enquiry.entity.ts`
9. `corporate_enquiries` — `src/corporate-enquiry/corporate-enquiry.entity.ts`
10. `enquiry_followups` — `src/enquiry-followup/enquiry-followup.entity.ts`
11. `modules` — `src/module/module.entity.ts`
12. `submodules` — `src/module/submodule.entity.ts`
13. `user_modules` — `src/module/user-module.entity.ts`
14. `user_submodules` — `src/module/user-submodule.entity.ts`
15. `invoices` — `src/bill/invoice/invoice.entity.ts`
16. `invoice_items` — `src/bill/invoice/invoice-item.entity.ts`
17. `job_sheets` — `src/bill/job-sheet/job-sheet.entity.ts`
18. `job_sheet_items` — `src/bill/job-sheet/job-sheet-item.entity.ts`
19. `quotations` — `src/bill/quotation/quotation.entity.ts`
20. `quotation_items` — `src/bill/quotation/quotation-item.entity.ts`
21. `vehicles` — `src/organization/vehicles/vehicle.entity.ts`
22. `vehicle_expenses` — `src/organization/vehicles/vehicle-expense.entity.ts`
23. `rental_vehicles` — `src/organization/vehicles/rental-vehicle.entity.ts`.

The live RDS schema may contain more than these entities. For example, `src/auth/auth.service.ts:59-63` queries `role_modules`, but there is no corresponding entity or checked-in creation migration. Because `synchronize` is false and only one feature migration is checked in, **the live schema dump—not the TypeScript entities—is the source of truth**.

### PostgreSQL/TypeORM features requiring D1 conversion

D1 is SQLite-based, not PostgreSQL-compatible. Specific conversion work is required:

- **Driver and lifecycle:** the installed TypeORM package contains no Cloudflare D1 driver. D1 is accessed through a Worker binding, not a TCP database URL. `TypeOrmModule.forRootAsync` and all `TypeOrmModule.forFeature` repositories must be replaced or hidden behind adapters.
- **Placeholders/raw SQL:** `src/auth/auth.service.ts` and `scripts/seed-modules.ts` use PostgreSQL `$1`, `$2`, `$3`; D1 uses SQLite/D1 binding syntax such as `?`/`?1`. Preserve parameterization.
- **Case-insensitive search:** `ILIKE` appears in `src/bill/invoice/invoice.service.ts:516-519`, `src/bill/quotation/quotation.service.ts:143-146`, and `src/bill/job-sheet/job-sheet.service.ts:108-111`. Rewrite with normalized columns or `LOWER(column) LIKE LOWER(?)`, then index appropriately. D1 also limits LIKE/GLOB patterns to 50 bytes, so validate/truncate search input.
- **Types:** `timestamptz` in `Invoice.issueTimestamp`, many PostgreSQL `timestamp`/`date` fields, booleans, and many `decimal(p,s)` money fields do not have equivalent PostgreSQL semantics in SQLite. Store UTC timestamps as ISO-8601 `TEXT` or integer epoch values; store booleans as constrained integers; store currency as integer halalas rather than floating-point REAL to protect invoice totals.
- **Generated IDs:** every entity uses `@PrimaryGeneratedColumn`. Translate to `INTEGER PRIMARY KEY AUTOINCREMENT` where stable IDs are required, preserve imported IDs, and reset/test subsequent ID generation after import.
- **Relations:** preserve `RESTRICT`, `SET NULL`, and `CASCADE` behavior from staff, service requests, vehicles, expenses, rentals, and invoice/job-sheet/quotation items. Enable and test foreign keys explicitly.
- **Transactions:** `src/enquiry-followup/enquiry-followup.service.ts:69-126` updates a follow-up and its parent enquiry atomically. Invoice, quotation, and job-sheet services use TypeORM `QueryRunner` transactions to write a parent and child items. Reimplement each as one D1 transaction-compatible batch or repository operation and test rollback on a failing child row.
- **PostgreSQL migrations:** `migrations/add_staff_extended_fields.sql` uses `COMMENT ON COLUMN`, a PL/pgSQL `DO $$ ... RAISE NOTICE` block, PostgreSQL-oriented alter syntax, and PostgreSQL decimal types. It cannot be sent directly to D1. Generate a fresh SQLite schema from the verified live schema.
- **Concurrency:** invoice, quotation, and job-sheet numbers use `MAX(id) + 1` before insertion (`generateInvoiceNumber`, analogous methods). Concurrent requests can produce duplicate unique numbers. Generate the visible number from an inserted row ID or maintain an atomic counter; do not copy this race into D1.
- **Write amplification:** service-request creation performs insert, ID-based reference-number update, then refetch (`src/service-request/service-request.service.ts:26-79` and `85-151`). This consumes extra D1 row writes; redesign to use an atomic counter/reference generation if Free write quota is tight.
- **Unbounded reads and CPU:** most list methods use unpaginated `repository.find`. `SalesReportService.getSalesDashboard`, `getCustomerReport`, and other reports fetch entire tables in parallel and aggregate with JavaScript `map/filter/reduce` (`src/sales-report/sales-report.service.ts:38-148`, `655+`, `964+`, `1328+`, `1434+`). Move aggregation into indexed SQL and require date ranges/pagination before relying on D1 Free or the 10 ms Worker CPU budget.
- **Schema width:** `staff` has many columns but appears below D1's 100-column maximum. Confirm against live RDS because hidden/manual columns cannot be inferred.
- **No observed blockers from extensions:** no checked-in use of PostgreSQL extensions, arrays, JSONB, full-text vectors, stored procedures, triggers, sequences, or large-object APIs was found. The live schema must still be checked.

### WebSockets and scheduling

- `src/admin/admin.gateway.ts` is a Socket.IO `@WebSocketGateway`, joins every connection to `admins`, and emits `new-request`.
- `src/service-request/service-request.service.ts:54-60` and `126-132` emit the event after new requests.
- `src/notification/notification.service.ts:19-34` uses Nest's in-process cron every day at 08:00 and broadcasts `expiry-alerts`.

The Worker Node HTTP compatibility layer explicitly does not support Node's HTTP `upgrade` event, while Socket.IO expects its own upgrade/polling protocol. Therefore, the current gateway cannot simply be bundled. Replace it with one of these chosen approaches:

1. **Recommended:** a SQLite-backed Durable Object with Cloudflare's Hibernation WebSocket API; change the frontend from `socket.io-client` to standard WebSocket messages for `new-request` and `expiry-alerts`.
2. If real time is optional, remove Socket.IO and poll a notifications endpoint. This is simpler and avoids Durable Object complexity but changes latency and request volume.

Cloudflare supports WebSockets on Workers/Durable Objects and recommends hibernation to avoid active-duration cost; Free currently includes 100,000 Durable Object requests/day and 13,000 GB-s/day, with operations failing after a limit is reached. See [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Replace `@nestjs/schedule` with an exported Worker `scheduled()` handler and a Wrangler cron. Cloudflare cron expressions run in UTC, so 08:00 business time must be converted with daylight/time-zone policy made explicit. The Free account limit is five Cron Triggers and Cron CPU is 10 ms on Free. See [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

### Authentication, cookies, and CPU risk

- `src/auth/auth.service.ts:553-555` verifies admin passwords with `bcryptjs.compare`; lines 685-686 and 737-738 hash at cost 10. This is intentionally CPU-expensive and likely to exceed the Free Worker's 10 ms CPU limit. Benchmark on deployed Workers before selecting Free. Do not reduce password cost merely to fit a hosting quota.
- Access and refresh JWT secrets are read directly from `process.env` in `src/auth/auth.module.ts`, `src/auth/jwt.strategy.ts`, and `src/auth/auth.service.ts`. Move them to Wrangler secrets/bindings and fail startup/requests clearly if absent.
- Refresh cookies are `httpOnly`, secure in production, `SameSite=None`, and hard-coded to `.mtechcare.com` (`src/auth/auth.controller.ts`). Make allowed origins and cookie domain explicit environment settings. On a `workers.dev` staging hostname, omit Domain and use a staging frontend on a compatible origin.
- `src/main.ts` has `origin: true` with credentials. Replace this with an allow-list for the actual production and staging frontend origins.
- Admin gateway CORS currently allows `*` and does not authenticate the socket (`src/admin/admin.gateway.ts`). Require a valid JWT before joining the admin notification Durable Object.
- The staff schema contains salary, bank account/IBAN, passport, iqama, insurance, visa, and emergency-contact data. Confirm legal/data-residency, access-control, audit, and backup requirements before placing it on a free service with limited support/retention.

### Files, uploads, integrations, and AWS coupling

Repository-wide source inspection found:

- No Multer interceptors, uploaded-file controllers, local upload directories, `fs` writes/reads, `__dirname` data paths, child processes, or persistent filesystem assumptions.
- No S3, SES, SNS, AWS SDK, EC2/RDS API, Stripe, PayPal, Twilio, SMTP/nodemailer, Axios/HTTP service, or outbound API integration.
- No email or SMS sender. Email/mobile values are data fields and login identifiers only.
- No payment gateway. Billing and invoice values are internal database records.
- Node crypto and Buffer are used for invoice UUIDs, SHA-256, TLV QR encoding, and UBL XML (`src/bill/invoice/invoice.service.ts:8`, `35-83`, `292`). Current Workers Node compatibility supports Buffer and crypto, but validate output byte-for-byte and measure CPU.
- No current use case requires R2. If uploads are added later, use R2 rather than a Worker/container filesystem. The R2 Free allowance is 10 GB-month, 1 million Class A operations/month, 10 million Class B operations/month, and free direct egress; usage beyond that is billed. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

### Existing test quality and deployment verification gaps

- `package.json` defines Jest unit/e2e commands, but coverage is sparse: four basic specs and one e2e test.
- `src/auth/auth.service.spec.ts` constructs `AuthService` without its repository/JWT/DataSource dependencies; `src/auth/auth.controller.spec.ts` similarly omits `AuthService`. These likely fail dependency injection unless hidden setup exists.
- `test/app.e2e-spec.ts` imports the full `AppModule`, so it requires database environment variables and connectivity. It requests `/`, while production applies the `/api` prefix only in `src/main.ts`; it does not verify the production URL shape.
- There are no database integration tests for transactions, migrations, report results, RBAC, cookies, WebSockets, or the scheduler. These must be added before migration.

## Current Cloudflare capabilities, limits, and cost

The following values were checked against official Cloudflare documentation available for the requested 2026-10-20 target date. Cloudflare changes limits; recheck the linked pages immediately before implementation and cutover.

| Service | Free status and relevant limits | Consequence for this project |
|---|---|---|
| Workers | Free: 100,000 requests/day, 10 ms CPU/invocation, 128 MB memory, 50 external subrequests/invocation, 64 MiB uncompressed bundle, five Cron Triggers. Static assets do not consume dynamic request quota. [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) / [limits](https://developers.cloudflare.com/workers/platform/limits/) | HTTP volume may fit, but bcrypt and in-memory reports are high-risk. Exceeding daily requests fails requests rather than billing overage. |
| Workers Paid | Minimum $5/month; 10 million requests/month and 30 million CPU-ms/month included; higher per-request CPU ceiling. [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Sensible safety valve if Free CPU fails; still requires Worker adapters. |
| D1 | Free: 5 million rows read/day, 100,000 rows written/day, 5 GB total account storage; free operations fail after daily limits. [Pricing](https://developers.cloudflare.com/d1/platform/pricing/) | Unbounded reports can scan quota quickly; migration imports count as writes. |
| D1 limits | Free: 10 databases, **500 MB maximum per database**, seven-day Time Travel; max 100 columns/table, 2 MB row/value, 50 queries per Free Worker invocation, 30-second SQL query. [Limits](https://developers.cloudflare.com/d1/platform/limits/) | The 500 MB single-database limit, not the 5 GB account total, is the key size gate. |
| D1 backup | Time Travel is automatic; Free retention is seven days. SQL export is available through Wrangler. [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) | Keep independent scheduled exports for retention beyond seven days. |
| Durable Objects | SQLite-backed objects are available on Free; 100,000 requests/day and 13,000 GB-s/day. Hibernation avoids duration while idle. [Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) | Good fit for a small authenticated admin WebSocket room; frontend protocol changes. |
| Hyperdrive | Free: 100,000 database statements/day, 10 configurations, approximately 20 origin connections/configuration; Paid has unlimited statement count. [Pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/) / [limits](https://developers.cloudflare.com/hyperdrive/platform/limits/) | Useful if retaining external PostgreSQL; does not provide the database or make D1 PostgreSQL-compatible. The installed `pg` 8.16.3 meets Cloudflare's documented minimum. |
| R2 | Free allowance: 10 GB-month, 1M Class A and 10M Class B operations/month, direct egress free. [Pricing](https://developers.cloudflare.com/r2/pricing/) | Not currently needed; correct future upload/long-backup target. |
| Containers | **No Free allocation**; part of Workers Paid ($5 minimum), with included compute. Containers are currently beta. [Pricing](https://developers.cloudflare.com/containers/pricing/) / [beta status](https://developers.cloudflare.com/containers/beta-info/index.md) | Could run the Dockerized Nest process with fewer code changes, but is not a free or fully mature production answer. Cold starts and ephemeral disk remain. |
| Workers Logs | Free: 200,000 log events/day and three-day retention. [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) | Enable structured logs and export critical audit/error data elsewhere if retention requirements exceed three days. |
| Cloudflare DNS | Free/Pro full setup requires owning a domain and changing authoritative nameservers; preserve all records and handle DNSSEC carefully. [DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) | `mtechcare.com` ownership and registrar access must be confirmed. A `workers.dev` URL can be used before DNS cutover. |

Cloudflare's own D1 import documentation says PostgreSQL dumps cannot be imported directly because syntax and types differ; convert to SQLite-compatible schema/data first. See [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

Content from linked platform sources was rephrased for compliance with licensing restrictions.

## Architecture conclusions and recommendations

### Option A — Workers + D1 + Durable Objects (primary)

**Cost:** potentially $0; $5/month if Workers Paid becomes necessary.  
**Effort:** high.  
**Advantages:** removes both EC2 and RDS; scales to zero; no server maintenance; automatic D1 Time Travel; good fit for modest CRUD traffic.  
**Risks:** PostgreSQL-to-SQLite conversion, replacement of TypeORM data access, Socket.IO client change, scheduler change, strict CPU/quota failures, D1 single-database throughput, and weak current tests.

Choose this only after the measurement phase proves Free eligibility. Optimize reports and authentication before launch; do not discover the 10 ms issue in production.

### Option B — Workers + external PostgreSQL through Hyperdrive

**Cost:** potentially $0 with a free PostgreSQL provider; Workers Paid may still be needed for CPU.  
**Effort:** medium-high.  
**Advantages:** preserves PostgreSQL types, SQL, schema, and most TypeORM behavior; avoids the riskiest data conversion. Cloudflare officially recommends `pg`, and this repository already has the documented compatible version. See [Cloudflare PostgreSQL/Hyperdrive guide](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/).  
**Risks:** external provider quotas, scale-to-zero latency, public transfer, connection/DataSource lifecycle changes, Socket.IO/scheduler refactoring, and bcrypt CPU remain. Hyperdrive's Free 100,000 statements/day can be consumed faster than request quota because one request performs multiple SQL statements.

Use this as an intermediate Cloudflare architecture if the DB is over 500 MB or the D1 rewrite is too risky. Neon Free's 1 GB database limit may still be too small; measure first.

### Option C — Cloudflare Containers + external PostgreSQL

**Cost:** at least the $5 Workers Paid plan plus any database overage.  
**Effort:** medium.  
**Advantages:** closest Cloudflare-hosted lift-and-shift for Nest, Docker, Socket.IO, and bcrypt.  
**Risks:** Containers are beta and paid-only; requests route through a Worker/Durable Object; disk is ephemeral; cold starts are commonly seconds; a sleeping container cannot be trusted to run the in-process cron. Not recommended as the primary production migration for a cost-sensitive beginner.

### Option D — Render Free + Neon Free (lower-effort fallback)

**Cost:** potentially $0.  
**Effort:** low-medium.  
**Advantages:** preserves the Node server, TypeORM/PostgreSQL, Socket.IO, and existing Docker workflow.  
**Risks:** one-minute cold starts, sleeping service, no reliable in-process schedule while asleep, provider quota suspension, limited support/backup windows, external database transfer, and explicit non-production guidance from Render. Use only if these are acceptable; otherwise use a small paid always-on app plan while retaining Neon/Postgres.

## Exact beginner-friendly phased checklist

### Phase 0 — Answer the eligibility questions

- [ ] Confirm who owns `mtechcare.com`, where it is registered, who controls its current nameservers/DNSSEC, and whether email uses MX/SPF/DKIM/DMARC records on that domain.
- [ ] Confirm whether the frontend source can be changed and redeployed; a standard-WebSocket change is required for the primary path.
- [ ] Decide whether a one-minute cold start or up to one day of Free-quota outage is acceptable. If not, approve at least a $5–$10 monthly budget.
- [ ] Record typical and peak daily API requests, peak requests/second, concurrent admin WebSockets, and the heaviest report date range.
- [ ] Record RDS engine/version, region, database size, table/index sizes, row counts, current connections, and monthly transfer.
- [ ] Confirm whether users upload files today or will soon, even though no upload code is present.
- [ ] Confirm required uptime, maintenance window, backup retention, recovery-time/recovery-point objectives, and Saudi/legal requirements for employee salary, IBAN, passport, iqama, visa, and insurance data.
- [ ] Confirm whether transactional email, SMS, payment, or other integrations exist outside this repository.

### Phase 1 — Create accounts and prepare local tools

- [ ] Create a Cloudflare account at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up), enable MFA, save recovery codes offline, and create a separate least-privilege deployment token later.
- [ ] Do not move DNS yet. A Worker can first deploy to `<name>.<subdomain>.workers.dev`.
- [ ] Install Git, PostgreSQL client tools matching or newer than the RDS major version, SQLite CLI, Docker, and a supported Node LTS. The current image uses Node 20 while typings target Node 22; standardize and test one version during implementation.
- [ ] Add Wrangler to the migration branch as a pinned development dependency rather than relying on an unpinned global version. Authenticate with `npx wrangler login`; Cloudflare's beginner flow is documented at [Workers getting started](https://developers.cloudflare.com/workers/get-started/guide/).
- [ ] For the fallback, create Render and Neon accounts with MFA. Do not use Render's 30-day-expiring Free Postgres for production data.

### Phase 2 — Measure AWS before choosing D1

Run these read-only checks against RDS using a restricted account; never paste credentials into chat or commit them:

```sql
SELECT version();
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
SELECT schemaname, relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

- [ ] Export 30 days of CloudWatch/API access data or reverse-proxy logs to calculate requests/day and peak concurrency.
- [ ] Exercise admin login and largest reports in a Worker proof of concept and inspect CPU time. If bcrypt or reports regularly exceed 10 ms, choose Workers Paid, redesign those paths securely, or use the fallback.
- [ ] Choose D1 only if the converted database plus indexes comfortably fits below 500 MB (leave growth headroom, for example target below 350–400 MB), rows read/written fit quotas, and each table has at most 100 columns.

### Phase 3 — Make and verify backups before touching production

- [ ] In AWS RDS, create a manual snapshot named with the UTC date/time and mark its retention/owner in the migration record.
- [ ] Create an independent custom-format dump from a trusted machine:

```bash
pg_dump --host=<RDS_HOST> --port=5432 --username=<DB_USER> \
  --dbname=<DB_NAME> --format=custom --no-owner --no-acl \
  --file=mytechcare-pre-cloudflare-YYYYMMDD-HHMM.dump
pg_restore --list mytechcare-pre-cloudflare-YYYYMMDD-HHMM.dump > restore-manifest.txt
```

- [ ] Also save a schema-only plain SQL dump for human review: `pg_dump ... --schema-only --no-owner --no-acl --file=schema.sql`.
- [ ] Encrypt backups at rest, store at least two copies in different locations, restrict access, and never commit them.
- [ ] Restore the custom dump into a disposable PostgreSQL database and run row-count/API checks. A dump that has not been restored is not a verified backup.
- [ ] Capture exact row counts for every user table and representative financial totals/invoice IDs for later reconciliation.

### Phase 4 — Build a staging migration branch

For the primary Cloudflare path:

- [ ] Create a dedicated branch and a Wrangler configuration with separate local, staging, and production bindings. Use a current compatibility date and enable source maps/observability.
- [ ] Add a Worker entry that initializes the HTTP application once per isolate and exports a fetch handler via Cloudflare's Node HTTP adapter. Keep `/api` and response formats stable.
- [ ] First prove `GET /api`, JSON validation, cookies, JWT verification, and Swagger bundle/startup size. Run `npx wrangler deploy --dry-run --outdir=<temporary-dir>` and confirm upload size is below 64 MiB and startup below one second.
- [ ] Introduce repository interfaces per domain. Replace `TypeOrmModule`/`Repository`/`DataSource` usage with D1 adapters using prepared statements and explicit row mapping. Do not mix PostgreSQL TypeORM writes and D1 writes in production.
- [ ] Create a complete SQLite migration from the **live schema dump**, including the otherwise-undocumented `role_modules` table, unique constraints, indexes, and foreign keys.
- [ ] Convert money to integer halalas, timestamps to UTC ISO text/epoch, booleans to constrained integers, and PostgreSQL-generated IDs to SQLite integer primary keys. Document every transform.
- [ ] Rewrite `$n`, `ILIKE`, QueryRunner transactions, date filters, and conflict handling. Use D1 batch/transaction-compatible operations for parent/child invoice, quotation, job-sheet, and follow-up writes.
- [ ] Fix visible-number races (`MAX(id)+1`) and the service-request double-write while preserving existing API response formats.
- [ ] Push report aggregation into indexed SQL; require bounded date ranges and paginate list endpoints. Add indexes based on actual query plans and D1 `rows_read` metadata.
- [ ] Replace Socket.IO with an authenticated Durable Object Hibernation WebSocket endpoint and update the frontend client/event reconnection logic. If that work is not justified, intentionally choose polling instead.
- [ ] Replace Nest Schedule with `scheduled()` and a Wrangler UTC cron. Test the expiry query and `expiry-alerts` broadcast manually.
- [ ] Move `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to Wrangler secrets. Add non-secret bindings for allowed origins, cookie domain, environment, and timezone. Remove hard-coded `.mtechcare.com` behavior from staging.
- [ ] Restrict CORS and authenticate WebSocket connections. Protect the expiry endpoint if it remains externally callable.
- [ ] Add structured logs without passwords, JWTs, cookies, bank details, passport/iqama IDs, mobile numbers, or full request bodies.

For the lower-effort fallback instead:

- [ ] Fix/verify the Docker start path and port; Render requires the app to bind to its provided `PORT` on `0.0.0.0`.
- [ ] Create Neon PostgreSQL, use its pooled/TLS connection information, and map it to the existing `DB_*` variables or introduce a single `DATABASE_URL` safely.
- [ ] Keep Socket.IO, but expect disconnect/reconnect on sleep. Move the 08:00 schedule out of the sleeping Render process.
- [ ] Deploy a staging Render service and connect a non-production Neon branch/database before importing production data.

### Phase 5 — Convert and migrate data to D1 staging

- [ ] Do not feed a PostgreSQL dump directly to D1. Write a repeatable conversion/ETL tool that reads the verified PostgreSQL dump/restored source and writes SQLite-compatible SQL or D1 batches.
- [ ] Import tables in dependency order: base users/admins/stores/modules, staff, requests/enquiries, parent billing documents, then child item/permission/vehicle tables. Preserve all primary IDs and bcrypt password strings exactly.
- [ ] Split statements to remain below D1's statement/parameter limits. The import itself consumes D1 row-write quota; if there are over 100,000 rows/index writes, import across reset windows or temporarily use Workers Paid for migration.
- [ ] Apply schema locally first, then staging remotely. Typical commands after implementation are:

```bash
npx wrangler d1 execute <DB_NAME> --local --file=<SCHEMA_FILE>
npx wrangler d1 execute <DB_NAME> --remote --file=<SCHEMA_FILE>
```

- [ ] Reconcile every table count, minimum/maximum ID, null counts for critical fields, unique keys, orphan foreign keys, sample JWT logins, financial totals, invoice item totals, latest service-request reference, and date/time values.
- [ ] Export staging D1 back to SQL and retain it as a restore drill: `npx wrangler d1 export <DB_NAME> --remote --output=<SAFE_PATH>`.
- [ ] For Neon fallback, restore the custom PostgreSQL dump with `pg_restore`, then run the same reconciliation. Preserve PostgreSQL schema without SQLite transforms.

### Phase 6 — Validate code and behavior

The implementation must make these repository commands pass:

```bash
npm ci
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

- [ ] Repair the incomplete DI unit tests and make e2e tests use the same `/api` prefix/configuration as production.
- [ ] Add D1/local integration tests for every transaction and constraint; verify failed item creation rolls back its parent.
- [ ] Test admin/user login, refresh cookie, logout, RBAC/module/submodule behavior, CRUD for every module, invoice UBL generation/validation, reports with empty/large ranges, and staff expiry calculations.
- [ ] Test public `POST /api/service-request` and `GET /api/service-request/by-mobile` with valid, invalid, and abusive inputs; apply rate limiting because these are unauthenticated.
- [ ] Test Durable Object connect/auth/reconnect/hibernate and delivery of both `new-request` and `expiry-alerts` events.
- [ ] Invoke the local scheduled handler with Wrangler and confirm UTC-to-business-time behavior.
- [ ] Run `npx wrangler dev`, then smoke-test `GET /api`, `GET /api/docs`, login/refresh, a public request, an authenticated list, an invoice read, notification fetch, and each report.
- [ ] Deploy staging to `workers.dev`; rerun smoke/e2e tests against staging and inspect Worker CPU, errors, D1 rows read/written, Durable Object usage, and logs for at least several realistic test cycles.
- [ ] Load-test within safe staging limits, especially bcrypt login and unbounded historical reports. Do not use production personal data in load tests.

### Phase 7 — Configure secrets, DNS, and production resources

- [ ] Generate new high-entropy JWT secrets; place them with `npx wrangler secret put JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Keep old secrets during the rollback window only if session continuity is required; plan token invalidation deliberately.
- [ ] Create separate production D1/Durable Object resources and never bind staging to production data.
- [ ] Add `mtechcare.com` to Cloudflare Free only after exporting/screenshotting all existing DNS records. Carefully preserve MX, SPF, DKIM, DMARC, verification, frontend, and other records.
- [ ] If changing authoritative nameservers, disable registrar DNSSEC first, copy records, use the two assigned Cloudflare nameservers, wait for Active status, then re-enable DNSSEC. Cloudflare notes activation may take up to 24 hours.
- [ ] Lower the existing `api.mtechcare.com` TTL 24–48 hours before cutover where the current DNS provider permits.
- [ ] Attach a Worker custom domain for `api.mtechcare.com`; validate TLS and CORS. Do not point production users to the new backend yet.
- [ ] Update the frontend staging API/WebSocket URLs and validate the configurable refresh-cookie domain and `SameSite` behavior in real browsers.

### Phase 8 — Production data migration and cutover

- [ ] Announce a maintenance window. Put the old API into read-only/maintenance mode so no writes can be missed; do not rely on an untested dual-write system.
- [ ] Take a final RDS snapshot and final encrypted `pg_dump` after writes stop.
- [ ] Run the same tested ETL/restore process against production D1/Neon.
- [ ] Run automated reconciliation and have a business user verify current staff, latest requests, permissions, bills, invoices, quotations, job sheets, and report totals.
- [ ] Deploy the exact staging-tested Worker version and bindings; run smoke tests on its direct deployment URL.
- [ ] Change `api.mtechcare.com` to the Worker custom domain/route. Keep EC2 and RDS running but read-only and do not terminate them.
- [ ] Validate from at least two networks: login, refresh cookie, public request creation, real-time admin notification, authenticated CRUD, invoice UBL, reports, and scheduled notification behavior.
- [ ] Monitor closely for at least 48–72 hours and preferably one full business cycle/week: Worker 5xx/1102/1027 errors, CPU, requests, D1 quotas/latency/overload, Durable Object reconnects, logs, and user complaints.

### Phase 9 — Rollback plan

Trigger rollback for authentication failure, missing/corrupt data, quota exhaustion, unacceptable latency, WebSocket failure, or financial/report mismatch:

- [ ] Stop writes to the new backend to avoid split-brain data.
- [ ] Export all post-cutover D1/Neon writes for later merge; record the exact rollback timestamp.
- [ ] Re-enable the old EC2 API/RDS writer, point DNS back to the previous endpoint, and validate `/api`, login, and a write.
- [ ] If RDS was modified, restore from the verified final snapshot/dump to a new instance rather than overwriting the only copy.
- [ ] Communicate the rollback and reconcile any writes that occurred only on the new system before attempting another migration.

### Phase 10 — Monitoring, backups, and only then AWS shutdown

- [ ] Enable Workers observability and structured logs. Free retention is only three days, so define longer audit retention if required.
- [ ] Create quota alerts/runbooks for Worker requests/CPU failures, D1 rows read/written/storage, Durable Object usage, and external database quotas.
- [ ] Schedule encrypted D1 SQL exports to R2 or another independent location for retention beyond seven-day Time Travel; periodically test restore into a non-production database.
- [ ] Keep the verified pre-cutover RDS snapshot and dump for the agreed retention period.
- [ ] After stable validation, first **stop** EC2 and observe for several more days; stopping is easier to reverse than termination. Continue retaining RDS during this stage.
- [ ] Only after written approval and rollback-window completion: create one final RDS snapshot, verify it is retained, delete RDS, terminate EC2, and remove chargeable leftovers such as unattached EBS volumes/snapshots not required for retention, Elastic IPs, load balancers, NAT Gateways, old AMIs, and excess CloudWatch logs.
- [ ] Review AWS Cost Explorer/Billing for two subsequent days to ensure recurring resources are gone. Do not delete the retained backup merely to make the bill reach zero.

## Questions that must be answered before implementation

1. Do you control `mtechcare.com`, its registrar, DNS, and DNSSEC? What currently hosts the frontend and email DNS records?
2. What are the exact RDS PostgreSQL version, database size, index size, table row counts, and largest row/value? Is any table or converted D1 database likely to exceed 500 MB?
3. Are there live tables, views, triggers, functions, extensions, or migrations absent from this repository—especially `role_modules`?
4. How many API requests/day, database statements/day, D1-equivalent rows scanned/day, concurrent users, and WebSocket clients occur at peak?
5. Can the business accept Free-tier hard failures until midnight UTC? Can it accept Render/Neon cold starts if the fallback is chosen?
6. Is real-time Socket.IO essential, or is 15–60 second polling acceptable? Can the frontend be changed?
7. What uptime, response-time, RPO, RTO, and backup-retention guarantees are required?
8. Is $5/month acceptable if bcrypt/report CPU does not fit Workers Free?
9. Are uploads, email, SMS, payments, or private integrations deployed outside this repository?
10. Which timezone should “8:00 AM” mean, including daylight-saving policy: Saudi Arabia, India, or another business timezone?
11. Must existing refresh tokens remain valid at cutover, or may all users log in again?
12. Are there regulatory/data-residency or contractual requirements for staff identity, bank, salary, visa, passport, iqama, and insurance information?
13. Who will perform business acceptance testing, and what financial/report totals will they sign off?
14. How long can EC2/RDS remain available for rollback after cutover, and who can approve final deletion?

## Final conclusion

The project is functionally small enough that a Cloudflare-native architecture is plausible, and it has no upload/AWS-SDK/payment/email coupling that would block migration. The challenge is architectural rather than feature count: PostgreSQL/TypeORM, Socket.IO, process cron, bcrypt, and table-wide JavaScript reports conflict with D1 and Workers Free assumptions.

Proceed with **Workers + D1 + a Durable Object + Cron Trigger** only after size, traffic, and CPU proof. Keep **Render Free + Neon Free** as the rapid lower-effort fallback if downtime is acceptable, or use a small paid always-on service for business-critical use. In every case, create and restore-test backups first, migrate and verify in staging, cut over with AWS intact, monitor through a rollback window, and shut down AWS last.

# Cloudflare-Native Backend Migration — Requirements and Technical Design

## Requirements

### Summary

Migrate the complete reachable backend from the suspended AWS EC2/RDS deployment to Cloudflare Workers Free and D1 Free, using a completely fresh database and retaining no RDS data. The migration covers every current HTTP module, authentication and RBAC, transactional billing documents, reports, Saudi-time scheduling, persistent notifications, deployment configuration, tests, and beginner documentation. The frontend remains on Vercel, will replace Socket.IO with authenticated HTTP polling, and in production must use a configurable custom hostname under `mtechcare.com` (for example, `app.mtechcare.com`) while the Worker uses `api.mtechcare.com`.

The checked-in 23 TypeORM entities, DTOs, services, controllers, the two staff SQL migration files, and executable raw SQL are the available source of truth because RDS is unavailable. The schema therefore includes the `role_modules` table queried by `src/auth/auth.service.ts`, but no non-super-admin role policy is guessed: its initial rows are empty and authorization fails closed until the bootstrap super-admin assigns per-user permissions. Assumptions are 1–3 administrators, about 1,500 API requests/day, no retained data, no upload/email/SMS/payment integration, and acceptance that Cloudflare Free quotas fail closed rather than incur paid overage.

### Functional Requirements

- Deploy a Worker-native TypeScript API to `workers.dev` first and, only after separate manual DNS work, to `api.mtechcare.com`. Production Vercel must serve the frontend from an exact configured sibling hostname under `mtechcare.com` (documented example: `app.mtechcare.com`); a `vercel.app`-only frontend does not support refresh-cookie authentication under this design. The runtime must export `fetch` and `scheduled`; it must not call `app.listen`, use a writable filesystem, depend on an always-running process, or use Containers, Hyperdrive, EC2, or RDS.
- Preserve reachable `/api` methods, paths, successful response envelopes, DTO fields, status calculations, RBAC/module/submodule behavior, store scoping, refresh cookies, document transactions, QR/TLV and UBL behavior unless listed under “Unavoidable and intentional API differences.”
- Replace NestJS, TypeORM/PostgreSQL, Socket.IO, and `@nestjs/schedule` in the deployed path with Hono, D1 prepared SQL, persistent authenticated notification polling, and a Cron Trigger.
- Create a complete fresh D1 schema for all 23 entity tables, `role_modules`, and operational counter, notification, invoice-chain, bootstrap, and scheduled-run tables. Preserve keys, uniqueness, foreign keys, indexes, delete behavior, and parent/child atomicity.
- Store money as integer halalas, one-decimal odometers as integer tenths, booleans as checked integers, dates as `YYYY-MM-DD`, and instants as canonical UTC RFC 3339 text. API mappers retain current camelCase fields and SAR JSON numbers.
- Replace all TypeORM and PostgreSQL behavior, including `$n`, `ILIKE`, `ON CONFLICT`, relation loading, `QueryRunner`, report-side JavaScript aggregation, and permissive date parsing. Every external value must be bound to a constant SQL statement.
- Generate all system-visible service request, invoice, quotation, job-sheet, store, staff, and default ICV sequences with atomic counters; no implementation may derive a value with `MAX(id)+1` or a table scan.
- Initialize the first super-admin only with environment-supplied secrets and a one-time bootstrap token. No source-controlled default password or credentials are allowed. Module/submodule definitions are seeded idempotently; non-super-admin role mappings are not invented.
- Use Workers Web Crypto with a random per-password salt and fixed versioned PBKDF2 parameters. Security parameters may not be weakened to meet a Free quota.
- Persist `new-request` and `expiry-alerts` events in D1 and atomically materialize eligible active-admin recipients at publication. Authenticated admins independently poll only assigned recipient rows, resume by notification-ID cursor, and mark those rows read; disconnection cannot lose an assigned event.
- Run expiry processing at 08:00 Asia/Riyadh using Wrangler cron `0 5 * * *`. Claims must be idempotent by Riyadh date, leased so crashed attempts can be recovered, and manually retryable by a super-admin for the same date.
- Preserve invoice UUID, current SHA-256 payload/hash-chain semantics, QR TLV bytes/Base64, XML escaping, UBL layout, and validation output byte-for-byte for fixed fixtures where the Worker runtime permits.
- Replace automatic Docker publishing with non-deploying Worker CI. Move or mark EC2/Docker/PostgreSQL assets as legacy so they cannot be mistaken for the active deployment path.
- Add `.env.example`, `.dev.vars.example`, migrations, placeholder-only Wrangler configuration, tests, and a beginner deployment guide. No account login, Cloudflare resource creation, DNS change, secret setting, or deployment is performed in this implementation task.

### Non-Functional Requirements

- **Cost:** Only Workers Free, D1 Free, Cron Triggers, included Workers observability, and existing Vercel hosting may be used. No paid binding or automatic paid upgrade is allowed.
- **Security:** Secrets, account/database IDs, passwords/hashes, JWTs, cookies, full bodies, XML, notification payloads, email/mobile/name/address, salary/bank, passport/iqama/visa/insurance data, or SQL bound values must not be committed or logged. Credentialed CORS uses exact configured origins.
- **Integrity:** D1 constraints own row-local type, range, key, and FK integrity; service transactions own cross-row domain operations; triggers own concurrency-sensitive notification, polymorphic-reference, and invoice-chain invariants.
- **Performance:** Lists and detailed report arrays are bounded, report aggregation occurs in indexed SQL, no N+1 relation loading is allowed, and each request stays below 50 D1 statements and 100 bound parameters per statement.
- **Availability:** Missing configuration, D1 quota exhaustion, and unavailable bindings fail closed with non-sensitive responses. No uptime or free-overage guarantee is claimed.
- **Maintainability:** A clean checkout can type-check, lint, test, migrate local D1, and perform a Wrangler dry-run using the committed exact-version lockfile.

### Acceptance Criteria

1. `npm ci`, type checking, linting, unit tests, Worker/D1 integration tests, schema checks, and `wrangler deploy --dry-run` pass without PostgreSQL, Docker, AWS, Cloudflare credentials, or real secrets.
2. Tracked `wrangler.example.jsonc` uses `src/worker.ts`, `nodejs_compat`, compatibility date `2025-09-15`, a `DB` D1 binding with placeholder IDs, enabled observability, `workers_dev`, and exactly `0 5 * * *`; it contains no paid resource binding or account ID. CI generates ignored `.wrangler-ci.jsonc` with dummy UUIDs for dry-run, and real deployment IDs exist only in ignored environment-specific copies.
3. The Worker default export implements `fetch(request, env, ctx)` and `scheduled(controller, env, ctx)` and the deployed graph contains no Nest bootstrap, `app.listen`, TypeORM, Socket.IO, or Nest schedule registration.
4. Fresh local migrations create every column, constraint, trigger, and index in the schema contract below; all 23 entity tables and `role_modules` are covered by a checked schema-to-source manifest, `PRAGMA foreign_key_check` is empty, and migration tracking makes reapplication non-destructive.
5. Contract tests cover all route families listed below and preserve existing success envelopes and authorization, except the explicitly listed differences.
6. Create and replacement with exactly 100 invoice, quotation, and job-sheet items use chunked multi-row inserts, remain below 50 statements and 100 bindings per statement, and roll back the entire operation when the final chunk is forced to fail.
7. Follow-up creation/update and parent closure are atomic; parent/child document writes and permission replacements are all-or-nothing.
8. Parallel creation produces unique `SR-YYYY-NNNN`, `INV-NNNN`, `QUO-NNNN`, and `JS-NNNN` values without `MAX(id)` or scans. At instant `2026-12-31T21:00:00Z`, a service request receives the Riyadh-year prefix `SR-2027-...`.
9. Money tests prove integer-halala storage and exact API mapping for document lines/totals, VAT rounding, bills/profit, salary, expenses, rental values, and reports; odometers round-trip through integer tenths.
10. Bootstrap succeeds exactly once with valid secrets, creates one active `SUPER_ADMIN` with no exposed credential/hash, seeds module/submodule definitions idempotently, and is unavailable when its token secret is removed. No default password exists.
11. Password tests enforce 12 Unicode code points minimum and 128 UTF-8 bytes maximum; hash version 1 accepts exactly PBKDF2-HMAC-SHA-256, 600,000 iterations, 16 salt bytes, and 32 derived bytes; malformed/unknown formats are rejected before derivation and comparison processes all bytes. Staging records CPU measurements and migration approval fails rather than weakening parameters if Free is insufficient.
12. Access JWTs expire after 15 minutes and refresh JWTs after 7 days; admin and phone-user refresh flows work; blocked/deleted admins fail refresh. Production cookie/CORS tests require exact `https://app.mtechcare.com` → `https://api.mtechcare.com`, an API host-only cookie with no `Domain`, and no wildcard credentialed CORS; real-browser login → reload → refresh → logout is a cutover gate, not replaced by Worker HTTP tests.
13. Fresh non-super-admin roles receive no implicit modules. Inactive users become activatable only after explicit per-user module assignment; tests prove effective modules/submodules for super-admin, custom assignment, empty role fallback, and reset-to-empty role fallback.
14. One service request creates exactly one notification with source key `new-request:<request-id>` and atomically creates recipient rows for exactly the active admins entitled at publication. Three-admin mixed-event tests prove independent read state, ordered recipient cursors, future-only grants/account creation, suppression during revoke/deactivation, an access barrier that prevents cursor advancement past suppressed assigned rows, no missed-event backfill, and restoration of previously assigned still-existing events after regrant/reactivation.
15. `read-through` processes at most the requested 1–500 caller recipient rows and returns `processedThrough`, `markedCount`, `unreadCount`, and `hasMore`; tests cover multiple batches, interleaved state for three admins, and inability to read or mark an unassigned/suppressed notification.
16. Cron contention permits one live lease per Riyadh date. Tests cover concurrent claims, crash after claim, expired-lease takeover, stale-token completion rejection, failed retry, completed-run rejection, and an authenticated same-date manual retry. At most one `expiry-alerts:<date>` event is stored.
17. Golden Worker-runtime tests compare complete UBL UTF-8 bytes, QR TLV bytes/Base64, and hashes to fixtures captured from the current service, including first invoice, create-after-latest-delete, and latest-invoice update cases.
18. Reports reject impossible dates, reversed ranges, and ranges over 366 days; default to 30 Riyadh days; paginate detailed arrays; return correct empty output; match fixture aggregates; and remain below D1 statement/rows-read budgets.
19. Structured log tests verify request ID, route template, method, status, duration, environment, safe D1 category, and scheduled outcome while proving all prohibited sensitive values and headers are absent.
20. The Docker push workflow cannot run, active docs point to Workers/D1, legacy files are unmistakably non-active, and the beginner guide contains no real account ID, database ID, token, password, or DNS mutation performed by automation.
21. Public-rate-limit integration tests prove that, per canonical IP and fixed window, exactly 10 create attempts/900 seconds and 30 lookup attempts/300 seconds pass the limiter under concurrency; the next calls receive generic `429` plus correct integer `Retry-After`. Create, lookup, auth, bootstrap, and operation-specific unknown buckets remain distinct; rejected calls execute no service-request query, write, counter allocation, or notification operation; cleanup removes no more than 500 expired rows.
22. Migration checks reject any stored `DATE` not exactly ten ASCII bytes shaped `YYYY-MM-DD` and any stored `TS` not exactly 24 ASCII bytes shaped `YYYY-MM-DDTHH:mm:ss.sssZ`. Service tests accept `2024-02-29`, reject `2023-02-29` and February 30, normalize a valid offset and a missing-millisecond timestamp through `toISOString()`, reject direct noncanonical persistence, and round-trip canonical values byte-for-byte.
23. Dummy-password tests prove isolate initialization requests independent random 16-byte salt and 32-byte comparison arrays, creates only a syntactically valid in-memory v1 record, and gives validly shaped unknown accounts the same configured derivation count and full 32-byte comparison work as known accounts; tests and snapshots contain none of the generated bytes.
24. Browser release evidence records successful login → full reload → refresh → logout in a supported browser on final `app.mtechcare.com` → `api.mtechcare.com`; absent that evidence, production cutover fails. A `vercel.app`-only frontend is documented and tested as unsupported for cookie refresh until a separate non-cookie refresh/CSRF design is reviewed.
25. Notification tests use three admins and mixed `new-request`/`expiry-alerts` publication around account creation, grant, revoke, regrant, deactivation, and reactivation. Assertions prove publication-time recipient rows, notification-ID order, no backfill, no fetch/read while suppressed, no cursor/read-through advancement across the first suppressed assigned row, restoration only for previously assigned still-existing events, and cascade removal on admin deletion.

### Out of Scope

- Importing, retaining, reconciling, backing up, reviving, or deleting old RDS/EC2 data or resources.
- Logging into Cloudflare/Vercel, creating resources or secrets, changing `mtechcare.com` DNS, deploying staging/production, or modifying the Vercel frontend in this backend task.
- Socket.IO compatibility, Durable Objects, WebSockets, push delivery, uploads/R2, email, SMS, payment processing, and other external integrations.
- Paid fallback operation, guaranteed service after quota exhaustion, enterprise log retention, or formal Saudi legal/data-residency certification.
- New business functionality or a redesign of existing statuses, calculations, report meaning, seller data, or ZATCA compliance beyond runtime compatibility and correctness.

## Technical Design

### Overview and locked technology stack

The deployed application will be a Worker-native TypeScript API using Hono and direct D1 prepared statements. NestJS on a Node HTTP compatibility adapter was considered and rejected: it would preserve decorators but still require replacement of TypeORM, Passport lifecycle assumptions, Socket.IO, process scheduling, cookies, and database transactions while adding bundle/startup overhead. Hono provides route grouping and middleware without a server lifecycle and makes D1 statement use visible enough to enforce the Free limits.

The locked stack is Cloudflare Workers Free, D1 Free/SQLite, Cron Triggers, Workers observability, TypeScript, Hono, Web Crypto, Node compatibility only for verified `Buffer`/crypto parity, `fast-xml-parser`, npm, Vitest, and Cloudflare’s Vitest Workers pool. There is no ORM or external database. Exact package versions are `hono@4.9.8`, `fast-xml-parser@5.5.9`, `wrangler@4.35.0`, `@cloudflare/workers-types@4.20250906.0`, `vitest@3.2.4`, `@cloudflare/vitest-pool-workers@0.8.66`, and `typescript@5.7.3`. Implementation uses `npm install --save-exact` and `npm install --save-dev --save-exact`, pins all retained direct dependencies, and commits the regenerated `package-lock.json`. A version change requires design review.

### Files and integration points

`package.json` will replace Nest start/build/seed scripts with `typecheck`, `lint`, `test`, `test:unit`, `test:integration`, `dev`, `deploy:dry-run`, `db:migrate:local`, `db:migrate:staging`, and `db:migrate:production`. `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, and `eslint.config.mjs` will target Worker ES modules and Cloudflare types.

The concrete runtime layout is:

- `src/worker.ts`: sole runtime entry; default `fetch` and `scheduled` export.
- `src/app.ts`: Hono graph, `/api` prefix, CORS, request IDs, safe logs, error mapping, and route registration.
- `src/env.ts`: `Env` bindings and strict configuration parsing.
- `src/http/{errors,validation,cors,logging,pagination}.ts`: common contracts and redaction.
- `src/db/{types,client,mappers,counters,bulk}.ts`: D1 rows, statement helpers, money/date mapping, counters, and bounded multi-row inserts.
- `src/auth/{routes,service,password,jwt,rbac,rate-limit,schemas}.ts`: phone/admin auth, refresh, bootstrap, JWT, PBKDF2, HMAC-keyed D1 abuse controls, and permissions.
- Domain folders `src/service-request`, `src/bill`, `src/invoice`, `src/quotation`, `src/job-sheet`, `src/enquiries`, `src/organization`, `src/reports`, and `src/notifications`, each with routes, validation schemas, services, and explicit repositories.
- `src/invoice/ubl.ts`: extracted XML/hash/TLV behavior.
- `src/docs/{openapi,ui}.ts`: bundled OpenAPI and docs; no runtime file reads.
- `migrations/d1/0001_fresh_schema.sql`, `0002_seed_definitions.sql`, and `migrations/d1/schema-source-manifest.md`.
- `wrangler.example.jsonc`, ignored `wrangler.{local,staging,production}.jsonc` copies, `.dev.vars.example`, `.env.example`, `vitest.config.ts`, fixtures/tests, `docs/cloudflare-deployment.md`, and a project-specific `README.md`.

Once compatibility tests exist, old Nest controllers/services/modules, TypeORM entities, Passport strategy, gateway, scheduler, and Nest-only specs are removed from the deployed source. `Dockerfile`, `docker-compose.yml`, `postgresql.conf`, and PostgreSQL migrations move to `legacy/ec2/` with “NOT ACTIVE — DO NOT DEPLOY.” `.github/workflows/deploy.yml` is removed and `.github/workflows/validate.yml` performs validation only; production deployment is never push-triggered.

### Worker lifecycle and Wrangler

`src/worker.ts` creates the immutable route graph at module scope. `fetch` calls `app.fetch(request, env, ctx)`. `scheduled` calls `ctx.waitUntil(runDailyExpiry(env, controller.scheduledTime))`. It never creates a connection pool or stores request state globally.

`wrangler.example.jsonc` has this effective shape. It is documentation/source for ignored deployment configs and is not itself passed to deploy until its placeholder IDs have been replaced in an ignored copy:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "mytechcare-api-staging",
  "main": "src/worker.ts",
  "compatibility_date": "2025-09-15",
  "compatibility_flags": ["nodejs_compat"],
  "workers_dev": true,
  "observability": { "enabled": true, "logs": { "enabled": true, "invocation_logs": true } },
  "triggers": { "crons": ["0 5 * * *"] },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "mytechcare-staging",
    "database_id": "REPLACE_WITH_STAGING_D1_DATABASE_ID",
    "migrations_dir": "migrations/d1"
  }],
  "vars": {
    "APP_ENV": "staging",
    "ALLOWED_ORIGINS": "https://REPLACE_WITH_VERCEL_STAGING_HOST",
    "COOKIE_DOMAIN": "",
    "COOKIE_SAME_SITE": "None",
    "BUSINESS_TIME_ZONE": "Asia/Riyadh",
    "REPORT_DEFAULT_DAYS": "30",
    "REPORT_MAX_DAYS": "366",
    "SELLER_NAME": "REPLACE_WITH_SELLER_NAME",
    "SELLER_VAT_NUMBER": "REPLACE_WITH_SELLER_VAT_NUMBER",
    "SELLER_CR_NUMBER": "REPLACE_WITH_SELLER_CR_NUMBER",
    "SELLER_ADDRESS": "REPLACE_WITH_SELLER_ADDRESS"
  },
  "env": {
    "production": {
      "name": "mytechcare-api",
      "workers_dev": true,
      "d1_databases": [{
        "binding": "DB",
        "database_name": "mytechcare-production",
        "database_id": "REPLACE_WITH_PRODUCTION_D1_DATABASE_ID",
        "migrations_dir": "migrations/d1"
      }],
      "vars": {
        "APP_ENV": "production",
        "ALLOWED_ORIGINS": "https://app.mtechcare.com",
        "COOKIE_DOMAIN": "",
        "COOKIE_SAME_SITE": "Lax",
        "BUSINESS_TIME_ZONE": "Asia/Riyadh",
        "REPORT_DEFAULT_DAYS": "30",
        "REPORT_MAX_DAYS": "366",
        "SELLER_NAME": "REPLACE_WITH_SELLER_NAME",
        "SELLER_VAT_NUMBER": "REPLACE_WITH_SELLER_VAT_NUMBER",
        "SELLER_CR_NUMBER": "REPLACE_WITH_SELLER_CR_NUMBER",
        "SELLER_ADDRESS": "REPLACE_WITH_SELLER_ADDRESS"
      }
    }
  }
}
```

Environment bindings are repeated because Wrangler environment bindings are non-inheritable. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RATE_LIMIT_HMAC_SECRET`, `BOOTSTRAP_TOKEN`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` are Wrangler secrets. No `account_id` or active custom-domain route is committed. `src/env.ts` parses `ALLOWED_ORIGINS` as a comma-separated list of complete HTTPS origins and rejects duplicates, paths, wildcards, credentials, or `null`. In production it additionally requires every frontend hostname to be exactly configured and beneath `mtechcare.com`, requires `COOKIE_DOMAIN=''` and `COOKIE_SAME_SITE='Lax'`, and documents `app.mtechcare.com` as the default example; invalid configuration returns safe `503 configuration_unavailable` before route logic and is logged once per isolate without values.

### HTTP routes and authorization

All existing route methods remain, with static routes registered before parameter routes. The fixed inventory and RBAC metadata are:

- Public/utility: `GET /api`, `GET /api/docs`, added `GET /api/openapi.json`; `POST /api/auth/login`, `POST /api/auth/admin/login`, `POST /api/auth/refresh`, and `POST /api/auth/logout`.
- Current identity: `GET /api/auth/admin/permissions` [JWT]. Auth management: `GET /api/auth/admin/users`, `GET /api/auth/admin/modules`, `GET /api/auth/admin/users/modules`, `POST /api/auth/admin/users/modules`, `POST /api/auth/admin/users/:userId/reset-modules`, `GET /api/auth/admin/submodules`, `POST /api/auth/admin/users/submodules`, `POST /api/auth/admin/users/:userId/reset-submodules`, `POST /api/auth/admin/users`, `PATCH /api/auth/admin/users/:userId`, `PATCH /api/auth/admin/users/:userId/block-login`, and `DELETE /api/auth/admin/users/:userId` [AUTH].
- Service requests: public `POST /api/service-request` and `GET /api/service-request/by-mobile`; authenticated `POST /api/admin/service-request`, `POST /api/admin/service-request/manual`, `GET /api/admin/service-request`, `GET /api/admin/service-request/assigned`, `GET /api/admin/service-request/:id`, `PUT /api/admin/service-request/:id`, and `DELETE /api/admin/service-request/:id` [CLIENTS/SERVICE_REQUESTS].
- Bills/repair: `GET /api/bill/:mobile` and `POST /api/bill` [CLIENTS/BILLS], plus `POST /api/repair-item/bill` [CLIENTS/REPAIR_ITEMS].
- Invoices: `POST /api/bill/invoice`, `GET /api/bill/invoice`, `GET /api/bill/invoice/next-number`, `GET /api/bill/invoice/by-service-request/:serviceRequestId`, `GET /api/bill/invoice/:id`, `GET /api/bill/invoice/:id/ubl`, `GET /api/bill/invoice/:id/ubl/validate`, `POST /api/bill/invoice/ubl/validate`, `PUT /api/bill/invoice/:id`, and `DELETE /api/bill/invoice/:id` [BILLING/INVOICES].
- Job sheets: `POST /api/bill/job-sheet`, `GET /api/bill/job-sheet`, `GET /api/bill/job-sheet/next-number`, `GET /api/bill/job-sheet/by-service-request/:serviceRequestId`, and `GET|PUT|DELETE /api/bill/job-sheet/:id` [BILLING/JOB_SHEETS]. Quotations expose the analogous collection, `next-number`, `by-service-request/:serviceRequestId`, and ID routes under `/api/bill/quotation` [BILLING/QUOTATIONS].
- Enquiries: `GET|POST /api/enquire/b2c`, `PUT|DELETE /api/enquire/b2c/:id` [ENQUIRE/B2C_ENQUIRY]; `GET|POST /api/enquire/corporate`, `GET /api/enquire/corporate/all`, `PUT|DELETE /api/enquire/corporate/:id` [ENQUIRE/CORPORATE_ENQUIRY]; `GET|POST /api/enquire/followup`, `PUT|DELETE /api/enquire/followup/:id` [ENQUIRE/ENQUIRY_FOLLOWUP].
- Stores/staff: `GET|POST /api/store`, `GET /api/store/next-code`, `PUT|DELETE /api/store/:id` [ORGANIZATION/STORE_DETAILS]; `GET|POST /api/staff`, `GET /api/staff/next-code`, `GET /api/staff/by-store-code`, `PUT|DELETE /api/staff/:id` [ORGANIZATION/STAFF].
- Vehicles: `GET|POST /api/organization/vehicles`, `GET /api/organization/vehicles/report`, `GET|PUT|DELETE /api/organization/vehicles/:id`, `GET|POST /api/organization/vehicles/:id/expenses`, and `PUT|DELETE /api/organization/vehicles/expenses/:expenseId` [ORGANIZATION/VEHICLES]. Rentals: `GET|POST /api/organization/rental-vehicles`, `GET|PUT|DELETE /api/organization/rental-vehicles/:id`, and `PUT /api/organization/rental-vehicles/:id/return` [ORGANIZATION/RENTAL_VEHICLES].
- Reports: `GET /api/admin/dashboard` [REPORTS plus DASHBOARD_VIEW] and `GET /api/sales-report/{dashboard|financial|service|customer|quotation|invoice|jobsheet|staff-performance|store}` [REPORTS/SALES_REPORT].
- Notifications: protected existing `GET /api/notifications/expiry-alerts` [ORGANIZATION/STAFF], plus polling/read/retry routes described below. Added `POST /api/setup/bootstrap` is bootstrap-token protected rather than JWT protected.

A route metadata table in `src/auth/rbac.ts` reproduces controller `RequireModule`/`RequireSubmodule` values, including `REPORTS` plus `DASHBOARD_VIEW` for `/api/admin/dashboard`. `SUPER_ADMIN` bypasses module/submodule/store restrictions. Non-super-admin vehicle/rental access is restricted to `admin_users.store_id`; no store returns empty lists and `403` for direct records. View-only users are centrally denied every authenticated POST/PUT/PATCH/DELETE; this intentionally closes omissions in current store/staff controllers.

Module precedence remains: super-admin constants; otherwise non-empty `user_modules`; otherwise `role_modules`. Submodule precedence remains non-empty `user_submodules`; otherwise all submodules under effective modules. Because `role_modules` has no authoritative seed, all non-super-admin role fallbacks initially resolve to empty. A newly created non-super-admin is inactive; the super-admin assigns user modules/submodules and then activates it with the existing PATCH route. Resetting modules returns the user to the empty role fallback. Permission replacements are single transactions and self/super-admin modification prohibitions remain.

### Input validation

Validation is explicit TypeScript schema code, rejects unknown JSON keys, and returns the Nest-compatible `{statusCode:400,message:[...],error:"Bad Request"}` shape. JSON must be valid UTF-8 `application/json` and at most 256 KiB (`415`, `400`, or `413` otherwise). Required strings are present, trimmed only where current code normalizes them, non-empty, and bounded by the schema column; optional nullable fields accept `null` only where DTO/service behavior currently clears them.

Common rules are:

- IDs are base-10 integers 1–2,147,483,647. UUIDs are canonical. Invalid path/query values return `400`.
- Dates accept exactly ten ASCII input bytes `YYYY-MM-DD`; shared Gregorian calendar code requires year 0001–9999, month 01–12, the valid day for that month, and the normal divisible-by-4 except centuries unless divisible-by-400 leap-year rule before binding. Timestamps accept a strict RFC 3339 date/time with seconds, an explicit `Z` or `±HH:mm` offset, and zero to three fractional-second digits; hours are 00–23, minutes/seconds 00–59 (no leap second), and offsets are at most ±14:00 with minute `00` at the 14-hour limit. The same calendar/range validator rejects rollover, then normalization uses `Date.prototype.toISOString()` and binds exactly `YYYY-MM-DDTHH:mm:ss.sssZ`. A valid timestamp without milliseconds is accepted and normalized to `.000Z`; stored or repository-internal noncanonical timestamp text is rejected.
- Money accepts finite values with at most two decimals and within source precision: 10,2 fields up to 99,999,999.99 SAR and 12,2 expenses up to 9,999,999,999.99 SAR. Bill cost/customer prices retain numeric-string input. Conversion to integer halalas occurs at the HTTP boundary. Quantity is an integer 1–1,000; odometers are non-negative with at most one decimal; years of experience is a non-negative integer.
- Entity `varchar(n)` limits are enforced. Unbounded names/device/status/payment/language fields cap at 255, mobile at 50, and text/address/notes/requirements at 10,000. Raw XML caps at 256 KiB.
- Passwords require at least 12 Unicode code points and at most 128 UTF-8 bytes. This exact rule applies to bootstrap, admin create/update, and credential-shape validation. Login failures remain generic.
- Emails are syntactically valid, lowercased/trimmed, and at most 254 characters. Phone login retains `^(?:\+966|966|0)?5\d{8}$` and stores nine normalized digits.
- Roles and module/submodule values are checked constants with no duplicates. Vehicle/rental/payment/expense enums match entity constants.
- Pagination defaults to page 1/limit 20 and caps limit at 100. Search is 1–50 UTF-8 bytes; `%`, `_`, and escape characters are escaped for literal substring search.
- Reports default to the trailing 30 Riyadh business dates, permit one boundary by deriving a 30-day counterpart, require `start <= end`, cap inclusive ranges at 366 days, and paginate detail arrays at 50/default and 100/max.
- Notification query `after` is integer >=0, limit 1–100/default 50, and `unreadOnly` is boolean text. Expiry `days` is 0–365/default 30. Read IDs/cursors are positive integers. Retry business date is a real `YYYY-MM-DD` and cannot be later than current Riyadh date.
- Document create arrays are invoice/quotation 1–100 and job sheet 0–100. Invoice/quotation update arrays are 1–100 when present. Job-sheet update preserves current behavior: omitted or empty `items` leaves existing rows unchanged; 1–100 replaces all.
- Invoice accepts optional caller `uuid`, `icv`, `previousHash`, and `issueTimestamp` as today. UUID must be unique; ICV is 1–100 characters and intentionally non-unique, matching the entity. If omitted, the server assigns an atomic default ICV. Service-request links are positive integer strings.
- Service-request public create requires name, mobile, device, deviceDisplayName, locationType, location, language, dateTime, and timestamp. Manual create requires name/mobile/device/location. The system, never client timestamps, determines the Riyadh year for its reference number.
- Enquiries require party name, enquiredDate, and requirement; mobileNumber, location, enquiryType, and status are optional/nullable. Follow-ups require an existing parent, `b2c|corporate`, number 1–3, date, and status.
- Rental return permits only `actualReturnDate` and `odometerReturn`; return/end-before-start, future-invalid expense dates, and negative odometers return `400`.
- Credentialed request origins must exactly equal a normalized origin in `ALLOWED_ORIGINS`; wildcard, `null`, suffix matches, credentials in URL, path/query/fragment, and arbitrary reflection are configuration errors or denied requests. Production accepts only explicitly configured same-site frontend origins under `mtechcare.com`, with `https://app.mtechcare.com` as the documented value; `https://*.vercel.app` is not an implicit or suffix-based allowance.

### Fresh D1 schema contract

`0001_fresh_schema.sql` enables `PRAGMA foreign_keys=ON`. Every listed property is an actual column; `NULL` is explicit. `DATE` below means SQLite `TEXT` constrained to exactly ten ASCII bytes `YYYY-MM-DD` with `CHECK(length(CAST(column AS BLOB))=10 AND column GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`. `TS` means SQLite `TEXT` constrained to exactly the 24-byte UTC output of JavaScript `Date.prototype.toISOString()`, `YYYY-MM-DDTHH:mm:ss.sssZ`, with `CHECK(length(CAST(column AS BLOB))=24 AND column GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')`; nullable columns use `column IS NULL OR (...)`. These checks intentionally enforce practical byte length and ASCII shape only. Shared code in `src/http/validation.ts` owns Gregorian leap-year/calendar, clock, and offset semantics before any repository bind because SQLite date normalization is not the semantic authority; `src/db/mappers.ts` asserts canonical output again at the persistence boundary. `TEXT(n)` means SQLite `TEXT` with `CHECK(length(column)<=n)`; required text also checks `length(column)>=1`. For compactness, `CHECK IN(...)`, `CHECK >=n`, `CHECK >n`, and `CHECK BETWEEN a AND b` below mean valid column-named SQL such as `CHECK(is_active IN (0,1))` and `CHECK(amount_halalas>0)`, never the shorthand literally. Every entity ID is `INTEGER PRIMARY KEY AUTOINCREMENT`. Money columns end `_halalas` and are integers; API mappers expose original names.

**Identity, organization, and requests**

- `users`: `id`; `phone_number TEXT(50) NOT NULL UNIQUE`; `is_active INTEGER NOT NULL DEFAULT 1 CHECK IN(0,1)`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`; `last_login_at TS NULL`.
- `stores`: `id`; `store_name TEXT(255) NOT NULL`; `store_code TEXT(20) NOT NULL UNIQUE`; `store_location TEXT(500) NOT NULL`; `company_registration_number TEXT(100) NULL`; `expiry_date DATE NULL`; `created_at TS NOT NULL`.
- `admin_users`: `id`; `name TEXT(255) NULL`; `email TEXT(254) NOT NULL`; `password_hash TEXT NOT NULL`; `is_active INTEGER NOT NULL DEFAULT 1 CHECK IN(0,1)`; `created_at TS NOT NULL`; `last_login_at TS NULL`; `role TEXT(50) NOT NULL DEFAULT 'ADMIN' CHECK IN('SUPER_ADMIN','ADMIN','MANAGER','SUPPORT','VIEWER')`; `store_id INTEGER NULL REFERENCES stores(id) ON DELETE SET NULL`; `view_only INTEGER NOT NULL DEFAULT 0 CHECK IN(0,1)`. Unique index `lower(email)`.
- `staff`: `id`; `emp_code TEXT(20) NOT NULL UNIQUE`; `name TEXT(255) NOT NULL`; `store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT`; nullable `iqama_id TEXT(50)`, `iqama_expiry_date DATE`, `position TEXT(100)`, `department TEXT(100)`, `passport_number TEXT(50)`, `passport_expiry_date DATE`, `date_of_birth DATE`, `nationality TEXT(100)`, `gender TEXT(20)`, `marital_status TEXT(50)`, `blood_group TEXT(10)`, `mobile_primary TEXT(20)`, `mobile_secondary TEXT(20)`, `email TEXT(255)`, `current_address TEXT`, `emergency_contact_name TEXT(255)`, `emergency_contact_number TEXT(20)`, `date_of_join DATE`, `employment_type TEXT(50)`, `salary_halalas INTEGER CHECK >=0`, `bank_account_number TEXT(50)`, `bank_name TEXT(100)`, `bank_iban TEXT(50)`, `working_hours_shift TEXT(50)`, `visa_number TEXT(50)`, `visa_expiry_date DATE`, `sponsor_name TEXT(255)`, `border_number TEXT(50)`, `insurance_number TEXT(50)`, `insurance_expiry_date DATE`, `qualification_education TEXT(255)`, `years_of_experience INTEGER CHECK >=0`, `previous_employer TEXT(255)`, `previous_employer_salary_halalas INTEGER CHECK >=0`, `skills_certifications TEXT`, `driving_license_number TEXT(50)`, `driving_license_expiry DATE`, `employee_status TEXT(50) DEFAULT 'Active'`, `probation_period_end_date DATE`, `contract_end_date DATE`, `last_working_day DATE`, and `notes_remarks TEXT`; `created_at TS NOT NULL`.
- `service_requests`: `id`; `uuid TEXT(36) NOT NULL UNIQUE`; `reference_number TEXT(50) NOT NULL UNIQUE`; `name TEXT(255) NOT NULL`; `mobile TEXT(255) NOT NULL`; `device TEXT(255) NOT NULL`; `device_display_name TEXT(255) NOT NULL`; `other_device TEXT(255) NULL`; `location_type TEXT(255) NOT NULL`; `location TEXT(255) NOT NULL`; `current_location TEXT(255) NULL`; `manual_location TEXT(255) NULL`; `description TEXT NULL`; `language TEXT(255) NOT NULL`; `date_time TEXT(255) NOT NULL`; `timestamp TS NOT NULL`; `status TEXT(50) NULL DEFAULT 'Request received'`; `assigned_staff_id INTEGER NULL REFERENCES staff(id) ON DELETE SET NULL`; `created_at TS NOT NULL`.
- `repair_items`: `id`; `name TEXT(255) NOT NULL`; `device_type TEXT(255) NOT NULL`.
- `bills`: `id`; `user_id INTEGER NULL REFERENCES service_requests(id) ON DELETE CASCADE`; `cost_price_halalas INTEGER NOT NULL CHECK >=0`; `selling_price_halalas INTEGER NOT NULL CHECK >=0`; `mobile TEXT(50) NULL`; `notes TEXT NULL`; `name TEXT(255) NOT NULL`; `created_at TS NOT NULL`.

**Enquiries and RBAC**

- `b2c_enquiries`: `id`; `customer_name TEXT(255) NOT NULL`; `enquired_date DATE NOT NULL`; `requirement TEXT NOT NULL`; `additional_notes TEXT NULL`; `mobile_number TEXT(20) NULL`; `location TEXT(255) NULL`; `enquiry_type TEXT(50) NULL`; `status TEXT(50) NULL DEFAULT 'Pending'`; `created_at TS NOT NULL`.
- `corporate_enquiries`: `id`; `corporate_name TEXT(255) NOT NULL`; `enquired_date DATE NOT NULL`; `requirement TEXT NOT NULL`; `additional_notes TEXT NULL`; `mobile_number TEXT(20) NULL`; `location TEXT(255) NULL`; `enquiry_type TEXT(50) NULL`; `status TEXT(50) NULL DEFAULT 'Pending'`; `created_at TS NOT NULL`.
- `enquiry_followups`: `id`; `enquiry_id INTEGER NOT NULL`; `enquiry_type TEXT(20) NOT NULL CHECK IN('b2c','corporate')`; `followup_number INTEGER NOT NULL CHECK BETWEEN 1 AND 3`; `followup_date DATE NOT NULL`; `followup_status TEXT(50) NOT NULL`; `description TEXT NULL`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`; `UNIQUE(enquiry_type,enquiry_id,followup_number)`. Insert/update triggers reject a missing matching parent; parent-delete triggers cascade only matching polymorphic follow-ups.
- `modules`: `id`; `code TEXT(50) NOT NULL UNIQUE`; `name TEXT(255) NULL`; `created_at TS NOT NULL`.
- `submodules`: `id`; `code TEXT(50) NOT NULL UNIQUE`; `name TEXT(255) NULL`; `module_code TEXT(50) NOT NULL REFERENCES modules(code) ON UPDATE CASCADE ON DELETE CASCADE`; `created_at TS NOT NULL`.
- `role_modules`: `role TEXT(50) NOT NULL CHECK IN('ADMIN','MANAGER','SUPPORT','VIEWER')`; `module_code TEXT(50) NOT NULL REFERENCES modules(code) ON UPDATE CASCADE ON DELETE CASCADE`; `created_at TS NOT NULL`; primary key `(role,module_code)`. Migration seeds no rows.
- `user_modules`: `id`; `user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE`; `module_code TEXT(50) NOT NULL REFERENCES modules(code) ON UPDATE CASCADE ON DELETE CASCADE`; `created_at TS NOT NULL`; unique `(user_id,module_code)`.
- `user_submodules`: `id`; `user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE`; `submodule_code TEXT(50) NOT NULL REFERENCES submodules(code) ON UPDATE CASCADE ON DELETE CASCADE`; `created_at TS NOT NULL`; unique `(user_id,submodule_code)`.

**Invoices, quotations, and job sheets**

- `invoices`: `id`; `invoice_number TEXT(50) NOT NULL UNIQUE`; `invoice_date DATE NOT NULL`; `uuid TEXT(64) NULL UNIQUE`; `icv TEXT(100) NULL` (not unique); `previous_hash TEXT NULL`; `invoice_hash TEXT NOT NULL` (internal chain material); `chain_version INTEGER NOT NULL CHECK >=0` (internal optimistic ownership value); `issue_timestamp TS NULL`; `payment_method TEXT(50) NOT NULL DEFAULT 'Cash'`; `customer_name TEXT(255) NOT NULL`; `customer_mobile TEXT(50) NULL`; `customer_vat_number TEXT(50) NULL`; `customer_address TEXT NULL`; `subtotal_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `vat_rate_bps INTEGER NOT NULL DEFAULT 1500 CHECK BETWEEN 0 AND 10000`; `vat_amount_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `grand_total_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `notes TEXT NULL`; `service_request_id INTEGER NULL REFERENCES service_requests(id) ON DELETE SET NULL`; `status TEXT(50) NOT NULL DEFAULT 'draft'`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`.
- `invoice_items`: `id`; `invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE`; `sl_no INTEGER NOT NULL CHECK >=1`; `product TEXT(255) NOT NULL`; `quantity INTEGER NOT NULL DEFAULT 1 CHECK BETWEEN 1 AND 1000`; `unit_price_halalas INTEGER NOT NULL CHECK >=0`; `vat_amount_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `line_total_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; unique `(invoice_id,sl_no)`.
- `quotations`: `id`; `quotation_number TEXT(50) NOT NULL UNIQUE`; `quotation_date DATE NOT NULL`; `valid_until DATE NULL`; `customer_name TEXT(255) NOT NULL`; `customer_mobile TEXT(50) NULL`; `customer_vat_number TEXT(50) NULL`; `customer_address TEXT NULL`; `subtotal_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `vat_rate_bps INTEGER NOT NULL DEFAULT 1500 CHECK BETWEEN 0 AND 10000`; `vat_amount_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `grand_total_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `notes TEXT NULL`; `service_request_id INTEGER NULL REFERENCES service_requests(id) ON DELETE SET NULL`; `status TEXT(50) NOT NULL DEFAULT 'draft'`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`.
- `quotation_items`: `id`; `quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE`; `sl_no INTEGER NOT NULL CHECK >=1`; `product TEXT(255) NOT NULL`; `quantity INTEGER NOT NULL DEFAULT 1 CHECK BETWEEN 1 AND 1000`; `unit_price_halalas INTEGER NOT NULL CHECK >=0`; `vat_amount_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `line_total_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; unique `(quotation_id,sl_no)`.
- `job_sheets`: `id`; `job_sheet_number TEXT(50) NOT NULL UNIQUE`; `service_request_id INTEGER NULL REFERENCES service_requests(id) ON DELETE SET NULL`; `customer_name TEXT(255) NOT NULL`; `customer_mobile TEXT(50) NULL`; `device TEXT(255) NULL`; `device_display_name TEXT(255) NULL`; `problem_reported TEXT NULL`; `condition_on_receive TEXT NULL`; `accessories TEXT NULL`; `estimated_cost_halalas INTEGER NULL CHECK >=0`; `estimated_delivery_date DATE NULL`; `assigned_technician_id INTEGER NULL REFERENCES staff(id) ON DELETE SET NULL`; `work_done TEXT NULL`; `status TEXT(50) NOT NULL DEFAULT 'received'`; `received_date DATE NULL`; `completed_date DATE NULL`; `delivered_date DATE NULL`; `notes TEXT NULL`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`.
- `job_sheet_items`: `id`; `job_sheet_id INTEGER NOT NULL REFERENCES job_sheets(id) ON DELETE CASCADE`; `part_name TEXT(255) NOT NULL`; `quantity INTEGER NOT NULL DEFAULT 1 CHECK BETWEEN 1 AND 1000`; `unit_cost_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `total_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`.

**Vehicles**

- `vehicles`: `id`; `vehicle_number TEXT(50) NOT NULL`; `model TEXT(255) NOT NULL`; `fuel_type TEXT(20) NOT NULL CHECK IN('PETROL','DIESEL','ELECTRIC','HYBRID')`; `store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT`; `authorized_staff_id INTEGER NULL REFERENCES staff(id) ON DELETE SET NULL`; `status TEXT(20) NOT NULL DEFAULT 'ACTIVE' CHECK IN('ACTIVE','INACTIVE')`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`; `deleted_at TS NULL`. Partial unique index `upper(vehicle_number) WHERE deleted_at IS NULL`.
- `vehicle_expenses`: `id`; `vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT`; `store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT`; `expense_type TEXT(20) NOT NULL CHECK IN('FUEL','MAINTENANCE','REPAIR','INSURANCE','OTHER')`; `amount_halalas INTEGER NOT NULL CHECK >0`; `expense_date DATE NOT NULL`; `description TEXT NULL`; `added_by INTEGER NULL REFERENCES admin_users(id) ON DELETE SET NULL`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`; `deleted_at TS NULL`.
- `rental_vehicles`: `id`; `vehicle_number TEXT(50) NOT NULL`; `model TEXT(255) NOT NULL`; `fuel_type TEXT(20) NOT NULL`; `rental_company TEXT(255) NOT NULL`; `rental_company_contact TEXT(100) NULL`; `contract_number TEXT(100) NULL`; `start_date DATE NOT NULL`; `end_date DATE NOT NULL`; `actual_return_date DATE NULL`; `daily_rate_halalas INTEGER NOT NULL CHECK >0`; `total_cost_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `deposit_amount_halalas INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `payment_status TEXT(20) NOT NULL DEFAULT 'PENDING' CHECK IN('PAID','PARTIAL','PENDING')`; `store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT`; `assigned_staff_id INTEGER NULL REFERENCES staff(id) ON DELETE SET NULL`; `odometer_start_tenths INTEGER NULL CHECK >=0`; `odometer_return_tenths INTEGER NULL CHECK >=0`; `status TEXT(20) NOT NULL DEFAULT 'ACTIVE' CHECK IN('ACTIVE','RETURNED','OVERDUE','CANCELLED')`; `notes TEXT NULL`; `created_at TS NOT NULL`; `updated_at TS NOT NULL`; `deleted_at TS NULL`.

**Operational tables**

- `number_counters`: `kind TEXT NOT NULL CHECK IN('service-request','invoice','invoice-icv','quotation','job-sheet','store','staff')`; `scope TEXT NOT NULL DEFAULT ''`; `next_value INTEGER NOT NULL CHECK >=1`; `updated_at TS NOT NULL`; primary key `(kind,scope)`. Static seeds are invoice/ICV/quotation/job-sheet `1`, store `1`, staff `100`; service-request year scopes are inserted on demand.
- `invoice_chain_state`: one row `id INTEGER PRIMARY KEY CHECK(id=1)`; `last_invoice_id INTEGER NULL REFERENCES invoices(id) ON DELETE SET NULL`; `last_hash TEXT NULL`; `version INTEGER NOT NULL DEFAULT 0 CHECK >=0`; `updated_at TS NOT NULL`.
- `notifications`: `id`; `type TEXT NOT NULL CHECK IN('new-request','expiry-alerts')`; `source_key TEXT NOT NULL UNIQUE`; `payload_json TEXT NOT NULL CHECK(json_valid(payload_json))`; `created_at TS NOT NULL`.
- `notification_recipients`: `notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE`; `admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE`; `read_at TS NULL`; primary key `(notification_id,admin_user_id)`. A row is the immutable-at-publication assignment; `read_at IS NULL` is unread.
- `scheduled_runs`: `job_name TEXT NOT NULL`; `business_date DATE NOT NULL`; `state TEXT NOT NULL CHECK IN('running','completed','failed')`; `attempt_count INTEGER NOT NULL CHECK >=1`; `attempt_token TEXT NULL`; `lease_expires_at TS NULL`; `started_at TS NOT NULL`; `completed_at TS NULL`; `failed_at TS NULL`; `error_code TEXT(50) NULL`; `alert_count INTEGER NULL CHECK >=0`; primary key `(job_name,business_date)`.
- `bootstrap_state`: singleton `id INTEGER PRIMARY KEY CHECK(id=1)`; `completed_at TS NOT NULL`; `admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT`.
- `auth_rate_limits`: `key_hash TEXT NOT NULL`; `window_started_at TS NOT NULL`; `window_seconds INTEGER NOT NULL CHECK(window_seconds IN (300,900))`; `attempt_count INTEGER NOT NULL CHECK(attempt_count>=1)`; `expires_at TS NOT NULL`; primary key `(key_hash,window_started_at,window_seconds)` and index `(expires_at)`. Only HMAC-derived bucket keys are stored.

Indexes cover every FK and route predicate: created/date/status/mobile/assigned staff/device for requests and documents; staff store/status plus all expiry dates; enquiry dates/status/type/mobile and follow-up parent order; child parent/order; permission user/role; active vehicle/rental/expense store/date/status; notification ID plus `notification_recipients(admin_user_id,notification_id)` and `(admin_user_id,read_at,notification_id)` polling/unread lookups; scheduled state/lease/date; and `auth_rate_limits(expires_at)`. Integration tests assert representative `EXPLAIN QUERY PLAN` output. `schema-source-manifest.md` checks every entity and both staff migration files against this list, documenting D1-only columns and intentional constraints.

`0002_seed_definitions.sql` idempotently upserts the eight modules and 17 submodules from `modules.constants.ts`, including `STORE_DETAILS`; it does not seed `role_modules`. Definition seed changes are data migrations, not request-time startup work.

### D1 repositories, bulk writes, and invariants

Repositories accept `D1Database`, expose domain-specific methods, use constant SQL plus `.bind()`, and map rows explicitly. Sort columns are selected only from code maps. SQLite messages and bound values are never exposed or logged.

D1 `batch()` owns all-or-nothing document parent/child writes, item replacement, follow-up/parent closure, permission replacement, service-request deletion/link cleanup, notification publication/recipient creation, recipient read updates, and cron notification/completion. A create reserves its visible number first; parent and children then share one batch. Each child chunk resolves the new parent by that unique number in a CTE and deliberately binds a `NULL` parent on lookup failure so the child `NOT NULL` constraint aborts the batch. Child arrays are never one statement per item. `src/db/bulk.ts` sets `D1_MAX_BOUND_PARAMETERS=100` and calculates `maxRowsPerInsert=floor((100-fixedBindings)/perRowBindings)`: invoice/quotation chunks use one fixed parent-number binding plus six per row (16 rows and seven statements for 100); job chunks use one plus four per row (24 rows and five statements for 100). Before execution, `fixedStatementCount + chunkCount` is asserted `<=50`; violation is an internal configuration error, not a caller error. SQL text size is also asserted below D1 limits. Create/update tests exercise first-child linkage, exactly 100 rows, and final-chunk rollback.

Atomic counters use `INSERT ... ON CONFLICT DO NOTHING` followed by `UPDATE number_counters SET next_value=next_value+1 ... RETURNING next_value-1`. The create operation reserves; preview routes only read/format the next value and are explicitly non-binding. Service-request creation derives its `businessDate` from the Worker current instant using required `BUSINESS_TIME_ZONE='Asia/Riyadh'`, uses that year for both counter scope and `SR-YYYY-`, and ignores client `dateTime`/`timestamp` for numbering. Store/staff user-supplied codes remain accepted; successful codes matching system prefixes advance their counter floor atomically so previews do not regress.

A service-request insert trigger creates exactly one notification with `source_key='new-request:' || NEW.id` and JSON matching the useful old event (`id`, `name`, `createdAt`). An `AFTER INSERT ON notifications` trigger atomically materializes the fixed publication entitlement by inserting one `notification_recipients` row for every currently active admin whose effective RBAC can view that event type: `new-request` requires CLIENTS/SERVICE_REQUESTS and `expiry-alerts` requires ORGANIZATION/STAFF. Its SQL implements the same super-admin bypass and explicit-user-then-role module/submodule precedence as `src/auth/rbac.ts`; schema integration fixtures compare its recipient set with the service RBAC evaluator to prevent drift. Because both triggers run inside the originating service-request or cron write, notification creation and all eligible-recipient inserts commit or roll back together. `PRIMARY KEY(notification_id,admin_user_id)` and unique `source_key` keep retries idempotent.

Invoice creation reserves an invoice number and, only if the caller omitted ICV, an `invoice-icv` value. Caller-supplied ICV remains non-unique and stored unchanged. It reads `invoice_chain_state.version`, stores that value in internal `invoices.chain_version`, and computes `invoice_hash` using the current payload `invoiceNumber|uuid|issueTimestamp.toISOString()|grandTotal.toFixed(2)`. For the first invoice, `previous_hash` is its own computed `invoice_hash`, exactly matching current `resolvePhase2Metadata`; otherwise absent `previousHash` uses the newest stored invoice hash. Caller-supplied `previousHash` remains accepted to preserve the API.

The parent and child chunks execute in one D1 batch. A `BEFORE INSERT` trigger uses `RAISE(ABORT,'invoice_chain_conflict')` unless `NEW.chain_version` equals the singleton state version; its abort rolls back the whole batch. An `AFTER INSERT` trigger sets `last_invoice_id`, `last_hash`, increments state version, and timestamps the state. On the safe `invoice_chain_conflict` code, creation rereads state and retries the full batch with a newly reserved invoice number at most twice, then returns `409`; no zero-row update is treated as rollback. An update always recomputes internal `invoice_hash`; an `AFTER UPDATE` trigger changes state/hash and increments version only when that invoice is latest. An `AFTER DELETE` trigger repairs state only when the deleted invoice was latest, selecting the newest remaining invoice and its stored hash or clearing state if none remains, then increments version. Older edits/deletes do not rewrite later PIH values, matching current non-immutable behavior. Golden and concurrency tests own first, update, delete, and create-after-delete semantics. This is compatibility behavior, not a certified immutable ZATCA ledger.

Services own cross-row rules: prior follow-up existence; polymorphic parent type; store access; active vehicle expenses; expense date no later than current Riyadh date; rental return/end order; service-request links; submodule-parent consistency; and calculated totals. Constraints own local types/ranges/keys/FKs. Triggers own polymorphic parent validation/cascade, request-event insertion, and invoice-chain concurrency because those invariants must survive concurrent requests.

### Domain behavior and reports

Response assemblers expose current camelCase fields and envelopes rather than raw D1 rows. Relations use one bounded parent query and one bounded `IN` child query and group at most 100 parents in memory. No N+1 query is allowed. Soft deletion, bill `id|serviceRequestId` aliases, UUID-or-ID service-request lookup, follow-up closure, store scope, defaults, and rental-day calculations remain. Staff creation persists every accepted extended field, correcting the current service’s silent data loss.

Invoice/quotation calculations are performed in halalas: line net is quantity × unit price; line VAT and gross use the current half-up cent rounding; document subtotal sums line net, document VAT rounds 15% of subtotal, and grand total is subtotal + VAT. Job item total is quantity × unit cost. API mapping divides integer values only at the edge.

Every report uses indexed `COUNT`, `SUM`, conditional aggregation, CTE/UNION, and `GROUP BY`; no report fetches an entire table for JavaScript reduce/filter. Trends use Riyadh-adjusted date expressions where business dates matter. Top lists use `ORDER BY ... LIMIT`. Existing detail keys (`allBills`, `allCustomers`, `allQuotations`, `allInvoices`, `allJobSheets`, vehicles/staff/stores) return one page plus a sibling `pagination` object. Aggregates cover the full validated range. Store reports do not invent financial store ownership absent from the model: global financial totals stay global while service/job metrics use supported relationships. Empty ranges retain keys with zeros/empty arrays.

### Authentication, cookies, and bootstrap

Passwords are stored as `pbkdf2-sha256$v=1$i=600000$l=32$<base64url-16-byte-salt>$<base64url-32-byte-key>`. Version 1 requires exactly 600,000 iterations and length 32—neither lower nor higher values are accepted. Unknown/duplicate/missing fields, malformed base64url, wrong salt/key lengths, and unsupported versions fail before derivation. Verification compares equal-length arrays with a full XOR accumulator. Parameter changes require version 2 and design/security review.

HS256 JWTs use independent secrets with at least 32 random bytes. Claims include numeric `sub`, `kind:admin|user`, `iat`, `exp`, and admin role/effective permissions/viewOnly. Access expiry is 15 minutes; refresh is 7 days. Verification fixes HS256 and validates signature, times, subject, and kind. Refresh rereads account and permissions; blocked/deleted admins fail. Phone users refresh through `users`, correcting the current admin-only lookup bug.

The production Vercel frontend must use a configurable custom hostname under `mtechcare.com`, with `https://app.mtechcare.com` documented as the example, while the Worker production hostname is `https://api.mtechcare.com`. The `refreshToken` cookie is host-only on the API: it is `HttpOnly`, `Secure` outside local development, `Path=/`, `Max-Age=604800`, and production `SameSite=Lax`; production must keep `COOKIE_DOMAIN` empty, so no `Domain` attribute is emitted. Login JSON never includes refresh tokens; logout clears the cookie with identical attributes. Refresh/logout validate Origin when present. CORS accepts only exact origins listed in `ALLOWED_ORIGINS`, and production entries must be same-site `mtechcare.com` frontend origins; no wildcard, suffix, or automatic Vercel preview allowance exists.

A `workers.dev` deployment is for API/curl validation, not presumed browser-cookie validation. It may support browser auth only if an actual supported browser passes login → full page reload → refresh → logout with credentials enabled; production cutover is separately gated on that same real-browser sequence against the final `app.mtechcare.com` → `api.mtechcare.com` topology. If the owner keeps only a `vercel.app` frontend hostname, refresh cookies are unsupported and cutover is blocked until a separately reviewed non-cookie refresh-token and CSRF design is approved; CORS or `SameSite=None` is not treated as a workaround for third-party-cookie blocking.

`POST /api/setup/bootstrap` exists only when all bootstrap secrets are non-empty. It requires constant-time bearer-token comparison, rejects a body, validates the secret email/password, verifies no bootstrap state/admin exists, idempotently checks definitions, and inserts the active super-admin plus singleton state in one batch. One concurrent request succeeds; the other gets `409`. The guide removes bootstrap secrets immediately, after which the route returns `404`.

### Persistent notification polling

Socket.IO is removed. The old event names become durable `type` values. Entitlement is fixed at publication: creating a notification atomically creates `notification_recipients(notification_id,admin_user_id,read_at NULL)` rows for all active admins eligible for that type at that instant. Polling and status queries start from `notification_recipients`, join the notification payload only for the authenticated admin, and order strictly by `notifications.id`; they never scan a global event stream and filter it into one mutable cursor.

Added endpoints are:

- `GET /api/notifications?after=0&limit=50&unreadOnly=false` → `{success,data,nextCursor,hasMore}` ordered by notification ID; each item has `id,type,payload,createdAt,read`. Only assigned recipient rows for the caller can advance `nextCursor`. To preserve restoration after regrant, the first assigned row after `after` whose event type is currently suppressed is an access barrier: the query may return only the accessible ordered prefix before that ID, never later rows, and may not advance `nextCursor` past it. If the barrier is first, it returns an empty page, the unchanged cursor, and `hasMore:false`; normal polling continues and a permission change triggers an immediate refetch.
- `GET /api/notifications/status` → `{success,latestCursor,unreadCount}` over the caller's currently accessible recipient rows, capped before the same first suppressed-recipient barrier.
- `POST /api/notifications/:id/read` → idempotently sets the caller's assigned recipient `read_at`; a notification not assigned to that caller, suppressed by current account/permission state, or missing returns generic `404` so assignment is not disclosed.
- `POST /api/notifications/read-through` body `{cursor,limit?}` where limit is 1–500/default 500 → `{success,processedThrough,markedCount,unreadCount,hasMore}`. It selects at most `limit` currently accessible caller recipient rows with notification ID `<=cursor` and `read_at IS NULL`, but caps selection and `processedThrough` before the same first suppressed-recipient barrier. It updates selected rows using bounded SQL, sets `processedThrough` to the highest examined/updated assigned ID (or prior progress when none), and sets `hasMore` by a one-row accessible-existence query below the barrier. Clients repeat using the same target cursor until false; no silent cap or permission suppression can imply that a later assigned ID was processed.
- `POST /api/notifications/expiry-runs/:businessDate/retry` → super-admin only, no body; runs the same lease/processing logic and returns run state/count. Future dates and completed dates return `400`/`409`.

Publication eligibility uses effective permission at that instant: `new-request` requires CLIENTS/SERVICE_REQUESTS and `expiry-alerts` requires ORGANIZATION/STAFF. A newly created admin and an admin newly granted a permission receive future matching events only; no old recipient rows are backfilled. Revocation, deactivation, blocking, or deletion cannot expose unread content: every poll/status/read query first requires an active, unblocked account and the current permission for each assigned event type. Revocation/deactivation does not delete existing recipient rows. Regrant/reactivation restores access only to previously assigned events whose notification rows still exist, preserving their prior `read_at`; it does not backfill events published while access was absent. In this design notifications have no age-based expiry or automatic deletion, so “unexpired” consistently means that the notification row still exists; deletion of an admin cascades its recipient rows and cannot be reversed. Vercel polls every 30–60 seconds only while authenticated, persists `nextCursor`, backs off on failure, and refetches after reconnect or permission/account-state change. Three admins at 60 seconds produce about 4,320 polls/day.

### Scheduled expiry processing

Both cron and manual retry call `runDailyExpiry(env, instant, requestedBusinessDate?)`. Cron derives date with `Intl.DateTimeFormat` in `Asia/Riyadh`; `0 5 * * *` equals 08:00 because Riyadh is fixed UTC+3. Cron alone may insert today's missing run. Manual retry requires an existing `failed` row or an expired `running` row and returns `404` for a missing historical run. A UUID attempt token and five-minute lease are claimed conditionally; completed and unexpired runs cannot be claimed. `RETURNING attempt_token` determines ownership.

After querying passport/iqama alerts against the claimed business date, one D1 batch executes token-guarded publication/completion. If `alert_count>0`, the notification uses `INSERT ... SELECT ... WHERE EXISTS (SELECT 1 FROM scheduled_runs WHERE job_name=? AND business_date=? AND state='running' AND attempt_token=?) ON CONFLICT(source_key) DO NOTHING`; if count is zero, that statement is omitted. Completion always uses the ownership predicate and records `alert_count`. Therefore a stale owner inserts no event and completes no run; the service sees zero completion changes and throws a lost-lease error. D1 serializes the batch, so a takeover cannot interleave between publication and completion, and `source_key='expiry-alerts:<businessDate>'` independently prevents duplicates. On query/serialization/write failure, the owner updates to failed only with the same token and a fixed non-sensitive code, logs once, and throws. If execution dies before the atomic publication/completion batch, takeover becomes possible after lease expiry. A completed date can never be reclaimed. Scheduled payload/logs contain no sensitive alert details beyond the protected notification record.

### UBL, QR/TLV, and crypto

`src/invoice/ubl.ts` is extracted before deleting the old service. It preserves template whitespace/order, XML escaping order, fixed two-decimal output, seller fields, TLV tags 1–5, UTF-8 lengths, SHA-256 payload delimiters, Base64, fallback rules, and validation shape. Seller data moves to required non-secret bindings. `Buffer` under `nodejs_compat` or Web Crypto is selected only after golden parity tests. Creation timestamps are explicit; generation never silently substitutes “now” for invalid stored values.

`fast-xml-parser` stays exact-pinned. Raw XML is size-bounded; no external entity or network resolution is permitted. Malformed XML returns the current `{valid,profile,errors,warnings}` result rather than throwing. Missing invoice is `404`; absent seller configuration is `503`; XML generation failure is `500` and cannot partially mutate an invoice.

### Error handling and structured logging

Malformed/unknown input and domain preconditions return `400`; invalid/expired bearer or refresh credentials `401`; RBAC/view-only/store scope `403`; absent resources `404`; uniqueness/bootstrap complete/sequence contention/completed retry `409`; oversized body `413`; unsupported media `415`; and exhausted auth/public fixed windows return their documented generic `429` with integer `Retry-After`. Caller errors are recoverable and logged only as completion metadata.

D1 check/FK failures caused by current caller state map to `400` or `409`. Missing DB binding, quota exhaustion, overload, or recognized availability failures return `503`; unknown database/crypto/XML internal faults return `500`, always with a request ID and no SQL detail. Reads retry once only for recognized transient errors. Writes retry only under the documented unique idempotency/counter/chain protocol. A failed batch rolls back. Auth missing secrets returns `503`; bootstrap missing secrets returns `404`; scheduled configuration failure is logged safely and thrown.

One JSON completion log contains request ID, route template (never raw URL/query), method, status, duration, environment, and safe error category. Scheduled logs contain job/date/attempt/outcome/count only. Logs never contain request/response bodies, headers carrying credentials, cookies, password/hash/JWT, SQL values, names, email/mobile/address, financial identity data, XML, or notification payloads.

### Testing and deployment documentation

Pure unit tests cover validation (including shared Gregorian/leap-year and timestamp normalization), Unicode password limits, PBKDF2 parsing/full comparison and non-snapshotted dummy-record initialization, JWT claims, CORS/cookie attributes, Riyadh dates/year boundary, money/odometer conversion, number formatting, RBAC fallback, rental math, report assembly, XML escaping/hash/TLV, and bulk chunk formulas. Cloudflare Vitest integration tests run migrated local D1 and cover every constraint/FK/index/trigger, canonical DATE/TS shape checks, batch rollback, 100-item writes, counters, chain concurrency/delete repair, publication-time notification recipients/read state across grant/revoke/regrant and account lifecycle, public rate-limit concurrency/operation isolation/no-domain-query rejection, and leased cron takeover. HTTP contract tests call Worker `fetch` with test bindings and cover every route/method/envelope/auth matrix and listed difference. Worker HTTP tests verify headers and cookie attributes but are not accepted as evidence that a browser stores or sends a cross-site refresh cookie.

A reproducible manual browser runbook in `tests/browser/auth-refresh.md` drives the actual deployed frontend and API: login, verify the host-only API cookie in browser storage, perform a full page reload, force/use refresh after access-token expiry, then logout and verify cookie deletion plus subsequent refresh rejection. It is executed in current Chrome and at least one of current Firefox or Safari, with dated pass/fail evidence that contains no cookie/token values. `workers.dev` remains API/curl-only unless this exact browser sequence passes there; the same sequence against final `app.mtechcare.com` and `api.mtechcare.com` is mandatory recorded release evidence and blocks production cutover on failure.

Golden fixtures are captured by running the current invoice implementation with fixed input/time before removing it. CI runs Node 22, `npm ci`, typecheck, non-mutating lint, unit/integration/contract tests, migration/foreign-key checks, and Wrangler dry-run without Cloudflare credentials. Any staging deploy workflow is manual and targets staging only; production remains an explicit approved command.

`docs/cloudflare-deployment.md` gives a beginner these ordered, non-automated steps: create a Cloudflare account and MFA; enable workers.dev; install Node/npm; `npm ci`; `npx wrangler login`; create separate staging/production D1 databases; replace local placeholder IDs; apply local then remote migrations; configure non-secret vars; set independent JWT/bootstrap secrets; deploy to workers.dev for API/curl validation; bootstrap once and remove bootstrap secrets; configure Vercel API URL, credentials, exact CORS, and polling; smoke-test `/api`, docs, public request/notification, CRUD, one document/UBL, reports, and scheduled/manual expiry; inspect CPU and D1 quota use; then consider custom domains. Browser login/refresh is not claimed on `workers.dev` unless the documented real-browser sequence passes.

For production, the guide requires attaching the existing Vercel project to a configurable custom hostname under `mtechcare.com` (`app.mtechcare.com` in examples), attaching the Worker to `api.mtechcare.com`, setting production `ALLOWED_ORIGINS` to exact approved same-site frontend origins, and leaving `COOKIE_DOMAIN` empty so the API refresh cookie is host-only. It explicitly says a frontend left only on `vercel.app` has unsupported refresh cookies and cannot cut over under this design; that topology requires a separate review for a non-cookie refresh/CSRF design. The guide requires dated, secret-free evidence of login → reload → refresh → logout in real supported browsers on the final custom hostnames before cutover.

Before `api.mtechcare.com` or `app.mtechcare.com`, the guide requires exporting/screenshotting every DNS record and preserving current Vercel records plus MX/SPF/DKIM/DMARC and verification records. It explains nameserver/DNSSEC risk, documents only manual custom-hostname setup, and does not execute changes. Rollback uses the prior Worker deployment and D1 Time Travel/bookmarks/exports; a bookmark/export is recorded before migrations, rollback is verified in a disposable D1 database, and workers.dev staging can remain while production is corrected. AWS is not a rollback target because it is suspended and its data was explicitly discarded.

### Unavoidable and intentional API differences

1. Socket.IO is removed; authenticated polling uses persistent `new-request` and `expiry-alerts` records.
2. Existing public `GET /api/notifications/expiry-alerts` now requires JWT plus staff permission. Five polling/read/retry endpoints and one bootstrap endpoint are added.
3. Lists and report details are paginated/capped at 100. Reports default to 30 Riyadh days, reject ranges over 366 days and invalid dates, and add `pagination` next to detail arrays.
4. Search is capped at 50 UTF-8 bytes and treats `%`/`_` literally.
5. Invalid expiry `days` returns `400` instead of silently defaulting.
6. Admin passwords increase from six characters to the exact 12-code-point/128-byte rule and use PBKDF2. No bcrypt compatibility is needed for a fresh database.
7. Old JWTs are invalid; payloads add `kind`; phone-user refresh is repaired.
8. View-only enforcement now consistently covers all authenticated writes, including current store/staff omissions.
9. Non-super-admin role fallback starts with no permissions because no authoritative `role_modules` policy exists. New non-super-admins start inactive until custom permissions are assigned.
10. Enquiry deletion cascades matching polymorphic follow-ups; store deletion may return `409` when referenced; assignment FKs consistently set null.
11. Money response values are normalized from integer halalas; direct PostgreSQL decimal entities may previously have serialized strings.
12. Next-number/code endpoints are non-binding previews; failed creates can leave gaps. Duplicates are prevented without `MAX(id)+1`.
13. `/api/docs` is bundled OpenAPI UI and added `/api/openapi.json` replaces runtime Nest decorator generation.
14. Staff create persists all accepted extended fields rather than silently discarding most of them.
15. Job-sheet update `{items:[]}` explicitly remains a no-op for item rows, matching current service behavior despite the old DTO description.

No other API difference is intended beyond the normative review amendments below. Caller-supplied invoice ICV remains accepted and non-unique, so it is not an API difference.

## Normative design-review amendments

The following decisions are part of the approved design contract and supersede any earlier sentence in this document that conflicts with them. They address the review in `.agents/tasks/cloudflare-migration/design-review.md`; no finding is backlogged or ignored.

### Parent/child D1 creation and bulk limits

A document number is reserved before document persistence with the atomic `number_counters ... UPDATE ... RETURNING` operation. That reservation may survive a later failed create, so gaps remain an intentional API difference. The parent insert and **all** child inserts then execute in one `D1Database.batch()`; no parent is committed in a separate database call. Child statements do not depend on reading `RETURNING id` from an earlier batch result. They resolve the newly inserted parent by its already-reserved unique visible number inside SQL.

Invoice item chunks use this statement shape; quotation uses `quotation_number`/`quotation_items`, and job sheet uses `job_sheet_number`/`job_sheet_items`:

```sql
WITH parent(id) AS (
  SELECT id FROM invoices WHERE invoice_number = ?
), rows(sl_no, product, quantity, unit_price_halalas,
        vat_amount_halalas, line_total_halalas) AS (
  VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
)
INSERT INTO invoice_items
  (invoice_id, sl_no, product, quantity, unit_price_halalas,
   vat_amount_halalas, line_total_halalas)
SELECT (SELECT id FROM parent), sl_no, product, quantity,
       unit_price_halalas, vat_amount_halalas, line_total_halalas
FROM rows;
```

The scalar parent lookup deliberately yields `NULL` when the parent is absent; `invoice_id NOT NULL` then aborts the statement and D1 rolls back the complete batch instead of silently inserting zero rows. The unique visible-number lookup is guaranteed to return at most one row. The parent number is bound once per chunk, so invoice and quotation chunks use `1 + 6r` bindings and contain at most `floor((100-1)/6)=16` rows: 100 items require seven child statements. Job-sheet chunks use `1 + 4r` bindings and contain at most 24 rows: 100 items require five child statements. Updates use the same CTE shape keyed by the known parent ID. `src/db/bulk.ts` calculates these formulas from fixed and per-row binding counts and asserts both the 100-binding and 50-statement limits before calling D1. Integration tests prove the first child references the parent inserted earlier in the same batch and that a forced final-chunk failure leaves neither parent nor child rows.

### Admin lifecycle authorization and last-super-admin invariant

Every admin mutation route—create, update, block/unblock, delete, module replacement/reset, and submodule replacement/reset—passes the authenticated actor ID to the service. The service reloads the actor and target rather than trusting role claims alone. Existing `AUTH`, view-only, self-permission, and target-super-admin checks remain, with these mandatory additions:

- Only an active authenticated `SUPER_ADMIN` may create a `SUPER_ADMIN` or change any account's role to or from `SUPER_ADMIN`.
- Only an active `SUPER_ADMIN` may update, block, deactivate, change `viewOnly`, reset permissions, or delete another `SUPER_ADMIN`.
- No caller may deactivate, block, or delete itself. A caller may change its own name, email, or password if the normal route permission allows it, but may not change its own role, `viewOnly`, modules, or submodules.
- No operation may demote, deactivate, block, or delete the last active `SUPER_ADMIN`. For a race-sensitive demotion/deactivation/delete, the D1 mutation is one conditional statement whose `WHERE` clause checks the target and `(SELECT COUNT(*) FROM admin_users WHERE role='SUPER_ADMIN' AND is_active=1) > 1`; a zero-row result maps to `409 last_active_super_admin`. Prechecks provide a useful error but do not own this invariant.
- Creating a non-super-admin always stores `is_active=0`, ignoring any attempt to activate it at creation. Activation in the existing update/block route is permitted only after the same transaction verifies that the account has at least one effective module from explicit user assignments or an intentionally seeded role mapping. The fresh schema seeds no role mappings.

The service layer owns actor/target policy because it has authenticated identity and business context; the conditional D1 statement owns the last-active-super-admin race. Tests cover creation/promotion by ordinary admins, all self restrictions, mutation of another super-admin, two concurrent attempts against the last two active super-admins, and inactive-until-permitted activation.

### Password feasibility and login abuse control

PBKDF2 v1 remains exactly PBKDF2-HMAC-SHA-256 with 600,000 iterations, a 16-byte random salt, and a 32-byte key; it is never weakened to satisfy a quota. Before full module migration, implementation first builds the minimal Worker login/password benchmark and its Worker-runtime tests. The owner then deploys only that benchmark to `workers.dev` and records median, p95, and maximum CPU for hash and verify plus a short login spike. This manual staging measurement is a release gate because local emulation cannot establish Cloudflare CPU billing. If valid verification cannot stay inside Workers Free limits, implementation/cutover stops and reports that the strict `$0` architecture is infeasible; the design must be revisited rather than lowering security. No deployment is performed by this authoring or implementation pipeline.

`POST /api/auth/admin/login` has a D1 fixed-window pre-derivation backstop. `auth_rate_limits` stores only `key_hash TEXT`, `window_started_at TEXT`, `window_seconds INTEGER`, `attempt_count INTEGER`, and `expires_at TEXT`, with `(key_hash,window_started_at,window_seconds)` as its primary key and an expiry index. Every `key_hash` is Base64url HMAC-SHA-256 under the required `RATE_LIMIT_HMAC_SECRET` over an operation-specific UTF-8 input; raw IPs, emails, and mobile query values are neither stored nor logged. `src/auth/rate-limit.ts` accepts `CF-Connecting-IP` only as one trimmed header value of at most 45 ASCII characters that parses as a complete IPv4 address with four 0–255 decimal octets or a complete IPv6 address; it canonicalizes IPv4 decimal form and IPv6 compressed lowercase form before key derivation, and treats an empty, repeated/comma-separated, zone-suffixed, malformed, or oversized value as invalid. Admin login uses `admin-login:ip:<canonical-ip>` and `admin-login:account:<normalized-email>`. Missing or syntactically invalid `CF-Connecting-IP` uses the fixed `admin-login:ip:unknown` input. One D1 batch atomically upserts both current buckets and returns counts. Limits are five attempts per IP per five minutes and twenty attempts per account per fifteen minutes. Requests over either limit return the generic body `{statusCode:429,message:"Too many login attempts",error:"Too Many Requests"}` with `Retry-After` equal to the longer remaining window and **must not** call PBKDF2 or reveal which bucket fired. Successful authentication does not reset a bucket. D1/rate-limit failure fails closed with `503`, not an unthrottled derivation.

At Worker isolate initialization, `src/auth/password.ts` calls Web Crypto `crypto.getRandomValues` once for a random 16-byte salt and separately for random 32-byte comparison bytes, then constructs a syntactically valid v1 dummy record only in module-scope memory. The dummy record is never committed, serialized to a fixture/snapshot, logged, or returned. For a validly shaped unknown account, verification performs the same configured 600,000-iteration PBKDF2 derivation from the submitted password and dummy salt and executes the same full 32-byte XOR comparison against the random comparison bytes as a known-account verification; the comparison result is discarded and the caller always receives the same generic `401` used for a wrong password. Malformed credential input still fails at the common input-validation layer before account lookup. Tests inject/spy on Web Crypto only to assert requested byte lengths, valid in-memory record shape, one derivation, and all 32 comparison steps for known and unknown accounts; they never assert or snapshot generated byte values.

Public service-request controls use distinct operation-specific HMAC buckets and run after HTTP input shape validation but before any service-request repository query, lookup, insert, counter allocation, or notification operation:

- `POST /api/service-request` hashes `public-create:ip:<canonical-ip>` and permits 10 attempts per IP per 900-second (15-minute) fixed window.
- `GET /api/service-request/by-mobile` hashes `public-lookup:ip:<canonical-ip>` and permits 30 attempts per IP per 300-second (5-minute) fixed window.

Missing or invalid `CF-Connecting-IP` uses fixed, separate `public-create:ip:unknown` or `public-lookup:ip:unknown` input, never a shared unknown/login bucket. The rate-limit upsert/check is atomic under concurrent requests. Attempt 11 for create and attempt 31 for lookup, and every later attempt in that window, returns `{statusCode:429,message:"Too many requests",error:"Too Many Requests"}` with integer `Retry-After: max(1, ceil(windowEnd-now))`; it performs no service-request D1 operation. The 900- and 300-second windows are exactly the values allowed by `auth_rate_limits.window_seconds CHECK(window_seconds IN (300,900))`. The daily scheduled handler performs one bounded cleanup statement, `DELETE FROM auth_rate_limits WHERE rowid IN (SELECT rowid FROM auth_rate_limits WHERE expires_at <= ? ORDER BY expires_at LIMIT 500)`, so a run deletes at most 500 expired buckets and never scans/deletes without a bound. Cleanup failure is logged once as a safe scheduled error but does not roll back completed expiry publication; stale rows are harmless because the current window key includes `window_started_at`.

The guide also instructs the owner to add the Cloudflare Free-plan rate-limiting rule available for the custom-domain login and public service-request paths after checking current plan limits; this is defense in depth and is not required for `workers.dev` correctness. Tests prove auth threshold, window rollover, concurrent increments, hashed operation-key storage, generic `429`, `Retry-After`, and that throttled login requests never invoke PBKDF2. The same helper limits bootstrap attempts to five per IP per fifteen minutes under `bootstrap:ip:<canonical-ip-or-unknown>`. Public endpoint tests prove exactly 10/30 successful concurrent threshold acquisitions, operation separation for the same IP, separate unknown buckets, 900/300 window compatibility, bounded cleanup, generic `429`/`Retry-After`, and repository spies plus D1 query accounting showing no service-request domain query/write/counter/notification after rejection.

### D1-only foreign keys and reference behavior

The schema-source manifest must mark these D1 integrity additions because they are absent as TypeORM relations in source: `admin_users.store_id -> stores.id ON DELETE SET NULL`; `bills.user_id -> service_requests.id ON DELETE CASCADE`; `submodules.module_code -> modules.code ON UPDATE CASCADE ON DELETE CASCADE`; all `role_modules`, `user_modules`, and `user_submodules` references to their users/definitions with cascade behavior; `invoices.service_request_id`, `quotations.service_request_id`, and `job_sheets.service_request_id -> service_requests.id ON DELETE SET NULL`; and `job_sheets.assigned_technician_id -> staff.id ON DELETE SET NULL`. Entity-declared staff/store, service-request/staff, item-parent, vehicle/store/staff, expense/vehicle/store/admin, and rental/store/staff FKs remain as already listed.

Every supplied store, staff, service-request, module, or submodule reference must identify a live row and satisfy store/submodule ownership rules. Services check first and return `404` for a missing referenced resource; a concurrent disappearance is caught by the FK and maps to `409 reference_changed`. Deleting a service request is one batch that deletes its bills and sets invoice, quotation, and job-sheet `service_request_id` values to `NULL` before deleting the request; this occurs regardless of whether bills exist. Deleting staff sets service-request assignment, vehicle authorization, rental assignment, and job-sheet technician references to `NULL`. Deleting a store sets admin store references to `NULL` but returns `409 resource_in_use` while any staff, vehicle, vehicle expense, or rental row still references it. Permission-definition cascades are migration/admin-definition behavior, not ordinary API behavior. Create, update, and delete contract tests cover every D1-only FK and exact status mapping.

### Tracked and local Wrangler configuration

No real account or D1 database ID is written to a tracked file. The repository commits `wrangler.example.jsonc` containing `REPLACE_WITH_STAGING_D1_DATABASE_ID` and `REPLACE_WITH_PRODUCTION_D1_DATABASE_ID`, the required `DB` bindings, `nodejs_compat`, compatibility date `2025-09-15`, observability, `workers_dev`, vars, and exactly cron `0 5 * * *`. It does not commit a deployable `wrangler.jsonc`. `.gitignore` includes `wrangler.local.jsonc`, `wrangler.staging.jsonc`, `wrangler.production.jsonc`, and `.wrangler-ci.jsonc`.

The deployment guide has the beginner copy the example to an ignored environment-specific filename and replace placeholders only there. Every `dev`, D1 migration, dry-run, and deploy npm script requires an explicit `--config`; no script may silently select another environment. CI copies the example to ignored `.wrangler-ci.jsonc`, replaces both IDs with the syntactically valid dummy `00000000-0000-0000-0000-000000000000`, and runs `wrangler deploy --dry-run --config .wrangler-ci.jsonc --outdir .wrangler-dry-run`. The output directory is ignored and removed by CI. A clean checkout therefore validates without credentials while real IDs remain outside source control. Documentation includes a pre-deploy `git diff --exit-code -- wrangler.example.jsonc` check.

### Required translated staff indexes

In addition to FK, list, report, notification, and scheduler indexes already specified, `0001_fresh_schema.sql` explicitly translates every source staff index:

```sql
CREATE INDEX idx_staff_employee_status ON staff(employee_status);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_mobile_primary ON staff(mobile_primary);
CREATE INDEX idx_staff_visa_expiry ON staff(visa_expiry_date);
CREATE INDEX idx_staff_insurance_expiry ON staff(insurance_expiry_date);
CREATE INDEX idx_staff_iqama_expiry ON staff(iqama_expiry_date);
CREATE INDEX idx_staff_passport_expiry ON staff(passport_expiry_date);
CREATE INDEX idx_staff_driving_license_expiry ON staff(driving_license_expiry);
CREATE INDEX idx_staff_date_of_join ON staff(date_of_join);
```

`schema-source-manifest.md` maps each index to `migrations/add_staff_extended_fields.sql`. Duplicate-prefix indexes may be omitted only if an `EXPLAIN QUERY PLAN` test proves a named replacement index covers the same leading columns and the manifest records that exact replacement; none is silently dropped.

### Scheduled publication and retry eligibility

Only the cron path may create the first `scheduled_runs('staff-expiry', todayInRiyadh)` row, and it may do so only for the Riyadh date derived from `scheduledTime`. The manual endpoint is genuinely a retry: it requires an existing row for the requested non-future date in `failed` state or `running` with an expired lease. A nonexistent date returns `404`; a completed or live-running date returns `409`; malformed/future dates return `400`. Manual retry never creates a historical run.

A successful zero-alert query still token-conditionally marks the run `completed` with `alert_count=0`, but it does **not** insert a notification, preserving current behavior. When `alert_count>0`, notification insertion and completion remain in one token-guarded batch and source key `expiry-alerts:<businessDate>` remains unique. `scheduled_runs` therefore adds `alert_count INTEGER NULL CHECK(alert_count>=0)`. Tests cover no-alert completion/no notification, nonexistent historical retry, failed retry, expired-lease retry, live lease rejection, and duplicate-free publication.

### Store and staff counter contracts

Store codes use exact uppercase `/^MTCSA[0-9]+$/`; system previews format `MTCSA` plus the decimal counter padded to a minimum of two digits (`MTCSA01`, `MTCSA100`). Staff codes use exact uppercase `/^MTC[0-9]+$/`; system previews format `MTC` plus the decimal counter padded to a minimum of four digits starting at 100 (`MTC0100`, `MTC10000`). Matching is case-sensitive and values are not silently uppercased. Counters are safe integers from 1 through 2,147,483,647; allocation/advancement at the upper bound returns `409 sequence_exhausted` without inserting or updating a domain row.

Create and update continue accepting arbitrary nonmatching codes allowed by their 20-character DTO contract, and those codes do not affect the counter. For a matching code, the domain insert/update and `UPDATE number_counters SET next_value=max(next_value, parsed_suffix+1)` execute in one D1 batch; a uniqueness/FK/validation failure rolls back both. Server-generated create uses an earlier atomic reservation and may leave a gap after later failure. Tests cover initial formatting, width growth, matching/nonmatching caller values, caller jumps, update to a larger suffix, concurrent reservations, failed writes, and overflow.

### Acceptance-criteria amendments

These clauses replace the conflicting portions of the numbered criteria above and are equally mandatory:

- **AC 1/2/20:** clean-checkout validation uses tracked `wrangler.example.jsonc` and generated ignored `.wrangler-ci.jsonc` with dummy UUIDs; all operational commands name an ignored config explicitly, and repository scans prove no real account/database ID or secret is tracked.
- **AC 6/7:** 100 invoice/quotation children use seven lookup-CTE statements of at most 16 rows; 100 job children use five statements of at most 24 rows. Parent plus all chunks share one D1 batch; first-child linkage and final-chunk rollback are proven.
- **AC 11:** the PBKDF2 format is unchanged. The minimal deployed Worker benchmark is a mandatory manual release gate before full migration/cutover, and rate-limit tests prove over-limit requests return generic `429` with `Retry-After` without deriving a password.
- **AC 13:** admin lifecycle tests prove actor-aware super-admin transitions, self restrictions, inactive non-super creation, permission-before-activation, and atomic preservation of at least one active super-admin under concurrency.
- **AC 16:** zero alerts complete the run without a notification; manual retry can claim only a pre-existing failed or expired-running row and cannot create arbitrary historical runs.
- **AC 4/18:** schema/contract tests enumerate every D1-only FK, all nine translated staff indexes, their query plans, exact delete effects, `404` missing-reference prechecks, and `409` concurrent FK/RESTRICT outcomes.
- **AC 8:** code-counter tests lock the exact store/staff regexes, padding, floor advancement, transaction behavior, concurrency, and exhaustion rules above.
- **AC 12/24:** production is locked to Vercel on an exact same-site custom hostname such as `app.mtechcare.com`, Worker `api.mtechcare.com`, and an API host-only refresh cookie with no `Domain`; workers.dev is API/curl-only unless the real-browser sequence passes, and final custom-host browser evidence gates cutover. A `vercel.app`-only frontend is unsupported pending separate non-cookie refresh/CSRF review.
- **AC 14/15/25:** `notification_recipients` fixes entitlement at publication; all polling/read operations start from recipient rows and current access state; three-admin mixed-type lifecycle tests cover create, grant, revoke, regrant, deactivate/reactivate, deletion, ordering, no backfill, and restoration of assigned still-existing events only.
- **AC 21:** public create and lookup use separate HMAC operation/IP buckets with exact 10/900-second and 30/300-second limits, separate unknown buckets, atomic concurrent acquisition, correct `Retry-After`, no service-request D1 operation after rejection, and cleanup capped at 500 rows.
- **AC 22:** DATE and TS migration checks lock exact ASCII byte lengths/shapes while shared service validation owns calendar semantics and timestamp normalization; leap-day, impossible-date, offset, missing-millisecond, persistence rejection, and byte-for-byte round-trip tests are mandatory.
- **AC 11/23:** isolate initialization creates the dummy v1 salt and comparison bytes randomly in memory; unknown accounts perform the same derivation and full comparison work, and tests never snapshot generated bytes.

### Additional unavoidable and intentional API differences

16. Valid references that point to absent store/staff/service-request/module/submodule rows now return `404`; concurrent reference deletion and restricted store deletion return `409`. Service-request deletion consistently cascades bills and nulls all linked invoice, quotation, and job-sheet references.
17. Admin login and bootstrap can return generic `429 Too Many Requests` plus `Retry-After`. New non-super-admins cannot be activated until they have effective permissions, and only super-admins can create/promote/demote or mutate security state for super-admin accounts.
18. Public service-request create and mobile lookup can return generic `429 Too Many Requests` plus `Retry-After` under operation-specific 10-per-15-minute and 30-per-5-minute IP limits, respectively.
19. Refresh-cookie production support requires a same-site Vercel custom hostname under `mtechcare.com`; a `vercel.app`-only frontend and unvalidated `workers.dev` browser flow are intentionally unsupported.
20. Notification eligibility is fixed when an event is published. Later account creation or permission grant does not backfill older events, and current revocation/deactivation temporarily suppresses previously assigned content as specified above.

## Current Design Review Finding Responses

1. **Addressed:** child chunks resolve the new parent through its unique reserved visible number in each lookup CTE, use corrected `1+6r`/`1+4r` limits, fail on a missing parent through `NOT NULL`, and remain in the parent batch.
2. **Addressed:** every admin mutation receives the actor; super-admin transitions and target mutations are super-admin-only; self security changes are blocked; and a conditional D1 mutation preserves one active super-admin under races.
3. **Addressed:** secure PBKDF2 parameters remain fixed, the Worker benchmark is the first milestone and manual release gate, and HMAC-keyed D1 rate limits return generic `429` before derivation.
4. **Addressed:** every D1-only FK is enumerated with exact missing-reference, deletion, `SET NULL`, cascade, RESTRICT, `404`, and `409` behavior and contract tests.
5. **Addressed:** tracked placeholder config is `wrangler.example.jsonc`; real configs and CI config are ignored, every command names a config, and CI substitutes dummy UUIDs for dry-run.
6. **Addressed:** all nine indexes from the staff migration are explicit and manifest/query-plan verified.
7. **Addressed:** cron alone creates today's run; manual retry requires a failed/expired existing row; zero alerts complete without publishing an event.
8. **Addressed:** store/staff regexes, case, padding, range, transactional floor updates, gaps, overflow, and concurrency tests are locked.

## Prior Design Review Finding Responses

1. **Addressed:** every entity and operational table now has an explicit column/type/null/default/key contract. Job-sheet nullable fields, nullable enquiry fields, and every invoice payment/customer field are spelled out. A schema-source manifest covers all 23 entities and both staff migrations.
2. **Addressed:** 100-item arrays use deterministic multi-row chunks with a fixed 100-binding limit, explicit formulas, statement-count assertions, and final-chunk rollback tests.
3. **Addressed:** scheduled claims now have attempt tokens and expiring leases; completion/failure is token-conditional; a super-admin same-date retry endpoint and crash/takeover tests are specified.
4. **Addressed:** ICV remains caller-supplied and non-unique as in source; omitted ICV uses an atomic counter. First PIH equals the first invoice’s own current hash. Latest update/delete and create-after-delete chain repair and golden tests are concrete.
5. **Addressed:** no non-super-admin role mapping is guessed. `role_modules` starts empty, non-super-admins start inactive, and explicit custom assignment is required before activation.
6. **Addressed:** password limits consistently use minimum 12 Unicode code points and maximum 128 UTF-8 bytes. Hash v1 requires exactly 600,000 iterations and 32 output bytes.
7. **Addressed:** service-request scope/prefix year comes only from the Worker instant converted to Asia/Riyadh; the UTC/Riyadh New Year boundary test is required.
8. **Addressed:** `read-through` now accepts limit 1–500 and returns resumable progress/count/hasMore semantics, with multi-batch three-admin tests.
9. **Addressed:** empty job-sheet items remain a no-op; 1–100 replaces atomically.
10. **Addressed:** `new-request:<id>` is the exact source key and trigger idempotency is tested.

## Latest Design Review Finding Responses

1. **Addressed — browser refresh-cookie topology:** production Vercel is locked to an exact configurable sibling hostname under `mtechcare.com` (`app.mtechcare.com` in the guide), the Worker is `api.mtechcare.com`, and the refresh cookie is API host-only with no `Domain`. Exact same-site CORS, workers.dev API/curl-only treatment, the real-browser login → reload → refresh → logout gates, and the unsupported `vercel.app`-only case are specified in Worker configuration, authentication, testing, deployment, AC 12, and AC 24. No finding is backlogged.
2. **Addressed — public abuse controls:** create and lookup now have operation-specific HMAC inputs, separate unknown buckets, exact 10/900-second and 30/300-second thresholds, atomic concurrency behavior, generic `429` and calculated `Retry-After`, pre-domain-operation ordering, and cleanup bounded to 500 expired rows. The schema window check and concurrent/separation/no-domain-query tests are explicit in the password/rate-limit amendment, AC 21, and the test design. No finding is backlogged.
3. **Addressed — notification semantics:** `notification_recipients(notification_id,admin_user_id,read_at)` replaces dynamic global-cursor filtering. Publication atomically assigns eligible active admins, all polling begins from recipient rows ordered by notification ID, and a suppressed assigned row forms a cursor/read-through barrier so mixed event types cannot skip it. Grants/new accounts are future-only, current revoke/deactivation suppresses access, and regrant/reactivation restores only previously assigned notification rows that still exist. Three-admin mixed-event lifecycle coverage is required by AC 14, 15, and 25. No finding is backlogged.
4. **Addressed — dates and timestamps:** DATE is exactly ten ASCII bytes `YYYY-MM-DD`; TS is exactly the 24-byte `Date.prototype.toISOString()` UTC form. Concrete blob-length/GLOB checks, shared Gregorian/offset validation ownership, normalization behavior, persistence assertions, and leap/impossible/offset/missing-millisecond/round-trip tests are specified in input validation, the D1 schema macro, testing, and AC 22. No finding is backlogged.
5. **Addressed — dummy password verification:** isolate initialization generates a random 16-byte salt and independent 32-byte comparison value with Web Crypto and builds only an in-memory v1 dummy record. Unknown accounts execute the configured derivation and full comparison; the value is never committed, logged, returned, fixture-stored, or snapshotted, with work-equivalence tests required by AC 11 and 23. No finding is backlogged or ignored.

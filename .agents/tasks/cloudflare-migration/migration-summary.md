# Cloudflare Worker + D1 migration summary

## Current implementation

- Replaced the reachable deployed runtime with Hono, direct prepared D1 SQL, and Worker `fetch`/`scheduled` handlers.
- Added the fresh 23-entity schema plus `role_modules`, counters, invoice-chain state, bootstrap/rate-limit/scheduled-run tables, persistent notifications, and publication-fixed recipients. FKs, indexes, constraints, exact DATE/TS shape checks, triggers, and the idempotent 8-module/17-submodule seed are included.
- Preserved the approved `/api` route families for auth/admin, service requests, bills/repair items, invoices/quotations/job sheets, enquiries/follow-ups, stores/staff, vehicles/expenses/rentals, reports/dashboard, notifications, bootstrap, and expiry retry.
- Added versioned PBKDF2, independent HS256 access/refresh JWTs, host-only refresh cookies, exact-origin CORS, actor-aware RBAC, inactive-until-permitted admins, last-active-super-admin protection, operation-specific HMAC fixed-window limits, and PII-safe structured logs.
- Added integer money/odometer mapping, atomic counters, bounded parent/child batches, invoice hash chain and UBL/TLV support, indexed report SQL, durable notification polling/read semantics, and leased Riyadh cron processing.
- Pinned the reviewed Worker toolchain, regenerated the lockfile, added placeholder-only Wrangler/environment examples, validation-only CI, tests, clean-D1 smoke tooling, browser/release checklists, and beginner deployment/rollback instructions.
- Disabled automatic Docker publishing and moved the old Nest/PostgreSQL/Socket.IO/EC2 graph beneath `legacy/ec2` with an inactive marker and credential redaction.

## Post-review corrections

- Removed request-derived SQL identifiers from document updates. Fixed DTO maps now reject unknown document/item keys.
- Implemented D1-atomic invoice/quotation item replacement, job-sheet replacement/no-op semantics, total/hash recalculation, missing-parent handling, bounded chain retries, complete response envelopes, pagination/search, and full UBL generation/validation envelopes.
- Added complete golden UBL XML fixture coverage for namespaces, profile, ICV/PIH/QR, customer/seller/tax/line blocks, escaping, QR bytes, and validation profile.
- Added store-scoped vehicle/rental/expense/report services, including no-store empty lists, cross-store direct denial, store/staff ownership checks, active-vehicle expense rules, Riyadh future-date rejection, rental date/cost/return/odometer validation, and super-admin-only expense deletion.
- Added follow-up predecessor/uniqueness checks and atomic parent closure. Added transactional store/staff counter floor advancement for matching manual codes.
- Restored public DTO names and success/message/count/data/pagination envelopes across documents, service requests, bills, enquiries, stores, staff, and organization routes; staff and service-request relations are explicitly projected without storage suffix leakage.
- Replaced collapsed reports with populated endpoint-specific SQL assemblers covering summaries, trends, distributions, customer/enquiry aggregation, performers, products/parts, and bounded details, using integer aggregates and direct indexed timestamp/date range predicates.
- Fixed notification `unreadOnly`, suppressed-row barriers, progressive 500-row read-through, and D1-safe update chunks under 100 bindings.
- Fixed cron stale-owner completion reporting by checking token-owned `RETURNING` results and separating cleanup outcome.
- Fixed impossible RFC3339 calendar/clock/offset rollover before normalization.
- Added explicit production `--config wrangler.production.jsonc --env production` dry-run/deploy instructions after release gates.

## Exact modified/new active files from the initial migration

- Root/config: `.gitignore`, `.dev.vars.example`, `.env.example`, `README.md`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `wrangler.example.jsonc`.
- CI/docs: `.github/workflows/validate.yml`, `docs/cloudflare-deployment.md`.
- Migrations: `migrations/d1/0001_fresh_schema.sql`, `migrations/d1/0002_seed_definitions.sql`, `migrations/d1/schema-source-manifest.md`.
- Scripts: `scripts/benchmark-password.ts`, `scripts/create-ci-wrangler-config.mjs`.
- Runtime: `src/worker.ts`, `src/worker/app.ts`, `src/worker/auth.ts`, `src/worker/bulk.ts`, `src/worker/db.ts`, `src/worker/env.ts`, `src/worker/expiry.ts`, `src/worker/http.ts`, `src/worker/jwt.ts`, `src/worker/openapi.ts`, `src/worker/password.ts`, `src/worker/rate-limit.ts`, `src/worker/ubl.ts`.
- Tests/evidence: `tests/unit/bulk-ubl.test.ts`, `tests/unit/docs.test.ts`, `tests/unit/env.test.ts`, `tests/unit/password-jwt.test.ts`, `tests/unit/runtime.test.ts`, `tests/unit/validation.test.ts`, `tests/smoke/local-http-smoke.mjs`, `tests/smoke/miniflare-smoke.mjs`, `tests/browser/auth-refresh.md`, `tests/evidence/local-pbkdf2.md`, `tests/evidence/production-release.md`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Exact files added/modified in the first review iteration

- Runtime: `src/worker/app.ts`, `src/worker/documents.ts`, `src/worker/organization.ts`, `src/worker/reports.ts`, `src/worker/expiry.ts`, `src/worker/http.ts`, `src/worker/ubl.ts`.
- Schema/docs: `migrations/d1/0001_fresh_schema.sql`, `docs/cloudflare-deployment.md`.
- Tests/fixtures: `tests/unit/review-fixes.test.ts`, `tests/integration/d1/review-correctness.test.ts`, `tests/fixtures/invoice/first-invoice.xml`, `tests/smoke/miniflare-smoke.mjs`, `tests/smoke/local-http-smoke.mjs`.
- Evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Second correctness-review corrections

- Restored the legacy repair-item billing route by sharing validated bill creation with the established `id|serviceRequestId` alias.
- Made customer/staff summary, distribution, trend, and top sections independent of detail pagination; populated all vehicle expense/rental breakdowns with scoped aggregate SQL.
- Added atomic dual-window admin-login rate limiting with longest-window retry behavior and HMAC-only persisted keys.
- Made suppressed notification read-through terminate when no accessible unread work remains below the barrier.
- Added canonical UUID/email/password, boolean, unknown-key, and bill DTO boundary validation; invalid passwords now return `400`.
- Routed every active D1 multi-statement write through safe error translation while preserving invoice-chain and lease outcomes; moved latest-invoice chain repair before deletion so FK `SET NULL` cannot erase ownership first.
- Added one-to-one route/OpenAPI coverage for every protected operation and fixed static ordering for corporate `/all` and invoice/quotation/job-sheet collection paths.
- Added concurrent limiter, repair billing, batch mapping, barrier, multi-page reports, vehicle breakdown, route inventory, and authenticated document collection regressions.

## Exact files added/modified in the second correctness-review iteration

- Runtime/schema: `src/worker/app.ts`, `src/worker/db.ts`, `src/worker/documents.ts`, `src/worker/expiry.ts`, `src/worker/http.ts`, `src/worker/openapi.ts`, `src/worker/organization.ts`, `src/worker/password.ts`, `src/worker/rate-limit.ts`, `src/worker/reports.ts`, `migrations/d1/0001_fresh_schema.sql`.
- Tests/evidence: `tests/contract/routes.test.ts`, `tests/integration/d1/review-correctness.test.ts`, `tests/evidence/local-pbkdf2.md`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Exact legacy moves

The following tracked paths were moved without active-runtime use (except credential redaction in compose) to the same relative path beneath `legacy/ec2/`: `Dockerfile`, `docker-compose.yml`, `postgresql.conf`, `.github/workflows/deploy.yml`, `migrations/README.md`, `migrations/add_staff_extended_fields.sql`, `migrations/rollback_staff_extended_fields.sql`, `scripts/seed-modules.ts`, `test/app.e2e-spec.ts`, `test/jest-e2e.json`, and every previously tracked file under `src/admin`, `src/auth`, `src/b2c-enquiry`, `src/bill`, `src/corporate-enquiry`, `src/enquiry-followup`, `src/module`, `src/notification`, `src/organization`, `src/repair-item`, `src/sales-report`, `src/service-request`, `src/staff`, `src/store`, and `src/user`, plus root `src/app.controller.ts`, `src/app.controller.spec.ts`, `src/app.module.ts`, `src/app.service.ts`, and `src/main.ts`. Destination is `legacy/ec2/` plus the original relative path; root infrastructure files are directly under `legacy/ec2/`. Marker: `legacy/ec2/README.md`.

## Third correctness-review corrections

- Added exact production-environment secret commands and the complete deploy-candidate → one-time production bootstrap → login verification → bootstrap-secret deletion flow, while preserving browser-gated frontend cutover.
- Added strict route-specific validation for generic enquiry/store/staff CRUD and the approved 400 message-array envelope; required fields can no longer be cleared and invalid values no longer fall through as D1 conflicts.
- Made permission replacement/reset validate duplicates and target existence before atomic writes.
- Added strict pagination/count metadata to growing admin, request, bill, enquiry, staff, vehicle, expense, and rental collections; notification status is now an indexed SQL barrier/aggregate query.
- Removed store-report request/job fan-out with independent relationship pre-aggregation.
- Added standards-shaped IPv6 parsing and canonical compression, including IPv4-mapped aliases and fixed malformed-input unknown buckets.
- Added create-after-latest-delete/latest-update invoice hash, TLV, and complete XML digest fixtures.
- Expanded OpenAPI validation schemas, the route-family acceptance matrix, the 23-entity property manifest, and exact D1 schema introspection coverage.
- Replaced the inactive legacy `password123` Swagger example with a non-value placeholder.

## Exact files added/modified in the third correctness-review iteration

- Runtime: `src/worker/app.ts`, `src/worker/http.ts`, `src/worker/openapi.ts`, `src/worker/organization.ts`, `src/worker/rate-limit.ts`, `src/worker/reports.ts`.
- Schema/docs/legacy: `migrations/d1/schema-source-manifest.md`, `docs/cloudflare-deployment.md`, `docs/worker-contract-matrix.md`, `legacy/ec2/src/auth/dto/admin-login.dto.ts`.
- Tests/fixtures/evidence: `tests/contract/routes.test.ts`, `tests/integration/d1/review-final.test.ts`, `tests/integration/d1/schema-contract.test.ts`, `tests/unit/rate-limit-ip.test.ts`, `tests/unit/review-fixes.test.ts`, `tests/fixtures/invoice/chain-cases.json`, `tests/evidence/local-pbkdf2.md`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Fourth correctness-review corrections

- Split service-request schemas by public, standard-admin, manual-admin, and update routes; blocked public assignment/identity injection; validated manual/update staff references; and restored lookup/detail/update envelopes.
- Required invoice/quotation prices, parent types, create/update field surfaces, and all source `decimal(10,2)` values/calculated totals now fail with message-array `400` before D1. Fresh D1 constraints enforce the same upper bounds.
- Restored expired plus expiring passport/iqama semantics, complete scheduled counts beyond 100 staff, legacy per-document status details, and an explicitly paginated expiry-alert envelope.
- Prevented future notification cursor manufacture by returning only a caller-owned database high-water mark when no unread recipient row is processed.
- Made configuration fail closed for unknown `APP_ENV`, non-host-only cookies, and missing/placeholder seller identity.
- Restricted caller-supplied request IDs to canonical UUIDs so PII/credential text cannot be reflected into response metadata or logs.

## Exact files added/modified in the fourth correctness-review iteration

- Runtime/schema: `src/worker/app.ts`, `src/worker/documents.ts`, `src/worker/env.ts`, `src/worker/expiry.ts`, `migrations/d1/0001_fresh_schema.sql`.
- Tests/evidence: `tests/unit/env.test.ts`, `tests/integration/d1/review-final.test.ts`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Validation summary

- PASS: `npm install`, `npm ci`, typecheck, build, lint, all tests (12 files/47 tests), focused D1 review integration, route-wide OpenAPI/auth contract, exact-column schema introspection, clean D1 migration/reapplication, schema/FK/seed/index checks, expanded Miniflare HTTP smoke, local PBKDF2 benchmark, credential-free Wrangler dry-run, active dependency scans, `npm run validate:ci`, and `git diff --check`.
- Latest dry-run passed with the placeholder D1 binding and no authentication or deployment.
- Full details: `.agents/tasks/cloudflare-migration/verification-evidence.md`.

## Credential-blocked/manual release gates

No account/resource creation, secret setting, deployment, Vercel modification, custom hostname, DNS mutation, production browser test, deployed CPU/login-spike measurement, D1 quota measurement, disposable restore, or AWS action was performed. Workers Free CPU eligibility, final browser cookie behavior, real D1 quotas, and restore remain blocking production gates. Follow `docs/cloudflare-deployment.md`; do not weaken PBKDF2 or cut over while a gate is missing/failed. No git commit was created, as explicitly requested.

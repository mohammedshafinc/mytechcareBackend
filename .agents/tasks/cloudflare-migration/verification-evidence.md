# Cloudflare migration verification evidence

Verification date: 2026-10-20. This is the fourth correctness-review iteration. No Cloudflare/Vercel login, deployment, DNS change, AWS action, or git commit was performed.

## Final status

| Check | Result |
|---|---|
| `npm install` | PASS; exact direct versions remain pinned and the lockfile is current. |
| `npm ci` | PASS from the committed lockfile. |
| `npm run typecheck` | PASS. |
| `npm run build` | PASS; the Worker TypeScript graph builds. |
| `npm run lint` | PASS with zero warnings/errors. |
| `npm test -- --run` | PASS: 12 files, 47 tests, including route-wide contract, complete schema introspection, and focused fourth-review D1 regressions. |
| focused D1 integration | PASS: repair-item bill contract; atomic dual admin-login buckets under concurrent acquisition; HMAC-only limiter keys and longest retry; canonical UUID/password/unknown-field rejection; mapped batch FK failures; arbitrary document keys rejected; concurrent invoice-chain creation plus latest update/delete ownership repair; 100-child creation and atomic replacement; job sheet with no children; store/staff counter floors; non-super-admin store isolation; terminating notification suppression/regrant/deactivation barrier plus 501 rows processed as 500+1 within the 100-binding limit; page-independent customer/staff aggregates; populated vehicle expense/rental breakdowns; all ten report/dashboard families with indexed timestamp predicates. |
| UBL compatibility fixture | PASS: complete UTF-8 XML bytes match `tests/fixtures/invoice/first-invoice.xml`; QR TLV Base64, namespaces, EN16931/ZATCA profile, ICV/PIH/QR references, tax blocks, and escaping are asserted. |
| timestamp/public mapping tests | PASS: Gregorian rollover, invalid clock/offset values rejected; valid offset normalized; `_halalas`, `_tenths`, `_bps`, and boolean storage names map to public DTO names/values. |
| `npm run benchmark:password` | PASS locally with PBKDF2 fixed at 600,000 iterations; the benchmark was rerun in this iteration. Deployed Worker billed CPU and login-spike behavior remain mandatory release gates. |
| clean local D1 migration | PASS at `.tmp/d1-fourth-review`: `0001` and `0002` applied from an empty local state, including document `decimal(10,2)` upper constraints. |
| migration reapplication | PASS: `No migrations to apply`. |
| schema/FK/seed checks | PASS: `PRAGMA foreign_key_check` empty; 32 non-internal tables; 8 modules; 17 submodules; 0 role policy rows. |
| report query plan | PASS: direct `created_at >= ? AND created_at < ?` predicate uses covering index `idx_service_requests_created`; source scan finds no `WHERE substr(created_at...)` or `WHERE date(created_at...)`. |
| credential-free Wrangler dry-run | PASS with the placeholder D1 binding and no authentication or deployment. |
| expanded local Worker smoke | PASS on a freshly migrated D1 database. Covered `/api`; one-time bootstrap; admin login/refresh/logout; exactly 10 public creates and 30 lookups followed by generic `429` + `Retry-After`; notification polling; bill envelope; invoice parent/child create; adversarial document-key rejection; atomic item replacement; UBL envelope; store create/counter advancement; vehicle create/future-expense rejection; follow-up predecessor and atomic parent closure; invoice report; scheduled idempotency. |
| active runtime dependency scan | PASS: active `src` has no Nest, TypeORM, PostgreSQL `pg`, Socket.IO, `app.listen`, or `@nestjs/schedule` import/reference. |
| SQL identifier review | PASS: document DTO keys use fixed allowlisted maps; no request-derived identifier interpolation pattern remains. |
| `npm run validate:ci` | PASS end-to-end after the fourth review fixes: typecheck, build, lint, all 47 tests, generated CI config, migration check, and dry-run. |
| `git diff --check` | PASS. |

## Review finding resolution evidence

1. **Document SQL identifier injection:** `src/worker/documents.ts` rejects unknown parent/item keys and uses fixed DTO-to-column maps. The adversarial key is rejected with `400` in D1 integration and smoke tests.
2. **Document replacement/chain gaps:** invoice/quotation replacements and job-sheet non-empty replacements run parent totals/hash update, child deletion, and bounded child inserts in one D1 batch. Missing parents return `404`; job-sheet `items: []` remains a no-op; chain conflicts retry at most twice and the latest-chain trigger repairs state.
3. **Cross-store organization access:** `src/worker/organization.ts` reloads the actor store and scopes every vehicle, rental, expense, direct-record, and report query. No-store lists are empty and cross-store direct access returns `403`.
4. **CRUD invariants:** follow-up predecessor/uniqueness and parent closure are enforced with atomic D1 batches; store/staff counter floor triggers cover matching manual codes; vehicle/rental store/staff ownership, date order, Riyadh future-expense, active vehicle, and odometer/return rules are validated.
5. **DTO/envelope regressions:** explicit unit-name mapping removes storage suffixes. Documents, service requests, bills, enquiries, stores, staff, vehicles, rentals, expenses, and reports return success/message/count/data/pagination or legacy direct-record shapes as applicable; staff/service-request relations are projected explicitly.
6. **UBL/XML:** the legacy namespace/template/profile/reference/tax/customer/line structure and validation envelopes are restored and checked against complete fixture bytes.
7. **Reports:** report families now use endpoint-specific assemblers with populated summaries, trends, distributions, customer/enquiry aggregation, performers, product/part analytics, and bounded detail pagination, plus integer aggregate SQL and direct indexed date/timestamp predicates rather than one collapsed response and scan-forcing predicates.
8. **Notifications:** `unreadOnly` is validated/honored. Read-through identifies the first suppressed barrier, processes unread recipient rows progressively, chunks 500 updates into D1-safe statements of at most 100 bindings, and reports resumable progress/counts.
9. **Cron completion:** token-conditional completion uses `RETURNING` and requires a changed row; stale owners cannot report completion. Cleanup outcome is separated and cannot turn committed publication into a failed run.
10. **Timestamp rollover:** calendar, clock, fraction, and ±14:00 offset bounds are checked before `toISOString()` normalization.
11. **Parity evidence:** unit, D1 integration, full XML fixture, clean-migration checks, query-plan checks, expanded HTTP smoke, dependency scans, and full CI validation are recorded above.
12. **Zero-cost release fit:** local code gates pass, but deployed Workers Free CPU/login-spike, final D1 quota, browser cookies, and disposable restore cannot be established without owner credentials and deployment. They remain mandatory blocking production gates; no security parameter was weakened.
13. **Production deployment step:** `docs/cloudflare-deployment.md` includes explicit production migration/dry-run, all environment-selected secrets, candidate deployment/bootstrap/removal, and blocks frontend cutover until final-host browser evidence passes.

## Exact files modified in the first review iteration

- `src/worker/app.ts`
- `src/worker/documents.ts`
- `src/worker/organization.ts`
- `src/worker/reports.ts`
- `src/worker/expiry.ts`
- `src/worker/http.ts`
- `src/worker/ubl.ts`
- `migrations/d1/0001_fresh_schema.sql`
- `docs/cloudflare-deployment.md`
- `tests/unit/review-fixes.test.ts`
- `tests/integration/d1/review-correctness.test.ts`
- `tests/fixtures/invoice/first-invoice.xml`
- `tests/smoke/miniflare-smoke.mjs`
- `tests/smoke/local-http-smoke.mjs`
- `.agents/tasks/cloudflare-migration/verification-evidence.md`
- `.agents/tasks/cloudflare-migration/migration-summary.md`

## Second correctness-review resolution

- `POST /api/repair-item/bill` now uses the same validated bill creation operation as `POST /api/bill`, retaining the `REPAIR_ITEMS` permission and `id|serviceRequestId` alias.
- Customer and staff report aggregates/top lists now run over the complete validated range and remain identical across detail pages. Vehicle expense and rental store/vehicle/payment/company/detail breakdowns are populated with store scope and date overlap filtering.
- Admin login increments and evaluates IP/account windows in one D1 batch, stores HMAC-only keys, and returns the longer retry window without doing password derivation after a block.
- Notification read-through now reports `hasMore` only for accessible unread rows before the first suppressed barrier, preventing an endless zero-progress loop.
- Admin/phone login, admin lifecycle, bill/repair billing, service-request UUIDs, and invoice UUIDs apply route-specific allowlists and canonical validators. Invalid administrator passwords return `400`.
- All active multi-statement writes use the safe D1 batch wrapper. It maps ordinary uniqueness/FK/check failures while retaining explicit invoice-chain and lease behavior.
- Invoice-chain latest-delete repair now runs `BEFORE DELETE`, before the `ON DELETE SET NULL` action can erase ownership; concurrent create, latest update, and latest delete are covered.
- Added a one-to-one OpenAPI/route manifest contract and unauthenticated protection check for every protected operation. This exposed and fixed static route ordering for corporate `/all` and document collection routes before `/api/bill/:mobile`.
- Focused tests cover the eight local review findings: concurrent dual login limits, repair billing, validation/error mapping, suppression/regrant/deactivation barriers, multi-page report aggregates, populated vehicle reports, document collection routing, and concurrent invoice-chain create/update/latest-delete repair. Full result: 9 files/30 tests.
- The strict zero-cost external gates could not be run without a Cloudflare account, deployment, real traffic, DNS/browser setup, and owner credentials. They remain explicit production blockers; no password/security parameter was weakened and no cutover was attempted.

## Exact files modified in the second correctness-review iteration

- Runtime/schema: `src/worker/app.ts`, `src/worker/db.ts`, `src/worker/documents.ts`, `src/worker/expiry.ts`, `src/worker/http.ts`, `src/worker/openapi.ts`, `src/worker/organization.ts`, `src/worker/password.ts`, `src/worker/rate-limit.ts`, `src/worker/reports.ts`, `migrations/d1/0001_fresh_schema.sql`.
- Tests/evidence: `tests/contract/routes.test.ts`, `tests/integration/d1/review-correctness.test.ts`, `tests/evidence/local-pbkdf2.md`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Third correctness-review resolution

- Production initialization now uses `--config wrangler.production.jsonc --env production` for all six secrets and all three bootstrap-secret deletions. The guide deploys a candidate, bootstraps the separate production D1 exactly once, verifies login, removes bootstrap secrets, and keeps frontend cutover blocked on final-host browser evidence.
- Generic enquiry/store/staff CRUD now applies route-specific string length, nullable, DATE, positive-ID, money-range, and non-negative integer validation before SQL. Required fields cannot be cleared on update, and all validation failures use the approved `400` message-array envelope.
- Permission replacements reject duplicate values before D1 work, verify the target user even for empty replacements, and preserve the prior assignment on failure. Reset routes also return `404` for nonexistent targets.
- Admin users, permission assignments, service-request collections, mobile bills, corporate-all, staff-by-store, vehicles, expenses, and rentals now use strict default-20/max-100 pagination with count metadata. Notification status uses one indexed SQL barrier/aggregate query instead of materializing recipient history.
- Store reporting now pre-aggregates staff, requests, and job/item costs independently before joining stores; a two-request/two-item fixture proves parts costs are not multiplied.
- IPv6 limiter input now validates and canonicalizes compressed/expanded and IPv4-mapped aliases; malformed, zoned, comma-separated, or whitespace-bearing forms use the fixed operation-specific unknown bucket.
- `tests/fixtures/invoice/chain-cases.json` adds literal chain-hash, TLV Base64, and complete-XML SHA-256 goldens for create-after-latest-delete and latest-invoice-update cases.
- The schema-source manifest now maps every persisted property for all 23 entities and every operational table/rule. A D1 introspection test asserts every exact column list, critical FKs/indexes/triggers, seed counts, and empty foreign-key check. The route-family matrix plus authenticated D1 tests cover DTO/RBAC/envelope/view-only/empty-role behavior; OpenAPI now includes path parameters, validation responses, and reviewed CRUD schemas.
- The inactive Swagger password-like example now uses `REPLACE_WITH_PASSWORD`.

## Exact files modified in the third correctness-review iteration

- Runtime: `src/worker/app.ts`, `src/worker/http.ts`, `src/worker/openapi.ts`, `src/worker/organization.ts`, `src/worker/rate-limit.ts`, `src/worker/reports.ts`.
- Schema/docs/legacy marker: `migrations/d1/schema-source-manifest.md`, `docs/cloudflare-deployment.md`, `docs/worker-contract-matrix.md`, `legacy/ec2/src/auth/dto/admin-login.dto.ts`.
- Tests/fixtures/evidence: `tests/contract/routes.test.ts`, `tests/integration/d1/review-final.test.ts`, `tests/integration/d1/schema-contract.test.ts`, `tests/unit/rate-limit-ip.test.ts`, `tests/unit/review-fixes.test.ts`, `tests/fixtures/invoice/chain-cases.json`, `tests/evidence/local-pbkdf2.md`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Fourth correctness-review resolution

- Split public/standard-admin/manual/update service-request allowlists. Public and standard creation can no longer set UUID/reference/audit/assignment fields; only manual creation accepts assignment and validates that staff before counter allocation. Public lookup, protected detail, and update now return the legacy envelopes, and update validation maps malformed fields to message-array `400` responses.
- Required invoice/quotation prices can no longer default to zero. Document create/update now enforce route-specific parent/item fields and types, `decimal(10,2)` value and calculated-total bounds, and matching D1 upper constraints before persistence.
- Expiry SQL now includes already-expired passport/iqama dates and computes the complete staff count without a 100-row cap. The HTTP endpoint restores the success/message/count/data contract, per-document status and days remaining, store code, plus explicit page/limit/totalPages metadata; scheduled notification counts are complete.
- Notification read-through derives no-work progress from the caller's existing accessible recipient high-water mark instead of the requested target. A far-future target cannot skip a later publication.
- Environment parsing accepts only `local`, `staging`, or `production`; requires host-only cookies and nonempty, non-placeholder seller identity values; and therefore fails closed before route logic on misspelled or incomplete production configuration.
- Request IDs retain only canonical UUID input. Arbitrary values are replaced before response metadata and structured logging, with a sensitive-header regression.
- The HIGH zero-cost eligibility finding remains a blocking external release gate rather than a locally claimed pass. Deployment is explicitly forbidden in this task and no Cloudflare/Vercel credentials or final browser host are available, so deployed PBKDF2/login-spike CPU, real D1 quota/storage, final-host browser refresh cookies, and disposable restore were not run. Cutover must stop until all four are recorded as passed without weakening PBKDF2.

## Exact files modified in the fourth correctness-review iteration

- Runtime/schema: `src/worker/app.ts`, `src/worker/documents.ts`, `src/worker/env.ts`, `src/worker/expiry.ts`, `migrations/d1/0001_fresh_schema.sql`.
- Tests: `tests/unit/env.test.ts`, `tests/integration/d1/review-final.test.ts`.
- Workflow evidence: `.agents/tasks/cloudflare-migration/verification-evidence.md`, `.agents/tasks/cloudflare-migration/migration-summary.md`.

## Production release gates not claimed locally

- Deploy to a Free-plan staging Worker and record billed CPU median/p95/max plus a short concurrent login spike with fixed PBKDF2 parameters. Stop zero-cost cutover if the Free CPU gate fails.
- Run login → full reload → refresh after access expiry → logout in supported real browsers on final `https://app.mtechcare.com` → `https://api.mtechcare.com`.
- Measure D1 rows read/written/storage against real staging traffic and expected daily volume.
- Create a Time Travel bookmark/export and prove restore into a disposable D1 database.
- Complete Cloudflare account/D1 creation, secrets, workers.dev staging, custom hostname, Vercel environment, DNS preservation, monitoring, and rollback exercises manually.

See `tests/evidence/production-release.md`, `tests/browser/auth-refresh.md`, and `docs/cloudflare-deployment.md`. Production cutover remains blocked until these owner/credential-dependent gates pass. They were not run because this implementation task explicitly forbids deployment/DNS changes and provides no Cloudflare/Vercel credentials or final browser topology; no local substitute is claimed.

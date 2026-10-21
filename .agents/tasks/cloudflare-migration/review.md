# Cloudflare Worker runtime and fresh D1 backend

This change replaces the reachable NestJS/PostgreSQL deployment with a Hono Worker, direct D1 persistence, durable notification polling, and a Riyadh Cron Trigger while retaining the approved `/api` surface. The fourth correction pass addresses the prior service-request, document, expiry, notification-cursor, configuration, and request-ID findings, and its recorded local validation passes. The migration still cannot establish the binding `$0` requirement without deployed Free-plan evidence, and several money fields remain less constrained than their source `decimal` contracts. Watch for: strict Workers Free eligibility is unproved (**confirmed, HIGH**); bill, expense, rental, salary, and document-line storage can exceed approved source precision (**confirmed, MEDIUM**); malformed JWT signatures can return `500` instead of `401` (**confirmed, LOW**); and the deployment guide omits the approved custom-domain Cloudflare rate-limit rule (**confirmed, LOW**).

**Verdict**: NEEDS_CHANGES

## High-level view

The active runtime is Worker-native and schedules the Riyadh job through Wrangler at `0 5 * * *`. Local PBKDF2 timing and credential-free dry runs cannot prove that authentication CPU, D1 usage, browser cookies, or restore behavior fit the Free plan in production (**confirmed, HIGH**).

Document requests now enforce source money maxima, but bills, vehicle expenses, rentals, staff salary storage, and some document-line schema constraints do not (**confirmed, MEDIUM**). Reachable request paths and direct D1 integrity therefore remain weaker than the approved source-precision contract.

The JWT decoder performs signature Base64 decoding outside its malformed-token guard, so a crafted bearer token reaches the generic internal-error response instead of the authentication failure contract (**confirmed, LOW**).

The beginner guide omits the design-required step for adding the available Free-plan Cloudflare custom-domain rate-limit rule over login and public service-request paths (**confirmed, LOW**).

<details>
<summary>Issues (4)</summary>

1. **Workers Free release eligibility — HIGH, confirmed** — Deployed PBKDF2/login-spike CPU, D1 quota, final-host browser cookies, and disposable restore remain unchecked. Run every fixed-security staging gate and block cutover on any failure.
2. **Money precision bounds — MEDIUM, confirmed** — Bills, expenses, rentals, salary columns, and document line totals can exceed their source decimal precision. Enforce field-specific maxima in request/calculation code and matching D1 `CHECK` constraints.
3. **Malformed JWT signature response — LOW, confirmed** — Invalid Base64url in the signature segment returns `500` instead of generic `401`. Guard all token-segment decoding and add a malformed-signature contract test.
4. **Custom-domain edge rate-limit instructions — LOW, confirmed** — The beginner guide omits the approved Cloudflare Free-plan edge rule for login and public service requests. Add a dashboard walkthrough without replacing the in-Worker limiter.

</details>

<details><summary>Details</summary>

## Free-plan release eligibility remains unverified

`verification-evidence.md` and `tests/evidence/production-release.md` leave deployed PBKDF2 CPU, a concurrent login spike, D1 rows read/written/storage, final `app.mtechcare.com` → `api.mtechcare.com` browser refresh behavior, and a disposable D1 restore unchecked (**confirmed, HIGH**). These are binding release gates because local emulation cannot establish Cloudflare billing or browser-host behavior. Deploy to a Free-plan staging Worker, run every gate without weakening PBKDF2, and stop cutover if any CPU or quota measurement does not fit the Free limits.

## Source decimal precision is not preserved outside document input checks

The source models declare bills, staff salary, invoice/quotation lines, and rental financial fields as `decimal(10,2)`, and vehicle expenses as `decimal(12,2)`. `POST /api/bill`, vehicle expense create/update, and rental create/update/return call `money()` without the corresponding maximum; for example, `100000000.00` SAR passes bill validation despite exceeding `decimal(10,2)` (**confirmed, MEDIUM**). Larger accepted values can also exceed JavaScript’s exact integer range before persistence or aggregation.

D1 gives bill prices, staff salary/previous salary, vehicle expense amounts, rental daily/total/deposit values, and invoice/quotation `line_total_halalas` only lower bounds (**confirmed, MEDIUM**). Add field-specific `10,2` and `12,2` converters, guard calculated rental totals, add matching upper-bound `CHECK` constraints, and test the exact maximum and one halala above it.

## Malformed JWT signatures bypass the unauthorized error contract

`verifyJwt` catches malformed header and payload decoding but calls `atob` on the signature afterward (**confirmed, LOW**). Invalid Base64url in the third segment becomes `500 Internal server error`; validate/catch all three segments and return the generic `401` used for other invalid tokens.

## Custom-domain edge throttling is absent from the deployment runbook

The approved design requires a guide step for the Cloudflare Free-plan rate-limiting rule on custom-domain login and public service-request paths. `docs/cloudflare-deployment.md` configures the application limiter but contains no WAF or edge-rule setup (**confirmed, LOW**). Add a beginner-safe dashboard walkthrough while retaining the in-Worker limiter as the correctness control.

</details>

<details>
<summary>File map</summary>

- `src/worker.ts`, `src/worker/app.ts` — Worker lifecycle, route graph, auth/RBAC, CRUD modules, notifications, expiry, and reports.
- `src/worker/{auth,password,jwt,rate-limit,env,http,db,bulk}.ts` — cookies, credentials, token validation, throttling, canonical values, D1 errors, counters, and batches.
- `src/worker/{documents,ubl,organization,reports,expiry}.ts` — document transactions/UBL, scoped organization finance, report SQL, and leased scheduling.
- `migrations/d1/**` — 23 source entities and operational tables with definitions, constraints, triggers, and indexes.
- `tests/**` — unit, integration, contract, smoke, invoice golden, browser checklist, and release-gate evidence.
- `wrangler.example.jsonc`, `package*.json`, `.github/workflows/validate.yml` — placeholder Worker configuration, pinned dependencies, lockfile, and validation-only CI.
- `docs/**`, `README.md`, `legacy/ec2/**` — deployment/cutover guidance and inactive EC2/PostgreSQL compatibility reference.
- `.agents/tasks/cloudflare-migration/{design,implementation-plan,migration-summary,verification-evidence}.md` — approved behavior, scope, changed-file inventory, and verification; use the repository comparison for the full diff.

</details>

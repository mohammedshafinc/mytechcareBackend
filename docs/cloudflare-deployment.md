# Beginner deployment guide: Cloudflare Workers + D1

No step in this document has been performed for you. Commands containing `<...>` require your own values. Never paste secrets into git, screenshots, tickets, or chat.

## 1. Create and secure the account
1. Create a free account at `https://dash.cloudflare.com/sign-up` and verify email.
2. Enable multi-factor authentication. Store recovery codes securely.
3. In Workers & Pages, choose a unique `workers.dev` subdomain. Stay on the Free plan; quota exhaustion must fail closed rather than create paid overage.
4. Install Node.js 22 and npm locally. Run `npm ci`, `npm run typecheck`, `npm run build`, `npm run lint`, and `npm test -- --run`.
5. Authenticate locally with `npx wrangler login`. This opens Cloudflare in your browser and does not store credentials in the repository.

## 2. Create fresh D1 databases
Create separate databases; do not import RDS data:
```bash
npx wrangler d1 create mytechcare-staging
npx wrangler d1 create mytechcare-production
```
Copy the displayed IDs privately:
```bash
cp wrangler.example.jsonc wrangler.staging.jsonc
cp wrangler.example.jsonc wrangler.production.jsonc
```
Both copies are ignored by git. Replace only `REPLACE_WITH_*_D1_DATABASE_ID`, staging frontend origin, and seller display values in those private files. Never add `account_id`. Verify the tracked example stayed unchanged:
```bash
git diff --exit-code -- wrangler.example.jsonc
```

Apply a local clean migration first, then remote staging:
```bash
npm run db:migrate:local -- --config wrangler.staging.jsonc --persist-to .tmp/staging-local
npm run db:migrate:staging -- --config wrangler.staging.jsonc
```
Before production, use the production config explicitly:
```bash
npm run db:migrate:production -- --config wrangler.production.jsonc
npx wrangler deploy --dry-run --config wrangler.production.jsonc --env production
```
Do not deploy the production candidate while any staging CPU, quota, restore, migration, or security gate is pending or failed. The environment-selected production deploy command appears in the final production initialization flow in section 3. Deployment is not cutover: the final-host browser gate must run afterward and still blocks switching the frontend.
D1 is fresh. These migrations create all 23 application tables plus operational tables, indexes, constraints, triggers, module definitions, and empty role policy. They create no user or default password.

## 3. Configure secrets and first administrator
Generate each value independently with a trusted password manager or cryptographic generator. JWT and rate-limit secrets must be at least 32 random bytes. The admin password must contain at least 12 Unicode code points and no more than 128 UTF-8 bytes.
```bash
npx wrangler secret put JWT_ACCESS_SECRET --config wrangler.staging.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config wrangler.staging.jsonc
npx wrangler secret put RATE_LIMIT_HMAC_SECRET --config wrangler.staging.jsonc
npx wrangler secret put BOOTSTRAP_TOKEN --config wrangler.staging.jsonc
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL --config wrangler.staging.jsonc
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD --config wrangler.staging.jsonc
```
Repeat only after staging is approved, using different production values and the explicit Wrangler environment selector on every command:
```bash
npx wrangler secret put JWT_ACCESS_SECRET --config wrangler.production.jsonc --env production
npx wrangler secret put JWT_REFRESH_SECRET --config wrangler.production.jsonc --env production
npx wrangler secret put RATE_LIMIT_HMAC_SECRET --config wrangler.production.jsonc --env production
npx wrangler secret put BOOTSTRAP_TOKEN --config wrangler.production.jsonc --env production
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL --config wrangler.production.jsonc --env production
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD --config wrangler.production.jsonc --env production
```
Omitting `--env production` writes secrets to the wrong Worker environment and leaves production unavailable.

Run a non-deploying bundle check:
```bash
npm run deploy:dry-run -- --config wrangler.staging.jsonc
```
Then deploy manually to `workers.dev`:
```bash
npx wrangler deploy --config wrangler.staging.jsonc
```
Bootstrap staging once with an empty body and bearer token:
```bash
curl -i -X POST 'https://<staging-worker>.<subdomain>.workers.dev/api/setup/bootstrap' -H 'Authorization: Bearer <staging-one-time-bootstrap-token>'
```
Verify staging admin login succeeds, then delete every staging bootstrap secret with explicit commands:
```bash
npx wrangler secret delete BOOTSTRAP_TOKEN --config wrangler.staging.jsonc
npx wrangler secret delete BOOTSTRAP_ADMIN_EMAIL --config wrangler.staging.jsonc
npx wrangler secret delete BOOTSTRAP_ADMIN_PASSWORD --config wrangler.staging.jsonc
```
The staging bootstrap route must then return 404.

After the production migration, staging CPU/quota/restore/security gates, and production secret setup have all succeeded, deploy a production candidate with explicit environment selection and then bootstrap its separate fresh D1 database exactly once. Do not point Vercel at it yet: production cutover remains blocked until the final-host browser gate passes.
```bash
npx wrangler deploy --config wrangler.production.jsonc --env production
curl -i -X POST 'https://api.mtechcare.com/api/setup/bootstrap' -H 'Authorization: Bearer <production-one-time-bootstrap-token>'
```
Verify production admin login and permissions succeed before deleting the three production bootstrap secrets:
```bash
npx wrangler secret delete BOOTSTRAP_TOKEN --config wrangler.production.jsonc --env production
npx wrangler secret delete BOOTSTRAP_ADMIN_EMAIL --config wrangler.production.jsonc --env production
npx wrangler secret delete BOOTSTRAP_ADMIN_PASSWORD --config wrangler.production.jsonc --env production
```
Confirm the production bootstrap route returns 404 afterward. Assign explicit modules/submodules before activating non-super-admins; fresh role fallbacks intentionally have no access.

## 4. Staging checks on workers.dev
Treat `workers.dev` as API/curl staging, not proof of browser cookies. Verify:
- `GET /api`, `/api/docs`, and `/api/openapi.json`.
- Admin login, permissions, refresh and logout; public request creation and mobile lookup limits.
- Store/staff, enquiries, service request/bill, vehicle/rental, invoice/quotation/job-sheet CRUD.
- One invoice with children, UBL generation/validation, one report, notification poll/read, and expiry endpoint.
- Trigger scheduled testing/manual retry without creating duplicate date events.
- Worker logs contain request IDs and safe categories, never bodies, tokens, cookies, names, contact data, identity data, salary/bank data, XML, or SQL values.
- Workers CPU and D1 rows read/written/storage dashboards stay safely below Free limits.

PBKDF2 is fixed at 600,000 SHA-256 iterations and must not be weakened. Deploy the benchmark/staging login and record median, p95 and maximum Worker CPU plus a short login spike. If it cannot fit Free CPU, stop: strict $0 is infeasible and architecture/budget needs review.

## 5. Vercel integration
Set the frontend API environment variable to the exact Worker API URL plus `/api`, redeploy, send `credentials: 'include'`, keep access tokens in memory, and replace Socket.IO with authenticated polling every 30–60 seconds while logged in. Persist `nextCursor`, back off after failures, and refetch after permission/account changes.

For production, Vercel must use a same-site custom hostname under `mtechcare.com`, for example `app.mtechcare.com`; the Worker uses `api.mtechcare.com`. Set production `ALLOWED_ORIGINS=https://app.mtechcare.com`, `COOKIE_DOMAIN=` (empty), and `COOKIE_SAME_SITE=Lax`. The refresh cookie is host-only for the API, HttpOnly, Secure, Path `/`; never add a Domain attribute. A frontend left only on `vercel.app` is unsupported until a separate non-cookie refresh/CSRF design is reviewed.

## 6. DNS and custom hostname (manual only)
Before changing nameservers, DNSSEC, or records:
1. Export and screenshot every existing DNS record and current nameservers.
2. Identify and preserve Vercel CNAME/A records and all MX, SPF, DKIM, DMARC, provider-verification and other email records.
3. Understand registrar DNSSEC/DS changes; a mismatch can make the whole domain unreachable.
4. Add `app.mtechcare.com` to the existing Vercel project and follow Vercel's shown DNS record exactly.
5. Add `api.mtechcare.com` as a Worker custom domain in Cloudflare. Do not configure a repository route automatically.
6. Confirm TLS and exact CORS before switching the frontend API URL.

Do not stop/delete EC2 or RDS as part of these instructions. They are suspended and old data was intentionally discarded; AWS is not this migration's rollback target.

## 7. Mandatory browser release gate
Using the final `https://app.mtechcare.com` → `https://api.mtechcare.com` topology, run the checklist in `tests/browser/auth-refresh.md` in current Chrome and Firefox or Safari. Login, inspect that a host-only API cookie exists without recording its value, fully reload, refresh after access expiry, log out, confirm cookie removal, and confirm another refresh is rejected. Record date/browser/pass-fail only. Production cutover is blocked without this evidence.

## 8. Monitoring and rollback
Monitor Worker error rate, CPU p50/p95/max, request count, Cron outcomes, and D1 rows read/written/storage daily at first. Free quota exhaustion causes failure; it does not guarantee service. Keep PII-safe log retention appropriate for the business.

Before every production migration, create a D1 Time Travel bookmark/export and verify restoration in a disposable D1 database. Keep the previous Worker version available. Roll back application code to the prior Worker deployment and database state with D1 Time Travel/bookmark procedures, testing in disposable D1 first. Keep `workers.dev` staging available while production is repaired. Never claim rollback is tested until an actual disposable restore succeeds.

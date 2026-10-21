# Worker route-family acceptance matrix

`src/worker/openapi.ts` is the exact method/path inventory. `tests/contract/routes.test.ts` proves one-to-one registration and authentication on every protected operation. `tests/integration/d1/review-final.test.ts`, `review-correctness.test.ts`, and the smoke suite exercise the family-level DTO, RBAC, response, pagination, transaction, and store-scope contracts below.

| Route family | Access metadata | Boundary/response evidence |
|---|---|---|
| Utility/setup | public; bootstrap bearer + HMAC limiter | `/api`, docs/OpenAPI, bodyless one-time bootstrap and absent-secret behavior |
| Phone/admin auth | public login/refresh/logout; authenticated identity | strict phone/email/password shapes, fixed PBKDF2/JWT/cookie behavior, generic failures, dual login windows |
| Admin lifecycle/permissions | `AUTH/USER_MANAGEMENT` or `AUTH/MODULE_MANAGEMENT`; super-admin restrictions | inactive-until-assigned, last-super-admin/self protection, duplicate rejection, target existence, atomic replacement/reset, empty fallback |
| Service requests | public create/lookup limits; `CLIENTS/SERVICE_REQUESTS` for admin | create DTO/UUID/timestamps, pagination, assignment relation, no-domain-work limit behavior, counter and notification transaction |
| Bills/repair items | `CLIENTS/BILLS` or `CLIENTS/REPAIR_ITEMS` | `id|serviceRequestId`, numeric-string money, legacy success envelope, bounded mobile list |
| Invoice/quotation/job sheet | `BILLING` plus matching submodule | route-specific parent/item DTOs, 100-child transactions, list pagination, chain/UBL behavior |
| B2C/corporate enquiries | `ENQUIRE` plus matching submodule | route-specific required strings, DATE, nullable bounded optionals, 400 message arrays, paginated envelopes |
| Follow-ups | `ENQUIRE/ENQUIRY_FOLLOWUP` | parent type/id, number 1–3, predecessor/uniqueness, atomic closure, bounded parent list |
| Stores/staff | `ORGANIZATION/STORE_DETAILS` or `ORGANIZATION/STAFF` | exact source lengths/types/dates/money/experience, required-field update protection, references, counters, pagination |
| Vehicles/expenses/rentals | matching `ORGANIZATION` submodule and actor store | enums, dates, money/odometer, ownership, no-store/cross-store rules, bounded collection envelopes |
| Dashboard/reports | `REPORTS/DASHBOARD_VIEW` or `REPORTS/SALES_REPORT` | real max-366-day ranges, SQL aggregates, bounded details, stable envelopes, store fan-out fixture |
| Notifications/expiry | authenticated; expiry data needs `ORGANIZATION/STAFF`; retry super-admin | publication-fixed recipients, suppression barrier, bounded poll/read/status SQL, leased Riyadh idempotency |

Every authenticated write also passes the central view-only denial. Super-admin bypass and non-super-admin module/submodule checks are reloaded from D1 on every request rather than trusted from stale JWT claims. Error tests require `{statusCode:400,message:[...],error:"Bad Request"}` for validation failures; authorization and conflict responses retain string messages.

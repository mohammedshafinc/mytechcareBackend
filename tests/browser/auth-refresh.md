# Browser authentication release evidence

Production cutover is blocked until this is completed on final hostnames. Record no cookie/token values.

Topology: `https://app.mtechcare.com` → `https://api.mtechcare.com`.

For current Chrome and current Firefox or Safari:
1. Open a private window and sign in through the Vercel frontend.
2. Confirm the API host has a `refreshToken` cookie marked HttpOnly, Secure, SameSite=Lax, Path=/, and host-only (no Domain).
3. Confirm no refresh token appears in JSON, localStorage, sessionStorage, logs, screenshots, or devtools exports.
4. Fully reload the page; authenticated state must recover through refresh.
5. Wait for or force access-token expiry; refresh must return a new access token and protected API calls must succeed.
6. Log out; confirm the cookie is removed and a subsequent refresh returns 401.
7. Confirm an unapproved Origin receives no credentialed CORS access.

Evidence fields: date, frontend hostname, API hostname, browser/version, each step pass/fail, tester. `workers.dev` is API/curl-only unless this same sequence separately passes there. A `vercel.app`-only frontend is unsupported.

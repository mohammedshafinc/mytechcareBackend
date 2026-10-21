# Production release gates

- [ ] Deployed Worker PBKDF2 hash/verify CPU median, p95, maximum, and short login spike are within the current Free limit.
- [ ] Final Chrome login → reload → refresh → logout browser sequence passes.
- [ ] Final Firefox or Safari sequence passes.
- [ ] Exact `app.mtechcare.com` CORS and host-only `api.mtechcare.com` cookie verified.
- [ ] D1 quota/read/write/storage measurements approved.
- [ ] Disposable D1 Time Travel/export restore verified.
- [ ] DNS export preserves Vercel and MX/SPF/DKIM/DMARC/verification records.

These require owner credentials/deployed hosts/browser tooling and remain pending after local implementation. Do not cut over while any box is unchecked.

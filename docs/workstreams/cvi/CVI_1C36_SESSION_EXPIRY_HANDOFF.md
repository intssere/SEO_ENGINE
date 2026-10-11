# CVI-1C.36 — Session Expiration Boundaries and Rotation

Parent: CVI-1C.35 draft PR #1062, final documentation HEAD `217152aa3f8a2b2921fe23cd7452023010d9974a`; full CI success https://github.com/intssere/SEO_ENGINE/actions/runs/38081139530.

## Implementation
Extend the explicit disposable PostgreSQL authenticated HTTP certification with an absolute-expiry boundary scenario. Verify that rotation invalidates the prior token without extending `expires_at`, and that an expired session rejects both HTTP authentication and rotation. Independently verify that an idle-expired session cannot rotate or authenticate.

## Restrictions
Synthetic test data only in localhost `seo_engine_cvi_disposable`; no production migrations, live provider traffic, new public CVI route, publishing, merge or deployment. Successful checks do not establish Google origin or tenant authorization. Exact-head CI pending.

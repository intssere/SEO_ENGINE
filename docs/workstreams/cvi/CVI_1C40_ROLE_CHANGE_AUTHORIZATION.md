# CVI-1C.40 — Persisted Role Changes in Authenticated Sessions

Predecessor CVI-1C.39: implementation HEAD `7ce128792a362feefad9a4ae370cfc7ea4ac3fba` passed full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38123039267; documentation HEAD `0ed581c031a268d0cb8b754f31bcac52f57c3344` has pending final CI https://github.com/intssere/SEO_ENGINE/actions/runs/38123451962.

## Bounded implementation
Extend synthetic authenticated Express/PostgreSQL certification: a newly created admin session is allowed an authenticated CSRF-protected POST, then a direct persisted DB role demotion to viewer must deny the same POST without changing token. After token rotation, the new token must remain demoted; the old token must deny. A later stored promotion to admin is reflected on the next authenticated request. This is a regression for fresh session role readback; it does not establish who is authorized to mutate roles and does not certify arbitrary in-flight request revocation.

## Further required concurrency audit
An already-loaded role may remain in an in-flight request after concurrent demotion. Full mid-request authorization fencing requires separate endpoint-level or DB-transaction lock tests. Do not claim protection against such races based on this increment alone.

## Boundaries
Proof-only synthetic disposable PostgreSQL and localhost Express; no production DB, provider calls, public CVI routes, publishing, merges or deployments. Full exact-head CI pending.

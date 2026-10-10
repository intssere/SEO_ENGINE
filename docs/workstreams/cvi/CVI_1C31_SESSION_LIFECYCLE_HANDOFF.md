# CVI-1C.31 — Private Session Lifecycle Certification

Certified predecessor: CVI-1C.30 draft PR #1044 at HEAD `0687a23860c6e9cf86ce232899fdaa5b96bd914b`, successful full CI run https://github.com/intssere/SEO_ENGINE/actions/runs/38054658011.

## Scope
Extend disposable PostgreSQL private historical composition tests. Rotate a synthetic authenticated session token and verify the old token fails while the new token resolves the same DB session. Assert the private read remains historical-review-only when authorization is active. Expire the DB session and verify both token rejection and stale-principal denial. Check idle timeout rejection and subsequent restoration only inside the disposable database. Revoke the rotated token and verify rejection and final DENY.

## Boundaries and follow-ups
Existing session loader performs a SELECT followed by a separate last-seen UPDATE; this is a separate atomicity/revocation race to audit rather than claiming resolved here. Existing rotation returns a new token without verifying whether the UPDATE matched; assess separately before production approval. A rotated token does not itself create tenant/site authorization, and a historical acquisition is never an execution or publishing capability.

No production database, public route, live provider, CMS action, merge or deployment. Certification pending exact-head proof CI.

# CVI-1C.45 — Atomic Synthetic Authorization and Mutation

Parent CVI-1C.44 draft PR #1085: implementation SHA `e02b9af566132b29da92b79384d9dfe523217df2` passed https://github.com/intssere/SEO_ENGINE/actions/runs/38131455420. Documentation revision `6fb4215fed774085c211d9bf08348d5017740bb6` is awaiting final CI https://github.com/intssere/SEO_ENGINE/actions/runs/38131937115.

## Bounded regression
A disposable PostgreSQL session transaction locks the current authentication row (`FOR UPDATE`), checks revocation, absolute and idle expiry, and checks the stored admin role before inserting into an isolated temporary synthetic-write table. A permitted operation persists exactly one synthetic row; after a committed demotion or revocation, the same function denies and the synthetic row count must not increase. Authorization and insertion occur in the same transaction.

## Uncertified scope
This is test-only behavior and does not change production mutation handlers, their tenant/site scope checks, or live provider operation semantics. Concurrent transaction ordering was tested separately in CVI-1C.43/44. The new atomic operation test itself is sequential and still requires full CI. Do not infer a completed general-purpose authorization fence or publishing permission.

No production database, external provider calls, public CVI route, CMS writes, merge or deployment.

## Implementation CI certification receipt
- Exact implementation HEAD `bacb5ba87914e6898d04d9268f46f5b7ba608306`.
- Full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38132206299 — SUCCESS, job `114448676424`, no failed steps.
- PR #1088 remains open/draft and unmerged/undeployed. This documentation revision requires independent exact-head CI.

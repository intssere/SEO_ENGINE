# CVI-1C.42 — Transaction-Scoped Authorization Fencing Design

## Certified predecessor
CVI-1C.41 PR #1080 implementation `de83756aefa7eff62b41b2fd9f2ea8417612a3ef` passed full CI run https://github.com/intssere/SEO_ENGINE/actions/runs/38125703455. The documentation HEAD `59585ac6996567b8ae7805de9b4445c9b2420bca` requires its own exact-head proof.

## Source-backed boundary
`attachAuthSession` obtains a stored role snapshot and `requireApiAuthentication` checks `req.auth.role` once. A downstream action can observe this snapshot after a role demotion commits. CVI-1C.41 demonstrates that entry middleware is insufficient to certify changes during an already-in-flight request. Authentication of new requests and auth token rotation have separate certified tests.

## Proposed next bounded implementation
Inventory actual sensitive mutation handlers and their database transaction boundaries. Select one synthetic-only or already-isolated representative mutation, and establish an operation-authorization contract: session ID, persisted active/unexpired role, required role, tenant/site scope where applicable, and authorization check committed atomically with the protected change. Evaluate concurrency ordering with row locks and avoid deadlocks. Add disposable PostgreSQL tests for demotion before operation authorization and for a competing demotion blocked behind a legitimate ongoing operation; require explicit winner semantics. Do not retrofit every endpoint from a single synthetic test.

## Admission criteria
Identify exact source paths; preserve historical-review-only CVI and no publishing capability; document locked rows and transaction scopes; test revocation and role changes, including rejected operation and no synthetic mutation; run full exact-head CI and obtain independent design review before extending to real write paths.

## Status and restrictions
Design audit only. No production DB, external providers, public CVI route, CMS write, merge or deployment. No end-to-end transactional authorization fencing claimed.

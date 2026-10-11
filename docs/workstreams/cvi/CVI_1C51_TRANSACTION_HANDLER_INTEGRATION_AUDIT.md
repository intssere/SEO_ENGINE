# CVI-1C.51 — Transactional Handler Integration Gap Audit

## Baseline and evidence
Parent CVI-1C.50 draft PR #1096, documentation HEAD `9c75d4232aa90979abe4ae92dc53e22c34f19b68`; documentation-inclusive CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38142969295 (pending when this audit was authored).

Source checked: `artifacts/api-server/src/middlewares/auth-security.ts`, `artifacts/api-server/src/lib/cvi-gsc-disposable-authenticated-session.ephemeral.test.ts`, and `docs/workstreams/cvi/CVI_1C42_TRANSACTION_AUTHORIZATION_DESIGN.md`.

`attachAuthSession` loads a database session and assigns `req.auth`. `requireApiAuthentication` checks the role from that request snapshot and invokes `next()`. Neither middleware itself holds a database authorization lock through later handler mutations. The synthetic CVI-1C.42–1C.50 regressions establish important ordering, revocation and rollback properties, but do not retrofit production handlers.

## Integration gap and minimum contract
Before applying a transactional authorization fence to any real write handler:

1. Inventory sensitive write handlers with source paths, required roles, tenant/site scope, database clients, and independent side effects.
2. Select one explicitly authorized, existing, non-publishing, isolated mutation boundary. Do not presume an arbitrary handler is safe merely because it uses PostgreSQL.
3. Within the same transaction as the protected database write, fetch the persisted session by ID and lock it, checking revocation, absolute expiry, idle expiry, and minimum role at execution time. Recheck tenant membership/site grants where appropriate.
4. Define lock order for session, tenant, grant and target rows; document potential deadlocks and retry boundaries. External calls must not occur while database row locks are held without a separately reviewed outbox/compensation design.
5. Test denied mutations, operation-first and demotion/revocation-first races, rollback, expiry, session rotation and idempotency with disposable PostgreSQL and a representative HTTP handler.
6. Record exact SQL transaction scope and handler paths, independent review, and proof-branch full CI before any public route or deployment consideration.

## Nonclaims
This audit is read-only analysis recorded as documentation, not production enforcement. It does not assert general CVI workstream completion, approve a provider mutation, authorize CMS publication, or certify a launch. CVI-1C.50 final CI remains separately gated. All downstream production changes require explicit scope approval.

## Next bounded implementation
Use a dedicated design/review phase to choose one eligible representative handler, and produce a handler-to-transaction traceability matrix and migration-free implementation proposal. Keep runtime code unchanged until reviewed.

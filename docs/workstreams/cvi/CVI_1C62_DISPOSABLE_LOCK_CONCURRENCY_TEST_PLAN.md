# CVI-1C.62 — Disposable Proposal Lock-Order Concurrency Test Plan

## Dependency and limitations
Stacked on CVI-1C.61 draft PR #1116 at `89aafed90c9c2b3b6eb93a3d1ba6117483a317b6`. Parent latest CI https://github.com/intssere/SEO_ENGINE/actions/runs/38233945071 was pending at authoring. This document proposes **test-only**, synthetic disposable PostgreSQL work; it does not implement ACL mutation grants or modify production handlers.

## Verified source facts
- `editProposalDraft` and `decideProposalReview` in `artifacts/api-server/src/lib/operational-data.ts` each acquire `FOR UPDATE OF ap` for the scoped `action_plans` row inside `sql.begin`, before their subsequent read and mutation statements.
- Dormant migration `0016_cvi_acquisition_revocation_serialization_draft.sql` serializes acquisition using `FOR SHARE` in site → connection → session → membership → grant order, but has no proposal-plan lock.
- The `review_content` grant is not `edit_draft` permission; the existing ACL schema lacks the latter.

## Candidate disposable test matrix, pending review
| Case | Connections | Expected observation |
|---|---|---|
| Plan-first competing draft decisions | Two | One plan row lock holder; later contender validates lifecycle after waiting, no duplicate decision |
| Site-first acquisition vs site revoke | Two | Revocation-first denies; acquisition-first may commit historical untrusted receipt; never authorizes provider action |
| Simulated ACL-first then plan-first inversion | Two | A controlled synthetic lock cycle is detected by PostgreSQL and rolled back, proving why inconsistent order is unsafe |
| Consistent plan-plus-site synthetic order | Two | Operations serialize without cycle and with bounded lock timeout; no writes beyond test-only rows |
| Session/grant revoked before operation | Two | Rechecked persisted authorization denies without mutation |
| Operation acquires locks before revocation | Two | Authorized synthetic operation completes first; all later attempts deny |
| Expiration while waiting for lock | Two | Database time checked after waiting causes denial, not a stale earlier admission |

## Guardrails
Use the existing proof-branch-only PostgreSQL service and explicitly named disposable database; verify localhost identity and no inherited production `DATABASE_URL`. Prefer separate test schemas/transactions and deterministic barriers rather than sleeps. Use `lock_timeout`, `statement_timeout`, rollback and cleanup, and assert no surviving synthetic rows on denial. Do not run intentionally deadlocking tests against shared CI databases or production. Do not change runtime bootstrap or apply draft migrations outside explicitly disposable CI.

## Acceptance/review gates
Review complete transaction callgraphs for plan edits/decisions, auth session rotation/revocation, membership/site grant revocation, and dormant acquisition before selecting a universal lock order. Database and security owners must sign off on any intended implementation semantics; no such approval is recorded in this increment.

## Exit criteria
A follow-on isolated PR may implement test-only concurrency proofs once fixture isolation, plan schemas, deterministic barriers, timeout behavior, and teardown are verified. No production `edit_draft` implementation is authorized.

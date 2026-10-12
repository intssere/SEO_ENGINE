# CVI-1C.63 — Disposable Concurrency Coverage Delta

## Baseline
Stacked on CVI-1C.62 draft PR #1117, HEAD `75f93bd81f66c835441277781cd074aef41b674f`. Parent CI https://github.com/intssere/SEO_ENGINE/actions/runs/38234263773 was in progress at authoring. Source inspection only; no database or deployment access.

## Existing reproducible proofs (avoid duplicate implementation)
The existing `artifacts/api-server/src/lib/cvi-gsc-disposable-authenticated-session.ephemeral.test.ts` already contains:
- CVI-1C.33 two-connection session-revocation versus load/rotation tests around lines 638–687, with a PostgreSQL `pg_stat_activity` lock-wait observer (60 attempts, 30 ms intervals), and assertions that revoked sessions cannot resume.
- CVI-1C.39 post-lock-wait session rotation tests around lines 688–730, with the persisted `last_seen_at` compared to a database-time marker after contention.
- CVI-1C.56 temporary-table synthetic authorized write followed by revocation denial around lines 590–616. This is not a real tenant/site ACL gate.
The separate `cvi-gsc-private-composition.ephemeral.test.ts` already tests dormant acquisition site, membership and grant revocation with PostgreSQL concurrency. CVI-1C.58 tests `review_content` non-escalation to `read_evidence`.

## Distinct uncovered question
Neither suite proves *cross-handler action-plan row locking* against a dedicated site-scoped `edit_draft` ACL permission (which does not exist yet). A production-facing lock cycle test should not be constructed until the security/product owner approves an operation-specific edit grant and database owner approves a global lock order.

## Candidate safe next test, subject to fixture review
A **purely synthetic** two-connection disposable PostgreSQL test may create two temporary rows representing a plan and a grant, then check plan-first versus grant-first lock ordering, bounded `lock_timeout`, deterministic cleanup and absence of persistent rows. It must state clearly that synthetic locking neither certifies current handler behavior nor authorizes a new mutation grant. Deliberately provoking real deadlocks in the shared proof fixture is unnecessary; prefer isolated lock timeout probes.

## Exit gates
- Document exact disposable test fixture, independent connection lifecycle and cleanup on assertion failure.
- Do not reuse production `action_plans`, real tenant grants or non-disposable databases.
- Keep the global order, auth-disabled fail-closed decision, mutation grant design and handler integration marked **pending independent review**.
- No runtime code, production migrations, provider calls, publishing, merge or deployment in this increment.

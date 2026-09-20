# P9.7 — Deterministic Recommendation Generation Worker Closeout

## Scope

P9.7 implements deterministic/default-off recommendation-generation review over exact supplied/synthetic P6 opportunity lineage and canonical P9.6 worker control.

Implementation:
- issue #313
- PR #314

No live worker, AI/model/provider call, scheduler, retry loop, durable queue, recommendation/proposal persistence, approval grant, Task #51/#53/#54 execution, database operation, mutation, deployment or publication was added.

## Canonical base

P9.7 started from:
- base SHA: `48a3e44fae0a320ad527e00ee06f5ee9eb2643a7`
- base tree: `7e849723f7427009ecbd14a6d96dab7b32f94cb3`
- main CI #549: success

GitHub and Replit were exact-aligned and clean before branching.

## Certified implementation

- exact tested PR head: `9401c2b7e2598cde6e4a90ec50204c68c3e49ef2`
- exact tested tree: `52dd4492d042fea27d9fb6ce7fb5dc040fff568e`
- exact-head PR CI #550 / run `35500244101`: success
- implementation merge: `b7a64e860f7fbd7b15e9e87a5812e0cef442c104`
- implementation tree: `52dd4492d042fea27d9fb6ce7fb5dc040fff568e`
- post-merge main CI #551 / run `35500407071`: success

The first implementation head passed the complete CI matrix; no correction commit was required.

## Canonical lineage

P9.7 accepts an exact P6.7 lifecycle input/report pair and independently rebuilds P6.7, transitively rebuilding P6.6, P6.5, P6.4, P6.3, P6.2 and P6.1.

P7.6 AI/GEO opportunities are accepted only after entering this canonical P6 pipeline.

## Control and eligibility

Only P9.6 `running` permits review generation. Paused/draining/drained/killed control modes hold otherwise eligible work.

P6.5 `recommend` plus P6.7 `observed|active` may emit advisory review.

P6.5 `approval` plus P6.7 `observed|active` may emit proposal review only when at least one exact P6.6 preview contains a changed field.

Informational/blocked actionability, deferred lifecycle, terminal lifecycle, and approval without a changed preview do not generate.

## Deterministic generation and idempotency

P9.7 uses fixed bounded review templates keyed by P6 opportunity kind. It generates no site copy and makes no causal outcome claims.

Recommendation/idempotency identity binds exact opportunity, explanation, actionability, lifecycle, score, evidence, statement, missing-evidence, semantic-guard and preview lineage.

Identity intentionally ignores temporary pause/resume control state and P9.7 observation time, so unchanged lineage regenerates the same review identity.

P6.3 priority is lineage only; P9.7 ordering by opportunity fingerprint creates no new ranking or dispatch order.

## P8 handoff

The governance handoff is projection-only. It creates no ProposalRecord, proposal persistence, approval grant, execution authorization, public-write permission, automatic transition or Task #51 authorization.

## Safety

P9.7 keeps live worker/scheduler/retry, AI/model/provider calls, AI proposal runtime/gate, durable queue, recommendation/proposal persistence, database/Production DB reads/writes, Task #69/#70, approval grant, Task #51/#53/#54 execution, provider/public-site writes, automatic transition and publication closed.

Static contracts verify absence of AI runtime/provider/network/database/wall-clock/timer/worker-process primitives.

## Replit certification

Replit was Git-only fast-forwarded to:
- branch `main`
- HEAD `b7a64e860f7fbd7b15e9e87a5812e0cef442c104`
- tree `52dd4492d042fea27d9fb6ce7fb5dc040fff568e`
- origin/main exact
- ahead/behind `0/0`
- clean index/worktree
- zero tracked differences
- zero untracked files

Validation:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS

## Publication/runtime result

P9.7 is unpublished. Production remains the separately certified Task #73 release.

No live worker/AI/provider call, queue mutation, persistence, approval/execution, Production DB operation, provider/public-site mutation, deployment or publication occurred.

## Next boundary

**P9.8 — autonomous mutation policy engine is REVIEW ONLY by default.**

A safe generic continuation may define eligible already-certified action classes, risk ceilings, evidence/freshness requirements, approval/verification/rollback/manual-intervention rules, P9.6 kill-switch interaction, idempotency/replay constraints and activation prerequisites.

Generic continuation does not authorize autonomous-mutation implementation or activation, new provider write scopes/credentials, Task #51/#53/#54 execution, Production DB writes, provider/public-site mutation, deployment or publication.

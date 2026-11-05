# PILOT-01 RT01-A12.2 — Offline privilege and migration contract verification

**Baseline:** \`main\` at \`1e4227934b15e773615f181a18f26ca26f32f563\` (RT01-A12.1). **Owner scope:** source-only tests in a draft PR; no SQL execution, database connections, migration application, runtime/worker integration, deployment, provider operations, public-site writes, or merge.

## Added verification

\`lib/db/src/pilot-01-rt01a12-2-privilege-negative-static.test.ts\` reads the **unexecuted** SQL candidate from \`docs/sql-candidates/rt01-a12-1-pilot01-additive.sql\`. It imports Node's file, assertion, and test libraries only. It does not import a PostgreSQL driver or use credentials.

Test coverage:
- Canonical \`organizations/sites\` UUID organization/site pair via composite FK and index; session FK, issuer provenance marker and read-only operations.
- Grant lifecycle timestamp shapes and composite grant → job → admission → event/outbox scope links.
- Organization-scoped idempotency, positive-lease generation representation and default-blocked outbox state.
- Immutable admission/event triggers, \`ENABLE\` and \`FORCE ROW LEVEL SECURITY\` on all five candidate tables, explicit \`PUBLIC\` revocation for schema/tables/functions.
- Negative mutation cases that deliberately remove a required FK, weaken operation scope, enable permissive policy/grants, remove RLS/immutability, alter the legacy queue, insert seed data or weaken outbox/lease restrictions; each must cause the *static inspector* to flag a violation.

## Limitations and unresolved release blockers

**Text matching is not PostgreSQL validation.** The checks do not parse SQL, verify identifier resolution, test referential constraints, prove an RLS policy, check effective privileges or execute a transaction. Text comments are stripped, but adversarial SQL syntax not anticipated by the rules may evade the textual checks.

**The current SQL candidate is not deployable.** There are no operational privileges or RLS policies; PostgreSQL authorization and actor/membership/issuer custody are unproven. Atomic grant consumption, audit event pairing, idempotent receipt reconciliation, DB-clock lease claims, generation fencing, outbox delivery, cancellation, retention and role bypass attacks remain outside this phase.

**The proposal to add a unique index to \`public.sites\` is a shared-table change**, even though the proposed PILOT-01 tables are namespaced. Locking, schema drift and existing-index compatibility must be reviewed before any isolated DDL execution.

**Execution and release gates:** Future PostgreSQL 17 syntax, DDL, permissions, transaction, concurrency, and rollback tests require a new explicit authorization for a disposable, localhost-only synthetic database. Existing Railway/Production databases and live provider paths remain prohibited. Source-only CI and a merged PR never grant SQL or runtime execution authority.

## Review and merge controls

- Standard CI must pass for the exact HEAD.
- Tahseen must submit a formal APPROVED GitHub review.
- Owner must separately authorize merging that exact HEAD.
- Keep \`PUBLIC_SITE_WRITES_ENABLED=false\` and \`AI_PROPOSAL_GENERATION_ENABLED=false\`.

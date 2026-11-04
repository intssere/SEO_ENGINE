# RT01-A12.0 — Isolated canonical persistence implementation plan (SOURCE ONLY)

**Base:** main `3f34d0e04094158091397a7ae6038f235e38caaa` with RT01-A11.3 post-merge CI SUCCESS (run 41910761857).  
**Classification:** implementation preparation and risk mapping only. No executable DDL, migration files, database access, schema changes, operational worker/route integration, provider operations or deployment are authorized by this document.

## Source-verified implementation constraints

1. `lib/db/migrations/0001_core.sql` defines `organizations.id` and `sites.id` as UUID, and `sites.organization_id` references organizations. Its generic `jobs` table is already used by `pilot-orchestration.ts`. Preserve the existing tables and consumers.
2. `lib/db/migrations/0002_auth.sql` defines `auth_sessions` (text subject, UUID session, role and revocation). It does **not**, by itself, prove tenant membership or delegated issuer authority.
3. `lib/db/migrations/0007_p8_8_policy_mutation_dispatch.sql` is specific to Shopify policy mutation dispatch. Do not reuse or weaken its authorization.
4. `lib/db/src/runtime-bootstrap.ts` recognizes enumerated **public-table-count** schema states and has bootstrap pathways that may apply baseline migrations and upsert Diamond Shelf. Merely adding new `public` tables can change its classification; adding a dedicated `pilot01` schema may avoid its count but **does not prove that all startup/schema compatibility checks remain valid**. An implementation must include negative startup/boot tests and must NOT use `bootstrap:runtime` as the pilot schema migrator.
5. `lib/db/package.json` exposes `push` and `push-force` Drizzle commands and `bootstrap:runtime`; none is a documented RT01 pilot migration lane. Never use `drizzle-kit push`, `push-force`, automatic bootstrapping or ad hoc SQL against an existing environment for this milestone.
6. `lib/db/src/schema/index.ts` exports an empty barrel rather than the installed SQL migration lineage. A schema diff must be grounded in the versioned SQL source and separately certified installed ledger.
7. `pilot-01-pg-atomic-admission-disposable.ephemeral.test.ts` requires explicit disposable sentinels, a loopback URL and synthetic `pilot01_test_<32hex>` fixture schemas; identifiers are synthetic text, **not** canonical organization/site UUID identity. Reuse of this harness as an operational adapter would be unsafe.
8. `pilot-orchestration.ts` currently uses a generic queue and stale-run heuristic. Simply adding new durable tables does not replace or fence legacy queued jobs, nor authorizes running a provider.

## Proposed implementation slices and stop gates

| Slice | Intended deliverable | Required proof / STOP condition |
| --- | --- | --- |
| A12.1 | Exact, versioned additive **SQL candidate**, reviewed source-only; schema namespace and forward/rollback rationale | Canonical UUID site/organization integrity; no silent `public.jobs` changes; no migration run |
| A12.2 | Static migration and privilege contract tests (no DB connections) | Constraints/indexes/role policy/receipt-immutability intent inspected; static regex is **not** runtime proof |
| A12.3 | Disposable PostgreSQL 17 schema compatibility rehearsal (requires **new, separate authorization**) | Test-only loopback isolated DB, fresh schema, explicit env sentinels; no Railway/staging/Production access |
| A12.4 | Candidate isolated transactional adapter + synthetic negative tests (separate scope and review) | T01–T16 of RT01-A11.3; fails closed; no runtime import or providers |
| A12.5 | Database provenance and migration ledger certification (separate operator authorization) | Exact resource ID, applied checksums, schema owner and drift inspection before ANY shared/staging decision |
| A12.6 | Staging migration design and independent review | Explicit owner authorization for migration, no auto-rollout, read-only flags/off by default |

**Prerequisite:** owner explicitly approves the scope of each implementation/execution slice; Tahseen independent APPROVED and successful CI are still required for merging every resulting PR, followed by exact-HEAD owner merge authorization.

## Schema constraints required before A12.1 DDL candidate

- New grant, admission receipt, job, lease/event and outbox records are strictly tenant/site/actor/issuer/operation bound. Same-organization site integrity is enforced by a **database-level** relationship, not independent FKs or request fields.
- A grant is consumed **once** or revoked **once**, never both; success commits consume, job, admission receipt and immutable audit atomically.
- Read-only `analyze`/`recommend` grants cannot authorize site writes; site writes and AI generation stay disabled.
- Idempotency replay is scope-exact and returns the original durable receipt; mismatches deny without side effects. Lost COMMIT acknowledgements must reconcile rather than assume success.
- Worker owner/generation/lease is checked on all state mutations and outbox admission. Stale generation is fenced even after takeover.
- Receipt/event append-only privilege and retention controls, least-privileged roles, tenant RLS and worker bypass analysis require explicit tests.
- Cancellation after grant consumption is separate from grant revocation; outstanding read intents must not silently survive cancellation or expiry in an unauthorized state.
- No automatic fallback to legacy `pilot_ingestion_v1` queue on an unavailable pilot01 store.

## Fail-closed runtime compatibility checks before any cutover

1. Existing bootstrap recognizes the untouched public schema; additive pilot namespace must not trigger unexpected permissive classification or automatic baseline migration.
2. Existing site/organization row identity and auth session authority are independent of caller-controlled principal or issuer fields.
3. Current pilot route and worker do not import or instantiate the candidate adapter.
4. Disabled flags remain `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`, regardless of DB schema installation.
5. No external provider read or write is enabled by successful DDL, a queued job or a mock receipt.
6. Unknown migration state, privilege drift, receipt ambiguity or DB unavailability blocks admission and dispatch.

## Release evidence and rollback expectations

A future executable candidate must provide complete forward and *non-destructive* rollback/disable plans, checksum and schema ownership manifest, test logs against a specifically approved isolated DB, negative cross-tenant/forgery/lease-takeover tests, cleanup evidence and explicit operational stop conditions. Never claim that a source-only CI pass proves installed database correctness.

**Decision required before implementation:** authorize **RT01-A12.1 source-only additive migration candidate and static checks**, with no SQL execution, existing database connection, deployment, worker/route integration, public-site writes or merge. Any later disposable DB run requires its own authorization and isolation evidence.

# PILOT-01 RT01-A3b — Authorized disposable PostgreSQL grant adapter

## Authorization and baseline
Owner authorized isolated, newly provisioned **local disposable PostgreSQL** implementation and synthetic tests only. Canonical baseline: `b67291dbba368ede0c7231f391ad07a66adae7f9` (PR #1291). No merge, Production migration, runtime integration, provider access, deployment or public-site write is authorized.

## Implementation
- `pilot-01-pg-grant-disposable.ts` implements an **injected-client** `AtomicGrantReceiptStore` for grant consumption and a separately role-gated synthetic revocation operation. It has no database connection creation, credential retrieval, route/worker binding or network side-effect code.
- The adapter enforces exact grant, tenant, site, actor, issuer and operation matching against immutable fixture records, uses PostgreSQL `clock_timestamp()` for expiration, and conditionally updates `state='issued'`. Its same-transaction audit insert carries a unique grant ID, transaction ID and receipt. Audit exceptions roll back grant transitions, returning `unavailable`. Zero-row transitions return `denied`.
- Only `analyze` and `recommend` are supported. A `site_write` request is rejected.
- `pilot-01-pg-grant-disposable.ephemeral.test.ts` provisions an isolated randomized `pilot01_test_*` schema within the already-authorized disposable local database, runs two PostgreSQL sessions for consume/consume and consume/revoke races, tests scope and expiry, verifies rollback on audit constraint failure, and cleans up the schema in a `finally` block.
- The existing `pilot-01-disposable-fencing.yml` CI job is extended to run this test against its **fresh CI-only PostgreSQL 17 service**.

## Execution guard
The integration tests **skip** unless `PILOT01_DISPOSABLE_PG=I_ACKNOWLEDGE_DISPOSABLE_ONLY` and `PILOT01_DISPOSABLE_DATABASE_URL` are both present. When enabled, only localhost PostgreSQL URLs with `pilot01_disposable_*` database names and explicit synthetic test user are accepted; known live provider names are refused. The production application does not import the adapter.

## Evidence and limitations
The disposable CI run is the execution evidence, not the text of this document. The test uses independent connection pools; it does not kill an entire process mid-transaction or independently prove real user identity, issuer signature custody, tenant membership, migration safety, row-level security, durable outbox delivery or worker fencing. The `source: server_verified_session` field remains caller-supplied synthetic data; it is **not** authentication proof. DB-backed transaction behavior is only certified for the isolated test schema, not the actual UGP/CVI schema.

No migrations are created or applied to UGP/CVI. Do not wire this code into `pilot-orchestration.ts`, API routes, startup hooks, production infrastructure or any provider. Maintain `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

## Future gates
Require reconciliation of current UGP/CVI migration lineage, trusted actor/site/issuer authentication, schema/index/RLS review, bounded read-only source authorization, worker generation fencing/outbox, process-interruption tests, independent CI and formal reviewer approval, and owner exact-HEAD merge authorization. Runtime deployment requires separate approval even after merge.

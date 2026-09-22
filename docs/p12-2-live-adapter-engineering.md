# P12.2 — Live-adapter engineering

## Purpose

Issue #387 adds the final default-off engineering layer needed before a separately authorized P12.2 live proof can run.

The implementation binds only to:

- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- canonical origin: `https://diamondshelf.us`;
- robots user agent: `SEO_ENGINE_P12_2_CERTIFIER`.

It does **not** authorize a live crawl.

## Runtime adapters

The engineering layer adds production-capable, manually composable adapters for:

- sitemap acquisition;
- robots retrieval/evaluation;
- page transport;
- pacing clock;
- PostgreSQL crawl execution-state persistence.

The network adapters reuse the existing pinned secure transport model:

- fresh DNS resolution per request;
- all resolved addresses must be public;
- mixed public/private DNS answers fail closed;
- connection address is pinned;
- TLS hostname/SNI verification uses the original hostname;
- ambient proxy routing is not used;
- redirects are manual;
- every redirect target is revalidated against the exact first-party origin;
- credentials/cookies/authorization headers are not forwarded.

No adapter is bound to API startup, a scheduler, a job queue or an autonomous worker.

## Sitemap acquisition

Sitemap acquisition is exact-origin HTTPS only.

It preserves the existing P2 sitemap ceilings and hardened XML parser semantics:

- maximum documents: 1,024 absolute ceiling;
- maximum sitemap depth: 8;
- maximum single sitemap size: 50 MB;
- URL length bounded by the selected P2 execution policy;
- query strings and fragments rejected;
- recursive sitemap-index references bounded and deduplicated;
- raw sitemap XML is transient and never part of a persistence record.

The adapter preserves the originally requested sitemap identity even when an allowed same-origin redirect is followed so P2 inventory lineage remains stable.

## Robots

Robots retrieval is limited to the exact Diamond Shelf first-party target.

Policy evaluation:

- caches only in memory inside one evaluator instance;
- fails closed on unavailable, oversized or malformed policy state;
- supports exact-agent and wildcard groups;
- uses longest matching allow/disallow rule;
- allow wins an equal-specificity tie;
- supports `*` and terminal `$`;
- ignores non-policy extension directives safely.

No robots body is persisted.

## Page transport

Page transport is HTTPS GET only, exact-origin only and manual-redirect only.

A selected transient page-response byte limit is required and may not exceed the hard engineering ceiling of 1,048,576 bytes.

Transient inspection may determine `noindex` from:

- `X-Robots-Tag`;
- bounded HTML meta robots markup.

Response bodies are never persisted.

## Durable execution-state schema

Migration source:

`lib/db/migrations/0004_first_party_crawl_execution_state.sql`

The migration is additive and transactional and defines exactly three tables:

- `first_party_crawl_checkpoints`;
- `first_party_crawl_completed_runs`;
- `first_party_crawl_incremental_receipts`.

Properties:

- site foreign keys use `ON DELETE CASCADE`;
- no generated/default UUID or timestamp lineage;
- checkpoint revision/fingerprint and plan lineage are explicit;
- completed snapshots are idempotent by exact run/snapshot identity;
- incremental receipts are idempotent by exact run/plan identity;
- fingerprint values are lowercase SHA-256 hex;
- JSON payloads must be objects;
- no raw response body, sitemap XML, HTML or page-content columns exist.

The runtime bootstrap does not auto-apply migration 0004. It recognizes both the existing 34-table P3.6 state and the future 37-table P12.2 state.

## Persistence adapter

The PostgreSQL adapter is lazy: constructing it performs no database connection.

Before a database operation it fails closed unless:

- exactly 37 public base tables are present;
- the three P12.2 tables match the expected column contract;
- the exact Diamond Shelf site identity is present.

Checkpoint writes are serialized with advisory locks and row locking:

- exact replay is idempotent;
- only a strictly higher revision may replace the stored checkpoint;
- equal/lower conflicting replay fails closed.

Completed runs and incremental receipts also use advisory locking and exact replay semantics.

Loaded JSON is revalidated through the existing P2/P12.2 integrity functions.

A recursive payload guard rejects raw/content-bearing fields and cross-origin/query/fragment/credential-bearing URLs.

## Manual composition

The manual composition layer is not startup-bound.

Exact confirmation:

`AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768`

All four independent gates must be true before an executable composition can be created:

- `networkReady`;
- `liveExecutionAuthorized`;
- `persistenceReady`;
- `persistenceAuthorized`.

The selected crawl, sitemap, execution, incremental and transient-response limits must all be explicit and within the existing P2 ceilings.

The bundled CLI is inspection-only by default. Direct `--execute` use is intentionally blocked; actual execution requires a separately composed caller after future live authorization.

## Database-test isolation

P12.2 migration and persistence integration tests may read **only**:

`P12_2_EPHEMERAL_DATABASE_URL`

They must never fall back to generic `DATABASE_URL`.

CI supplies that variable only for the local PostgreSQL service after P3.6 has established the exact 34-table baseline. The P12.2 step then verifies 37 tables.

## Development-schema incident

During the first local Replit validation attempt, an early migration test incorrectly used generic `DATABASE_URL` and applied the then-local migration 0004 once to the Replit **Development** database.

Observed immediately afterward:

- Development moved from 34 to 37 tables;
- all three new P12.2 tables were empty;
- Production remained untouched at 34 tables;
- no crawl/evidence rows were written;
- no compensating DDL was attempted.

This was outside the authorized engineering boundary. The durable isolation rule above was added as a direct corrective control.

This engineering task does **not** authorize a Development rollback or any Production schema change. Any schema reconciliation requires a separate explicit authorization after the final merged migration contract is certified.

## Still blocked after engineering merge

P12.2 live proof remains incomplete until separately authorized steps perform:

1. schema reconciliation/authorization for the certified 0004 migration;
2. deployment of the adapter code;
3. explicit runtime gate binding;
4. bounded first full crawl;
5. intentional interruption/resume proof;
6. second full reconciliation crawl;
7. P2.5 comparison;
8. P2.6 incremental plan and bounded incremental execution;
9. durable evidence inspection;
10. verification of zero unexpected provider/public-site/scheduler/worker activity.

Generic continuation authorizes none of those live actions.


## Engineering certification

Certified lineage:

- issue: #387;
- PR: #388;
- exact tested head: `f7210f7c7d7b7ff3e079403ec107acefbf4f9cc0`;
- tree: `317675fd81f3a83a0336be56c4e4c1f816ff82d9`;
- exact-head PR CI #686 / run `35713158875`: success;
- merge: `cfdb21f3853f6a6c604686d750016c08c7f43492`;
- post-merge main CI #687 / run `35713968607`: success;
- Replit Git-only sync: exact merge/tree, origin/main exact, `0/0`, clean.

The certified GitHub CI covered legacy/core/auth/P3.6 schema checks, the dedicated P12.2 ephemeral migration/persistence step, all workspace packages, P11.10 synthetic scale, Playwright Chromium critical paths, typecheck and build.

Migration-test isolation is now permanent: P12.2 migration/persistence tests use only `P12_2_EPHEMERAL_DATABASE_URL`, require the local CI database identity and exact 34-table pre-migration baseline, and never fall back to generic `DATABASE_URL`.

## Current schema/runtime boundary

- Production remains at the certified 34-table P3.6 schema.
- Migration 0004 is **not applied to Production**.
- Development is at 37 tables because of the disclosed early local test-isolation incident; the three P12.2 tables were empty when detected.
- No compensating Development DDL was attempted.
- The merged runtime can recognize either 34-table current Production or 37-table future P12.2 schema, but does not auto-apply 0004.
- No deployment/publication of this adapter merge occurred.
- All live network, execution, persistence, scheduler, worker, provider-write and public-site-write gates remain closed.

P12.2 remains incomplete until separately authorized Production schema application, deployment/runtime activation and real full/resume/repeat/incremental/persisted-evidence proof.

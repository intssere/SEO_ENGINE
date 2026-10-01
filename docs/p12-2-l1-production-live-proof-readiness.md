# P12.2-L1 — Railway Production live-crawl proof readiness review

## Verdict

**ENGINEERING PRESENT IN THE RUNNING IMAGE / LIVE PROOF NOT READY / NEXT STEP IS A SEPARATELY AUTHORIZED READ-ONLY PRODUCTION BINDING OBSERVATION.**

This review performs no Production DB access, DDL/DML, website request, crawl, persistence, deployment, configuration mutation or runtime activation.

## Canonical lineage

Current GitHub main:

`d6153bc0f5b81c91ea37c9cb8b69e53da9c6e52b`

Current Railway Production image:

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

The image was built from:

- source commit `9ba3640d8f50843da8609608124918fa356d552c`;
- source tree `75b750b59f2de907a121c61907c2f1cfe7364c1f`.

Current active Railway deployment:

`18486079-d88f-4376-bc5c-abc14e190b7c` — `SUCCESS`.

## Running-image P12.2 compatibility

The exact P12.2 engineering artifacts in the running-image source tree and current main are byte-identical by Git blob identity:

| Artifact | Blob |
|---|---|
| migration 0004 | `c46e007f087d0edbb6e4f5c8cda1490e9f0be548` |
| runtime bridge | `556a1a39b147714c09a801d70b78e0e9ccc73f66` |
| manual composition gate | `2b6e038df178d7ee10c2309f124d690dd780b4f6` |
| PostgreSQL persistence adapter | `c50fe3f59426cccbcc8b5c91e8b05d11ef7dacbc` |
| inspection-only CLI | `c949759b2de9ad4efcebccd3f625f36c46ad99d6` |
| live-adapter engineering doc | `a9ce954838c519d7c8cc4887b47c50f31a8d2a4b` |
| crawl bridge doc | `a8abfca3041b959245015b74ba9f9ec10b9d27a6` |

Therefore a new Production image is **not required merely to obtain the already-certified P12.2 bridge/adapters**.

This does **not** mean live execution is ready.

## Frozen first-party scope

P12.2 remains limited to:

- site ID `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- canonical origin `https://diamondshelf.us`;
- HTTPS GET only;
- same-origin only;
- query/fragment-free crawl URLs;
- robots user agent `SEO_ENGINE_P12_2_CERTIFIER`;
- no raw HTML/body persistence;
- no raw sitemap XML persistence.

Exact manual confirmation remains:

`AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768`

That confirmation alone grants no authority.

## Current blockers

### 1. Railway Production database/schema identity is unverified

The current Railway application references Postgres service:

`b69e0633-7ab9-40ab-85f3-c9edd6acb031`

No Production SQL/SELECT was authorized in L1.

Therefore this review does **not** claim:

- current public-table count;
- current migration level;
- presence/absence of the three P12.2 tables;
- exact column/index/constraint state;
- whether site ID `eb1da9ee-539c-4200-8f04-f64ccaea7768` exists in that database;
- whether the site row binds to `https://diamondshelf.us`;
- whether migration 0004 is eligible to apply.

Historical Replit/Neon 34-table evidence cannot be substituted for current Railway Postgres evidence.

### 2. Migration 0004 is not authorized

Certified migration source:

`lib/db/migrations/0004_first_party_crawl_execution_state.sql`

Git blob:

`c46e007f087d0edbb6e4f5c8cda1490e9f0be548`

It creates exactly:

- `first_party_crawl_checkpoints`;
- `first_party_crawl_completed_runs`;
- `first_party_crawl_incremental_receipts`;
- index `idx_first_party_crawl_completed_latest`.

No Production DDL is authorized by L1.

### 3. No certified one-shot operator execution caller exists

The bundled `first-party-crawl-cli.ts` is intentionally inspection-only and direct execution is blocked.

The current library has production-capable adapters and manual composition gates, but a future live proof still requires a separately certified, bounded, non-autonomous operator caller that:

- accepts only the exact Diamond Shelf binding;
- requires all four manual gates;
- requires the exact confirmation string;
- accepts explicit bounded limits;
- performs no scheduler/startup binding;
- emits deterministic receipts;
- provides an intentional interruption point for resume proof;
- cannot silently retry an entire live proof;
- cannot mutate provider/public-site state.

This caller must be engineered and certified repository-side before live crawl execution.

## Required live-proof phases

After prerequisites are separately certified and authorized, P12.2 must prove:

1. exact Production schema/site binding;
2. eligible/application of migration 0004, if required;
3. exact operator-caller/release identity;
4. first bounded full-site crawl;
5. intentional interruption and durable checkpoint;
6. resume from that exact checkpoint;
7. terminal P2.4 whole-site accounting/certification;
8. second full reconciliation crawl;
9. exact P2.5 before/after comparison;
10. exact P2.6 incremental plan;
11. one bounded incremental execution;
12. durable completed-run/incremental receipts;
13. no raw page/sitemap body persistence;
14. no unexpected provider/public-site writes;
15. no scheduler/worker/autonomous activation.

## Next safe boundary: P12.2-L1A

The next operation is **read-only Production binding observation**, not migration and not crawl execution.

It must be separately authorized and limited to obtaining:

- exact Railway Postgres service/database identity;
- schema/table inventory needed to determine 0004 pre-state;
- exact structural contract for the three P12.2 tables if already present;
- exact existence and canonical-origin binding of site ID `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- zero application/business-data reads beyond that exact site binding;
- zero writes/DDL.

If the database state differs from the certified migration preconditions, stop fail-closed. Do not repair, migrate, seed or modify anything.

## Parallel-safe repository boundary: P12.2-L2

Independently of L1A, repository-only engineering may define and implement the one-shot operator caller described above. L2 must remain network-unexecuted and persistence-unexecuted in CI.

A future live proof requires **both**:
- successful L1A/L1B database readiness;
- successful L2 operator-caller certification.

## Hard exclusions

L1 authorizes none of:

- Production SQL/SELECT;
- Production migration/DDL/DML;
- Diamond Shelf sitemap/robots/page requests;
- crawl execution;
- persistence writes;
- provider/OAuth calls;
- scheduler/worker activation;
- public-site/provider mutation;
- credentials/config changes;
- new Production image transition;
- deployment/publication.

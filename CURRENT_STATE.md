# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree and CI before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the durable long-term completion plan, and GitHub `main` remains canonical.

## Published production

The currently published and production-certified application release remains **Task #73 — GSC First-Live-Read Pilot Readiness v1**.

Published application source:
- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

P3.6 did **not** publish or redeploy the application. Git-only Replit synchronization remains distinct from application publication.

## Current engineering / production-schema state — P3.6 complete

Roadmap **P3.6 — Production Observation/Evidence Schema Migration (DDL Only)** is complete.

Authoritative lineage:
- issue #188 — P3.6 Production Observation/Evidence Schema Migration (DDL Only)
- prerequisite #189 — P3.6A Freeze Physical Observation/Evidence PostgreSQL Schema Contract
- production identity/recovery prerequisite #193 — P3.6B Prove Production PostgreSQL Identity + Recovery Gate (Read-Only)
- implementation PR #192
- exact tested implementation head: `0724318749f4061e5d828e9e0eb7ded398b1cb4e`
- tested/merge tree: `2733b8d3ab781834a10dcfbd2b833e786d3f2e1b`
- exact-head CI #328 / run `35127827007`: success
- implementation merge: `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc`
- post-merge main CI #329 / run `35128064998`: success

Canonical migration:
- `lib/db/migrations/0003_observation_evidence_schema.sql`
- migration blob: `ea13df6e9e0e0307e349f1502a4548b9e4de11ed`

Detailed closeout:
- `.agents/memory/p3-6-production-observation-evidence-schema-closeout.md`

This docs-only closeout branch/PR may advance canonical GitHub `main` beyond the implementation merge above. After docs merge, independently resolve the exact final `main`, require CI green, and Git-only reconcile Replit to that exact checkpoint without publication.

## Production database certification

The exact Production PostgreSQL target was proven before DDL:
- database: `neondb`
- Neon project: `late-sunset-42762033`
- Neon branch: `br-super-frost-b341k9ms`
- Neon timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`

Recovery proof:
- Replit Production Database Point-in-time recovery: enabled
- retention shown: last 7 days

Pre-migration state:
- public base tables: 31
- all three P3.6 target tables absent
- representative core/auth schema present
- concurrent DDL: none

The exact canonical migration was executed once with `ON_ERROR_STOP=1` against a separately verified writable compute on the same Production project/branch/database/timeline.

Post-migration independent certification: **PASS, zero mismatches**.

Certified Production schema state:
- public base tables: 34
- `seo_observation`: exists, 0 rows
- `seo_evidence`: exists, 0 rows
- `seo_observation_evidence`: exists, 0 rows
- all 32 columns match canonical migration in name/order/type/nullability/default
- all 21 migration-defined CHECK constraints match
- all 3 PKs match
- both FKs match with `ON DELETE RESTRICT`
- all 15 indexes including PK indexes match in name and column order
- no migration DML, backfill, seed, archive, prune, delete, restore, application-runtime activation, or publication occurred

## P3.6 contract now present in Production

The Production schema contains exactly the first three frozen observation/evidence persistence tables:
1. `seo_observation`
2. `seo_evidence`
3. `seo_observation_evidence`

The schema preserves deterministic identity, caller-controlled time, normalized evidence identity, restrictive association FKs, and the frozen P3.2/P3.3/P3.4 lookup/index intent.

Explicitly not added by P3.6:
- durable relation edges such as `supersedes`, `conflicts_with`, `corroborates`
- retention-disposition/decision storage
- P3.5 quality/conflict advisory storage
- support-tier/conflict-resolution/preferred-value fields or tables
- seed/backfill rows
- runtime database bindings

## Completed engineering foundations

Completed foundations now include:
- P1.1 / P1.2 — GSC profile isolation foundations
- P2.1–P2.8 — bounded crawl and technical evidence foundations
- P3.1 — normalized observation/evidence persistence design
- P3.2 — deterministic persistence planning and index intent
- P3.3 — retention/history/supersession model
- P3.4 — retention/history read models
- P3.5 — evidence quality/conflict handling
- P3.6A — frozen physical PostgreSQL schema contract
- P3.6 — certified Production DDL for the three observation/evidence tables

P3.6 changes the Production schema only. It does not make application persistence, application reads, provider calls, scheduled crawling, autonomous mutation, or public/provider writes live.

## Replit engineering workspace

Before Production DDL, Replit engineering `main` was Git-only reconciled to canonical implementation `main`:
- HEAD: `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc`
- tree: `2733b8d3ab781834a10dcfbd2b833e786d3f2e1b`
- ahead/behind: `0/0`
- clean working tree: true

After this docs closeout merges, Replit must again be Git-only fast-forwarded to the new canonical docs checkpoint and verified clean. Do not publish/redeploy as part of that sync.

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2/P3 engineering foundations do not activate a new runtime.

Published production/pilot behavior remains approximately:
- 30-page bound
- depth 2
- GET-only
- sequential breadth-first crawl
- robots-aware
- no retries
- 10-second request timeout
- maximum HTML response around 750,000 bytes
- same-site normalization
- query stripping
- existing runtime redirect handling

The 30-page behavior remains baseline mode. It is not the intended whole-site production ceiling.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. First-party P2/P3 foundations do not grant or widen competitor permissions.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity remains:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`

No real GSC OAuth binding, provider read execution, Task #70 live execution or GSC evidence persistence is authorized by P3.6.

## Current safety boundary

P3.6 Production DDL is complete; the schema now exists. That does **not** open runtime database or autonomous-execution gates.

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- first-party `full_site` live network execution=false
- first-party sitemap network fetching=false
- first-party full-site persistence=false
- first-party batch executor=false
- first-party retry loop=false
- competitor execution/collection/evidence persistence=false
- provider/public writes=false
- observation/evidence production persistence runtime=false
- observation/evidence production read runtime=false
- production application DB client/read/write binding=false
- production application DB reads=false
- production application DML=false
- production archive execution=false
- production prune execution=false
- destructive delete execution=false
- filesystem writer=false
- scheduler/autonomous-worker execution=false
- autonomous mutation=false
- publication authorization=false

Do not treat the existence of Production tables as authorization to use them from application/runtime code.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Certified foundations now include P1.1/P1.2, P2.1–P2.8 and P3.1–P3.6. P1 live-provider activation and later runtime/application persistence-read/write milestones remain separately gated.

`MASTER_COMPLETION_ROADMAP.md` is the durable long-term plan. Historical task/release evidence elsewhere must not be rewritten.

## Next boundary

The next roadmap work must be resolved from `MASTER_COMPLETION_ROADMAP.md` and issue #139 after independently verifying current `main`, CI, Replit state and all relevant gates.

A generic `continue` does not authorize:
- application production DB reads or writes
- backfill or other DML
- provider calls
- scheduler/worker activation
- publication/deployment
- autonomous mutation

Those remain separate authorization boundaries even though P3.6 DDL is complete.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI
2. read `AGENTS.md`
3. read this `CURRENT_STATE.md`
4. read `MASTER_COMPLETION_ROADMAP.md`
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`
6. read `.agents/skills/seo-engine-project/SKILL.md`
7. read `.agents/memory/MEMORY.md` plus the latest task closeouts, especially the P3.6 closeout
8. read program issue #139 and the active task issue/PR
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before any sync/publish decision

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.

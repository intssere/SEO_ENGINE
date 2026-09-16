# P3.6A — Physical Observation/Evidence PostgreSQL Schema Contract Closeout

## Scope

P3.6A resolved the specification gap discovered during P3.6 issue #188 preflight. It froze a deterministic, storage-neutral physical PostgreSQL contract for the first three observation/evidence tables without authoring or executing SQL DDL/DML and without activating any production runtime capability.

Issue: #189  
Implementation PR: #190

## Why P3.6A was required

P3.6 preflight independently established that two assumptions in issue #188 were stale/incorrect on canonical `main`:

1. the repository did not contain `P3_2_OBSERVATION_TABLE`, `P3_2_EVIDENCE_TABLE`, or `P3_2_OBSERVATION_EVIDENCE_TABLE` physical-table constants; P3.2 was explicitly certified as storage-neutral;
2. the canonical migration directory `lib/db/migrations/` contained only `0001_core.sql` and `0002_auth.sql`, not a sequence through migration `028`.

Issue #188 itself required implementation to stop rather than invent production schema semantics when a contradiction or missing schema decision was found. P3.6A therefore froze the missing contract before any DDL work resumed.

## Certified lineage

- baseline main: `c714228e57e80db7759250b7b226c6f2d551b998`
- baseline tree: `5693dde2bf92ddcd8db9cbfd22bbc5f32ca1ded6`
- exact tested implementation head: `6b508f2462c1de9b87d4a47d5dce228121b7b793`
- exact tested implementation tree: `b41df01cdc25e86c963b71f4de6ade734ad8f54d`
- PR CI #322 / run `35119868827` / job `104874613328`: success
- implementation merge: `facced80a4374e209c67924b79096dd0f971a830`
- implementation tree: `b41df01cdc25e86c963b71f4de6ade734ad8f54d`
- post-merge main CI #323 / run `35120046467` / job `104875215476`: success

Both CI runs passed legacy PostgreSQL schema validation, task/bootstrap checks, all current workspace tests, typecheck, and build.

## Contract delivered

Production module:

- `artifacts/api-server/src/lib/observation-evidence-postgres-schema-contract.ts`

Focused tests:

- `artifacts/api-server/src/lib/observation-evidence-postgres-schema-contract.test.ts`
- `artifacts/api-server/src/lib/observation-evidence-postgres-schema-contract.hardening.test.ts`

The module freezes exactly these table identities:

1. `seo_observation`
2. `seo_evidence`
3. `seo_observation_evidence`

It declaratively freezes:

- exact column names;
- PostgreSQL type intent;
- nullability;
- primary-key intent;
- restrictive foreign-key intent;
- deterministic fingerprint constraints;
- bounded enum/check intent;
- site-vs-URL nullability semantics;
- caller-controlled observation/freshness timestamps with no database wall-clock default;
- deterministic observation/evidence association identity;
- every certified P3.2 index intent mapped to physical observation columns in exact field order;
- bounded evidence and association lookup indexes;
- a deterministic whole-contract fingerprint and integrity assertion.

## Evidence normalization decision

`seo_evidence` uses `reference_fingerprint` as the frozen primary identity for the normalized P3.1 `ObservationEvidenceReference` shape. This preserves the already-certified deduplication semantics without inventing an unsupported uniqueness rule on `evidenceId`.

`seo_observation_evidence` uses the composite identity `(observation_id, reference_fingerprint)` with restrictive foreign keys to the observation and normalized evidence-reference rows.

## P3.3/P3.4 compatibility boundary

P3.6A maps intrinsic history/read dimensions that already exist on P3.1 observations, including site, origin, semantic key, provenance, source kind, observation kind, observed time, and observation ID.

P3.3/P3.4 relation and retention-decision persistence remains explicitly deferred where the three-table P3.1/P3.2 scope cannot represent it, including durable relation fingerprints/from/to edges and retention disposition. P3.6A did not invent a fourth relation table inside #188.

This means #188 may implement only the frozen three-table observation/evidence DDL. Durable P3.3 relation/decision storage requires a separately reviewed later schema boundary.

## P3.5 boundary

No P3.5 advisory quality/conflict outputs are included in the persistence contract. Support tiers, freshness-state advisory results, conflict-group resolution, preferred-value decisions, and related assessment/group fingerprints remain advisory-only.

## Migration convention correction

At the certified P3.6A baseline, the canonical migration directory contains:

- `0001_core.sql`
- `0002_auth.sql`

Therefore the next sequential migration is `0003_*`, subject to mandatory re-verification immediately before P3.6 DDL authoring/execution. The stale `028`/`029` premise from the original #188 text must not be used.

## Replit reconciliation

After post-merge CI #323, the Replit engineering workspace was reconciled Git-only and read-only verified at:

- branch: `main`
- HEAD: `facced80a4374e209c67924b79096dd0f971a830`
- tree: `b41df01cdc25e86c963b71f4de6ade734ad8f54d`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked changes: `0`
- untracked files: `0`
- working tree clean: true

Published production remains unchanged:

- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- source tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- status: success
- URL: `https://dsseoengine.replit.app`

No publication/redeployment occurred.

## Hardening proof

P3.6A source/tests certify no:

- SQL DDL or DML execution;
- production database/ORM client;
- environment-secret binding;
- network/provider/crawl primitive;
- filesystem-write primitive;
- scheduler/timer or worker/process primitive;
- ambient wall-clock identity/default;
- random/UUID identity generation;
- P3.5 advisory-output persistence.

All production persistence/read/runtime/publication authorization gates remain false.

## Next safe milestone

Resume **P3.6 — Production Observation/Evidence Schema Migration (DDL Only)** under issue #188 only after correcting its stale physical-contract and migration-number assumptions.

P3.6 should translate the now-certified P3.6A three-table contract into the canonical next migration (`0003_*` if the migration directory is unchanged), certify exact SQL in CI, merge it, reconcile Replit Git-only, and then perform the separately authorized one-time production DDL only after exact production database identity/migration-state/rollback preflight.

P3.6 still does not authorize DML/backfill, runtime database reads/writes, relation/disposition persistence, providers/crawlers, workers/schedulers, public/provider mutation, or publication/redeployment.

# P3.5 — Evidence Quality / Conflict Handling Closeout

## Scope

P3.5 adds a pure, deterministic, bounded, storage-neutral, default-off evidence-quality and conflict-handling contract over validated P3.1–P3.4 observation/history artifacts. It does **not** activate a production database, durable persistence/reads, migrations, provider/crawl activity, scheduler/worker execution, public/provider writes, or publication.

Authoritative task:
- issue #185 — `P3.5 — Evidence Quality / Conflict Handling`
- implementation PR #186 — `P3.5 — evidence quality / conflict handling`

## Certified implementation lineage

- baseline canonical main: `6b9b0d4e272c0f8433d5ddaf546cf6f43d6528af`
- baseline tree: `ae0d57352e3dc66881609e4b72092b0cd0336176`
- exact fully tested implementation head: `db9f9edc90bc418869c77cd607482089d264d449`
- tested tree: `1a9e1ffefa3a8f960fed7742f0723f2ca7590479`
- PR CI #318 / Actions run `35110103110`, job `104841275146`: success
- implementation merge: `73e5c1fab4d76d931f5308c7e197f09a36deb5ef`
- implementation tree: `1a9e1ffefa3a8f960fed7742f0723f2ca7590479`
- post-merge main CI #319 / Actions run `35110324556`, job `104842044784`: success

Both certification runs passed legacy PostgreSQL schema validation, the focused P3.5 suite, all current workspace tests, typecheck and build.

## Recovered full-workspace failure and correction

The quarantined PR head `7f43aa23598fbfc845e802a882d36e260dbec464` failed full-workspace testing in `P3.5 model integrity detects result tampering` with Node assertion `Missing expected exception` at `observation-evidence-quality-model.test.ts:273`.

The production integrity checker was not the defect. The test created a model with one candidate and no competing observation, so the valid model already had `conflictGroups: []`. Replacing `conflictGroups` with another empty array did not alter the model and therefore could not trigger the expected integrity exception.

The certified correction was deliberately limited to the test fixture:
- old forged field: `conflictGroups: []`
- corrected forged field: `assessments: []`

The candidate produces a non-empty assessment, so this is real deterministic result tampering and the existing integrity checker correctly rejects it. No production implementation rewrite or global-policy weakening was used to clear CI.

Earlier failed/quarantined P3.5 heads remain historical failures and were not merged:
- `75b8a42a49900a1739df16cefa44a6371d0c7acc`
- `092a6575a28d489359cae01cbb78f0369b1710cb`
- `d2fe77863270d32e2d3c6246d5cb61754d127cd6`
- `89b6d0d8095377f419fb219e9cec240af223ea1c`
- `7f43aa23598fbfc845e802a882d36e260dbec464`

## Canonical implementation shape

Production/compatibility modules:
- `artifacts/api-server/src/lib/observation-evidence-quality-model.ts`
- `artifacts/api-server/src/lib/observation-evidence-quality-conflict-model.ts`

Focused/hardening tests:
- `artifacts/api-server/src/lib/observation-evidence-quality-model.test.ts`
- `artifacts/api-server/src/lib/observation-evidence-quality-model.hardening.test.ts`

The compatibility façade exports the canonical model rather than duplicating implementation.

P3.5 defines and tests:
- explicit evidence availability rather than invented missing facts;
- freshness derived only from caller-supplied validated reference time;
- `fresh` and `stale` freshness state;
- support tiers `insufficient`, `limited`, `supported`, `strong`, and `corroborated`;
- independent-provenance corroboration accounting;
- complete vs `partial_page` conflict coverage;
- advisory-only resolution states `retain_unresolved`, `prefer_supported`, `require_review`, and `insufficient_evidence`;
- conservative `prefer_supported` behavior requiring uniquely stronger independent support;
- unresolved/partial/insufficient conflicts failing closed rather than silently applying last-write-wins;
- deterministic assessment, provenance, value-support, conflict-group and result fingerprints;
- preservation of source observation provenance without mutation;
- exact P3.4 read-model integrity reconstruction through `assertRetentionHistoryReadModelIntegrity`;
- bounded filters/projections and page sizes;
- storage-neutral index/query intent;
- exact result-integrity rebuilding and tamper rejection;
- source hardening against network transport, DB/ORM access, SQL read/DDL/DML, filesystem writes, secret/environment binding, scheduler/worker/process primitives and ambient wall-clock reads.

## Replit reconciliation

After post-merge main CI #319, Replit was reconciled Git-only and independently read-only verified at:

- branch: `main`
- HEAD: `73e5c1fab4d76d931f5308c7e197f09a36deb5ef`
- tree: `1a9e1ffefa3a8f960fed7742f0723f2ca7590479`
- cached origin/main: exact same SHA
- ahead/behind: `0/0`
- working tree clean: true

The separately published production application remained unchanged at Task #73:

- published source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- published source tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- deployment status: success
- URL: `https://dsseoengine.replit.app`

No publish/redeploy or runtime/config/environment mutation occurred during P3.5 engineering or Git reconciliation.

## Honesty boundary

P3.5 models evidence support quality and conflict state; it does **not** establish objective truth, persist a conflict resolution, mutate a source observation, or authorize a live database/API service.

- `prefer_supported` is advisory only.
- Declarative index/query intent is not a database migration.
- In-memory reconstruction is deterministic modeling/test behavior, not production persistence or durable querying.
- Partial-page conflict coverage fails closed instead of inferring unseen participant quality.
- Freshness is valid only against the supplied validated reference time; there is no ambient clock dependency.

Production database binding, production reads/writes, durable persistence and schema/migration work remain closed.

## Safety result

P3.5 hardening confirms all relevant production/runtime authorization fields remain false, including:

- production quality/runtime execution;
- production read-model runtime;
- production database reads;
- observation/evidence production persistence;
- real database client binding;
- archive execution;
- prune execution;
- destructive delete execution;
- DDL and DML;
- network/provider execution;
- scheduler and worker execution;
- public-site writes;
- publication authorization.

The wider project safety boundary also remains closed for live full-site crawl/sitemap fetching, competitor execution/persistence, provider writes, autonomous mutation and filesystem writing unless separately and explicitly authorized.

## Next boundary — hard stop

Roadmap **P3.6 — Production migration/DDL** is next, but it is **not authorized by P3.5 completion or by a generic `continue`**.

P3.6 requires separate explicit production migration/DDL authorization that identifies:
- the target production environment;
- the migration/schema scope;
- the rollback/safety plan.

DDL authorization does not automatically authorize production DB runtime reads, production DB runtime writes, backfill/DML, provider calls, scheduler/worker activation, publication, or autonomous mutation. Those remain separate gates.

# P10.7 — Impact workspace v2 closeout

## Status

P10.7 is complete as a deterministic synthetic/read-only frontend milestone and closes the planned P10 measurement/experiments/learning engineering sequence.

It does not activate live Impact/outcome loading, Production database access, provider access, recommendation/model/ranking/policy mutation, autonomous execution, deployment or publication.

## Canonical implementation record

- Issue: #337 — `P10.7 — Impact workspace v2`
- Implementation PR: #338 — `P10.7 — Impact workspace v2`
- Base SHA/tree: `6a28f58962d3c710cdc050ff4af3d37b01599a9d` / `9a6c24b10794a84a8516fe42344f3bfd39f82922`
- Exact tested PR head/tree: `5e81960b3c471de18f69d5770c3dcfeeab21b70a` / `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`
- Exact-head CI: #583 / run `35521313230` — success
- Implementation merge/tree: `72cf75fb9248c750b485d212a8a0f9245d785809` / `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`
- Post-merge main CI: #584 / run `35521463457` — success

## What P10.7 changed

The legacy `/impact` page previously used the live deployments API and rendered a deployment-measurement table.

P10.7 replaces that page with a synthetic/read-only workspace following the repository's established frontend projection pattern.

Changed/added:
- `artifacts/seo-engine/src/lib/impact-workspace-model.ts`
- `artifacts/seo-engine/src/lib/impact-workspace-model.test.ts`
- `artifacts/seo-engine/src/pages/impact.tsx`
- `artifacts/seo-engine/src/pages/impact.css`
- `artifacts/seo-engine/src/impact-workspace-contract.test.mjs`
- frontend package test registration

The existing `/impact` route and Measure navigation are preserved.

## Exact evidence layers

The workspace explicitly separates:
1. P10.1 chronology;
2. P10.2 direct action/page/query/category association;
3. P10.3 before/after windows and confounder evidence;
4. P10.4 experiment/holdout structure;
5. P10.5 expected-vs-actual arithmetic;
6. P10.6 directional calibration.

The frontend projection validates the exact supported version labels for all six layers and requires parent-linked SHA-256 report fingerprints.

## Projection validation

The pure frontend model:
- validates canonical UTC reference/anchor/window/observation timestamps;
- validates upstream SHA-256 report, recommendation, anchor, outcome and signal fingerprints;
- rejects duplicate report IDs/fingerprints;
- rejects duplicate outcome actual IDs/fingerprints;
- rejects duplicate calibration signal IDs/fingerprints;
- requires each calibration signal to bind an existing exact outcome actual fingerprint;
- requires expectation fingerprint, actual ID, metric direction and P10.5 relation to match the bound outcome;
- requires every calibration signal to match the exact treatment recommendation ID/fingerprint;
- validates before/after window ordering around the retained-live anchor;
- stable-sorts outcome and calibration rows;
- preserves unavailable states;
- creates a deterministic presentation-model fingerprint.

## Workspace UI

The v2 workspace includes:
- visible `SYNTHETIC READ-ONLY`, `NO CAUSAL VERDICT`, and `NO EXECUTION` badges;
- P10.1→P10.6 lineage strip;
- availability/count summary cards only;
- treatment action/recommendation/direct-association facts;
- before/after windows and experiment/holdout provenance;
- P10.5 expected-vs-actual DataGrid;
- P10.6 directional-calibration DataGrid;
- interpretation guardrails;
- diagnostics and explicit synthetic-source limitations;
- responsive desktop/tablet/mobile rules.

## Interpretation boundary

P10.7 does not turn:
- chronology into causality;
- direct association into impact attribution;
- window membership into causal effect;
- holdout presence into valid counterfactual proof;
- signed difference into impact/uplift;
- above/equal/below arithmetic into good/bad or success/failure;
- directional calibration into recommendation quality, reward/penalty, model feedback or ranking weight;
- structural/confounder absence into confidence.

No impact score, improvement/regression verdict, winner/loser state, causal effect, recommendation grade, reward score, rollout recommendation, retain decision, rollback decision or execution authority is produced.

## Safety boundary

P10.7 has no:
- `@workspace/api-client-react` Impact binding;
- `fetch`, XHR, WebSocket or EventSource primitive;
- live provider/outcome loader;
- Production DB read/write;
- runtime secret access;
- mutation hook;
- recommendation persistence/update;
- model training/fine-tuning/weight update;
- ranking mutation;
- policy mutation;
- Task #51/#53/#54 execution;
- P9.8 implementation;
- scheduler/worker activation;
- provider/public-site write;
- new backend Impact route;
- deployment;
- publication.

## Validation

Exact-head detached Replit validation:
- model tests: `9/9` PASS;
- static P10.7 contract tests: `8/8` PASS;
- full `@workspace/seo-engine` test command: PASS;
- TypeScript model phase: `55/55` PASS;
- frontend typecheck: PASS;
- frontend build: PASS;
- `git diff --check`: PASS.

One pre-validation static-test defect was found by review before certification: the no-provider-write regex initially matched the required safety property `providerWrites: false` and then briefly contained over-escaped callable syntax. Two test-only repair commits narrowed/corrected the guard. No implementation behavior or safety semantics changed.

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `72cf75fb9248c750b485d212a8a0f9245d785809`
- tree: `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0

Merged-tree Replit certification:
- recursive workspace tests: PASS;
- full workspace typecheck: PASS;
- full workspace build: PASS;
- `git diff --check`: PASS.

The only non-fatal build diagnostic reported on that exact merged tree was the existing Vite JavaScript bundle-size advisory:
- minified: `589.41 kB`
- gzip: `169.95 kB`.

No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

## Publication state

P10.7 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P11.1 — production performance budgets and profiling**

The safe initial scope is repository engineering only:
- define explicit frontend/API build-size and performance budgets;
- capture deterministic current baselines from build artifacts;
- add bounded local/synthetic profiling where reproducible;
- fail/report budget regressions through tests/CI without generating production traffic;
- document what requires separate live-production profiling authorization.

Generic continuation must not:
- generate live production traffic/load;
- call providers for profiling;
- mutate Production DB/schema;
- mutate recommendation/model/ranking/policy state;
- implement/activate P9.8 autonomous mutation;
- execute Task #51/#53/#54;
- write to provider/public site;
- deploy or publish.

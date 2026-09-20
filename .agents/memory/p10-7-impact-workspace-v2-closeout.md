# P10.7 — Impact workspace v2 closeout

## Status

P10.7 is complete as a deterministic synthetic/read-only frontend engineering milestone.

It does not activate live outcome/provider loading, Production persistence, recommendation/model/ranking/policy mutation, autonomous execution, deployment or publication.

## Canonical implementation record

- Issue: #337 — `P10.7 — Impact workspace v2`
- Implementation PR: #338 — `P10.7 — Impact workspace v2`
- Base SHA/tree: `6a28f58962d3c710cdc050ff4af3d37b01599a9d` / `9a6c24b10794a84a8516fe42344f3bfd39f82922`
- Exact tested PR head/tree: `5e81960b3c471de18f69d5770c3dcfeeab21b70a` / `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`
- Exact-head CI: #583 / run `35521313230` — success
- Implementation merge/tree: `72cf75fb9248c750b485d212a8a0f9245d785809` / `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`
- Post-merge main CI: #584 / run `35521463457` — success

## What P10.7 changed

P10.7 replaces the legacy `/impact` page that queried the deployments API with a deterministic synthetic/read-only Impact workspace v2.

The implementation adds/changes:
- `artifacts/seo-engine/src/lib/impact-workspace-model.ts`
- `artifacts/seo-engine/src/lib/impact-workspace-model.test.ts`
- `artifacts/seo-engine/src/pages/impact.tsx`
- `artifacts/seo-engine/src/pages/impact.css`
- `artifacts/seo-engine/src/impact-workspace-contract.test.mjs`
- `artifacts/seo-engine/package.json` test registration

No backend API route was added.

## Six-layer projection

P10.7 keeps these layers distinct:

1. P10.1 chronology;
2. P10.2 direct page/query/category association;
3. P10.3 before/after windows and confounder evidence;
4. P10.4 experiment/holdout structure;
5. P10.5 expected-vs-actual arithmetic;
6. P10.6 directional recommendation calibration.

The model validates:
- supported exact P10.1–P10.6 version labels;
- SHA-256 report fingerprints;
- exact parent-report fingerprint chain;
- canonical UTC reference, anchor and window timestamps;
- unique outcome actual IDs/fingerprints;
- unique calibration signal IDs/fingerprints;
- exact calibration→actual→expectation binding;
- exact treatment recommendation ID/fingerprint binding.

Broken lineage or duplicate/conflicting projection identity fails closed.

## Outcome presentation

P10.5 outcome rows retain:
- expectation ID/fingerprint;
- metric key/unit/direction;
- expected value or unavailable;
- actual ID/fingerprint and observed timestamp;
- actual value or unavailable;
- signed difference or null;
- above/equal/below arithmetic relation or unavailable;
- tracking state.

Rows are stable-sorted for presentation but remain independent.

P10.7 does not calculate:
- percentage uplift;
- trend;
- confidence;
- treatment effect;
- difference-in-differences;
- significance;
- causal effect;
- success/failure;
- improvement/regression.

## Calibration presentation

P10.6 calibration rows retain:
- calibration key;
- role;
- recommendation ID/fingerprint;
- expectation ID/fingerprint;
- actual ID/fingerprint;
- metric direction;
- exact P10.5 relation;
- directional signal kind.

Directional signals remain one of:
- `same_as_declared_direction`
- `opposite_declared_direction`
- `equal_expected`
- `neutral_direction`
- `unavailable`

P10.7 does not turn these into:
- recommendation quality;
- reward/penalty;
- win/loss score;
- rank;
- model weight;
- policy update;
- prompt update;
- rollout/retain/rollback advice.

## UI contract

The workspace visibly states:
- **SYNTHETIC READ-ONLY**
- **NO CAUSAL VERDICT**
- **NO EXECUTION**

It includes:
- explicit P10.1→P10.6 lineage strip;
- availability/count summary cards;
- action/recommendation/direct-association panel;
- before/after + experiment/holdout panel;
- P10.5 expected-vs-actual DataGrid;
- P10.6 calibration DataGrid;
- interpretation guardrails;
- explicit limitations/diagnostics;
- responsive desktop/tablet/mobile rules.

The existing `/impact` route and Measure navigation remain unchanged.

## Safety capability

P10.7 keeps closed:
- runtime API binding;
- live outcome/provider loading;
- provider network reads;
- provider credentials;
- Production DB reads/writes;
- schema mutation;
- provider/public-site writes;
- recommendation persistence/update;
- model training/fine-tuning/weight update;
- recommendation ranking mutation;
- policy/prompt mutation;
- proposal/approval/execution authority;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- timers/scheduler/live worker/retry runtime;
- backend route activation;
- publication.

The static contract blocks generated API-client use, network primitives, database/runtime-secret primitives, mutation hooks, timer/worker primitives and callable write/execution primitives from the P10.7 page/model.

## Validation note

During branch review, a P10.7 static-contract regex was narrowed so that it rejects callable provider/public-write primitives without falsely matching the required literal safety flag `providerWrites: false`.

This was a test-only repair; implementation behavior did not change.

Exact tested head validation:
- P10.7 model tests: PASS `9/9`;
- P10.7 static contract tests: PASS `8/8`;
- full `@workspace/seo-engine` tests: PASS;
- frontend TypeScript model phase: PASS `55/55`;
- frontend typecheck: PASS;
- frontend build: PASS;
- `git diff --check`: PASS.

## Replit certification

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `72cf75fb9248c750b485d212a8a0f9245d785809`
- tree: `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0
- index/worktree: clean.

Validation on that exact merged Replit tree:
- recursive workspace tests: PASS;
- full typecheck: PASS;
- full build: PASS;
- `git diff --check`: PASS.

Validation used existing dependencies only. No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

The final build emitted one non-fatal Vite advisory:
- generated SEO Engine JavaScript chunk: `589.41 kB` minified / `169.95 kB` gzip;
- advisory threshold: 500 kB.

That advisory is preserved as evidence for P11.1 performance-budget/profiling work and is not treated as a P10.7 failure.

## Publication state

P10.7 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P11.1 — production performance budgets and profiling**

Generic continuation should begin with deterministic/offline engineering:
- inventory current frontend/server build artifacts relevant to performance;
- define explicit bundle/chunk and synthetic browser budgets;
- define normalized profiling-report contracts and regression thresholds;
- use local/synthetic browser fixtures rather than production traffic;
- keep performance findings descriptive and reproducible;
- do not silently change runtime/deployment settings as part of measurement.

Generic continuation does **not** authorize:
- production load generation;
- live provider requests;
- Production DB mutation or DDL;
- provider/public-site writes;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment/runtime configuration mutation;
- deployment/publication.

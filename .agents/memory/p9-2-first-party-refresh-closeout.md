# P9.2 — First-Party Refresh Materialization Review Closeout

## Scope

Roadmap P9.2 implemented a pure deterministic/default-off review layer between exact P9.1 `signal_refresh` due intents and current certified first-party read foundations.

Implementation:
- issue #296 — P9.2 Default-off first-party refresh materialization review v1
- PR #297 — P9.2 Default-off first-party refresh materialization review v1

P9.2 does not create executable work. It adds no route, OpenAPI/generated-client change, DB migration/query/write, jobs-table mutation, env/config/dependency change, timer/scheduler process, durable queue, worker, Task #69 packet, Task #70 execution, provider request, credential/OAuth use, persistence, deployment or publication.

## Certified implementation

- base SHA: `757d55acd0aafbdfd0511bfd425b392c2a6c5a6f`
- base tree: `2e85be0238b8d86fe083faeb6f63f1b01f16e9ab`
- initial PR head: `32237d48d5ff94e876ad7f317502d7738fd017b8`
- initial PR tree: `ab1db57d6c603a41838debd843db06c195bfc5c3`
- initial PR CI: #526 / run `35468908442` / failure
- correction / exact tested PR head: `d6de55b2d1e63c2237e0557599bfe0896e767d87`
- exact tested PR tree: `e929c3ededd5fcf71d9891bf51bb92f9dd03fd95`
- exact-head PR CI: #527 / run `35468999452` / success
- merge SHA: `6f7b1dec70d99e6797980e08b10f072c6869d18a`
- merge tree: `e929c3ededd5fcf71d9891bf51bb92f9dd03fd95`
- post-merge main CI: #528 / run `35469110061` / success

### Initial CI correction

CI #526 passed:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 observation/evidence migration test.

The P9.2 unit suite failed one negative test because the shared fixture eagerly called `buildFirstPartyRefreshSchedule()` for an intentionally external/invalid source before the test's `assert.throws` expression ran.

Correction commit `d6de55b...` split valid schedule construction from negative lineage fixture construction. No P9.2 model or safety semantics changed. CI #527 then passed the full matrix.

## Architecture result

P9.2 independently validates:
- Task #66 market identity;
- Task #66 category identity;
- Task #67 source descriptor identity;
- Task #67 refresh-plan identity/fingerprint/safety;
- exact selected source/signal refresh item;
- Task #68 request identity/safety by deterministic rebuild;
- source/plan/request market/category/signal lineage;
- first-party source class;
- exact P9.1 schedule identity/safety;
- exact P9.1 schedule ↔ source/scope/plan/request binding;
- exact P9.1 evaluation and due intent.

P9.2 derives:
- a first-party scope fingerprint from source + market + category + signal;
- an upstream-lineage fingerprint from Task #67 plan + Task #68 request;
- a P9.1 `signal_refresh` schedule with caller-supplied start/cadence/due-window/paused state;
- at most one `proposed_review` candidate when P9.1 says `due`.

Non-due P9.1 states emit no candidate. No catch-up/backfill is added.

## Source-specific runner-foundation semantics

### GSC

Only the exact Task #71 GSC source contract is recognized:
- key `google-search-console-search-analytics`;
- first-party authoritative;
- provider API;
- provenance complete;
- manually reviewed;
- exact `keyword` signal.

It is labeled only:

`runner_foundation_available`

This does not imply configuration, credential/OAuth readiness, property readiness, network readiness, Task #70 authorization or execution readiness.

### Analytics / GA4

First-party `analytics` review candidates remain:

`runner_foundation_unavailable`

with blocker:

`task70_compatible_analytics_runner_unavailable`

Historical GA4 ingestion/baseline code is not silently promoted to a current Task #70-compatible runner.

### Shopify catalog

First-party `catalog` review candidates remain:

`runner_foundation_unavailable`

with blocker:

`task70_compatible_catalog_runner_unavailable`

Historical catalog/baseline code is not silently promoted to a current Task #70-compatible runner.

## Safety result

The P9.2 capability marks only architecture/deterministic/first-party-read/materialization-review semantics true.

It explicitly keeps false:
- wall clock/timer/scheduler activation;
- durable enqueue/reservation;
- worker/batch/retry;
- Task #69 packet materialization;
- Task #70 execution;
- credential/OAuth use;
- provider network reads;
- observation/evidence persistence;
- Production DB writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

Static source contracts additionally verify there is no Task #69/#70 direct import/invocation and no timer/network/database/environment/persistence primitive.

## Replit certification

Replit app `SEO_ENGINE` was Git-only reconciled after merge:
- branch: `main`
- HEAD: `6f7b1dec70d99e6797980e08b10f072c6869d18a`
- tree: `e929c3ededd5fcf71d9891bf51bb92f9dd03fd95`
- origin/main: exact same SHA/tree
- ahead/behind: `0/0`
- worktree/index: clean
- untracked files: 0

Exact-tree validation:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS
- non-fatal build notes only: existing tooltip/sheet sourcemap messages and >500 kB chunk warning

## Publication/runtime result

P9.2 is unpublished and made no runtime/provider/database change.

The separately certified published application remains Task #73. Git synchronization and engineering merges do not alter that attested production release.

## Next boundary

Default next safe boundary: **P9.3 — scheduled full/incremental crawl policy architecture**.

Generic continuation may:
- compose existing P2.1–P2.6 full-site/incremental crawl artifacts with P9.1 `crawl_refresh` schedule semantics;
- use caller-supplied timestamps and deterministic supplied/fake inputs;
- define full-vs-incremental selection policy and explicit fallback conditions;
- retain bounded budgets, trap guards, checkpoint/resume and full-reconciliation requirements;
- keep all runtime/network/persistence gates false.

Generic continuation does not authorize:
- a live timer/scheduler;
- a crawler network request;
- durable queue enqueue/reservation;
- worker/retry activation;
- observation/evidence persistence;
- Production DB writes;
- provider/public-site mutation;
- deployment or publication.

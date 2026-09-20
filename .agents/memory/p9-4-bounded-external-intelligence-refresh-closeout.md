# P9.4 — Bounded External Intelligence Refresh Closeout

## Scope

P9.4 implements a deterministic/default-off review layer between exact Task #66/#67/#68 reviewed external-intelligence lineage, existing P5 supplied-result/telemetry foundations, and P9.1 `signal_refresh` timing.

Implementation:
- issue #304
- PR #305

No live provider transport, credential/OAuth binding, Task #69 packet, Task #70 execution, timer, durable queue, worker, persistence, database operation, mutation, deployment or publication was added.

## Canonical base

P9.4 started after legitimate Railway migration PR #303 had advanced canonical main:
- base SHA: `123600024800f592867075e2b3f2f190e0ae78e4`
- base tree: `2141b614507ef023992ffc13654132bcead2632d`
- main CI #536 / run `35473626736`: success

GitHub and Replit were exact-aligned and clean before P9.4 branching. The Railway work was preserved.

## Certified implementation

- initial commit: `e9b7088f0f08b5f50eb4b7978416697cd31b0fab`
- contract-tightening commit: `711055de4ee535fe8d1d6f70af7bbfef49b7156c`
- initial PR CI #537 / run `35494931740`: one P9.4 test failure
- correction / exact tested PR head: `a29faa0edf05d22624ea0c5133a96f55e7b012c0`
- exact tested tree: `b296ce42f54850313b0c4efa5e9e746df8eac85a`
- exact-head PR CI #538 / run `35495015109`: success
- implementation merge: `5031d9a4d10f68fbe7a82ccc3acb562e31506a9b`
- implementation tree: `b296ce42f54850313b0c4efa5e9e746df8eac85a`
- post-merge main CI #539 / run `35495152681`: success

### CI #537 correction

Schema, Task and P3.6 checks passed. One non-due P9.4 test reused telemetry with reference time `01:04Z` while evaluating caller-supplied `now=00:59Z`.

The model correctly failed closed with `telemetry_reference_time_in_future`.

Commit `a29faa0...` changed only that test fixture to use time-valid telemetry. No product, lineage, policy, safety or runtime semantics changed.

## Exact lineage

P9.4 reconstructs:
- Task #66 market/category;
- Task #67 reviewed external source identity;
- Task #67 plan identity/safety and exactly one selected source/signal item;
- Task #68 request identity/safety by deterministic rebuild.

External sources must be reviewed, provenance-complete and manually reviewed.

Recognized P5 contracts are exactly:
- P5.2 `dataforseo-google-organic-serp` / `serp` / `provider_api`;
- P5.3 `dataforseo-google-keyword-overview` / `keyword` / `provider_api`;
- P5.4 `dataforseo-google-trends-explore` / `trend` / `provider_api`;
- P5.5 `supplied-backlink-fixture` / `backlink` / `manual_import`.

Each recognized key must expose exactly its expected signal. P5.6 competitor-gap synthesis is downstream composition and is not admitted as a source-specific runner.

## Supplied foundation versus runtime

P5.2–P5.5 remain supplied-result/request-contract foundations.

Candidates explicitly separate:
- supplied-result foundation: available;
- live runtime: unavailable.

Provider-API live blockers preserve enrollment, credential, network and Task #70-compatible runner gaps. P5.5 remains manual-import-only.

## Scheduling and telemetry

P9.4 binds exact source/scope/plan/request plus adapter kind/version/capability into P9.1 `signal_refresh` schedule identity.

It rebuilds one exact P5.8 source/signal telemetry stream from caller-supplied events and rate-limit snapshots.

Quality/cost are descriptive only:
- no Task #67 reordering;
- no proprietary provider score;
- no execution authorization.

Provider-review/rate-limit facts influence only review disposition:
- fresh/available → `supplied_review_ready`;
- elevated → `supplied_review_caution`;
- stale provider review, unavailable/stale/critical rate evidence, constrained/exhausted rate state → `deferred_review`.

For P5.5 manual import, provider/rate-limit readiness is not applicable.

Only P9.1 `due` emits one `proposed_review` candidate. Non-due states emit none. No catch-up/backfill exists.

## Safety

P9.4 keeps false:
- wall-clock/timer/scheduler activation;
- durable enqueue/reservation;
- worker/batch/retry;
- Task #69 packet materialization;
- Task #70 execution;
- provider enrollment/purchase;
- credential creation/use;
- OAuth;
- provider network reads/live endpoint/polling;
- observation/evidence persistence;
- Production DB reads/writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

Static contracts verify absence of timer/environment/database/network/Task #69/#70 execution primitives.

## Replit certification

Replit was Git-only fast-forwarded to:
- branch `main`
- HEAD `5031d9a4d10f68fbe7a82ccc3acb562e31506a9b`
- tree `b296ce42f54850313b0c4efa5e9e746df8eac85a`
- origin/main exact
- ahead/behind `0/0`
- clean index/worktree
- zero tracked changes
- zero untracked files
- zero diff against origin/main

Validation:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS

## Publication/runtime result

P9.4 is unpublished. Production remains the separately certified Task #73 release.

No provider credential/network activity, Task #69/#70 execution, live scheduling, durable queue/worker, persistence, Production DB mutation, provider/public-site mutation, deployment or publication occurred.

## Next boundary

Default next safe boundary: **P9.5 — failure/retry/dead-letter/idempotency controls**.

Generic continuation may model deterministic failure classes, bounded retry eligibility/backoff intents, idempotency/replay semantics and dead-letter review states over supplied P9.1–P9.4 artifacts.

It does not authorize a live retry loop, durable queue/dead-letter store, worker, provider/crawl request, persistence, Production DB write, mutation or publication.

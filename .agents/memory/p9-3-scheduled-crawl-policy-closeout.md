# P9.3 — Scheduled Full / Incremental Crawl Policy Closeout

## Scope

Roadmap P9.3 implemented a pure deterministic/default-off crawl-policy review layer between exact P9.1 `crawl_refresh` due intents and the certified P2.1–P2.6 crawl artifacts.

Implementation:
- issue #299 — P9.3 Scheduled full/incremental crawl policy architecture v1
- PR #300 — P9.3 Scheduled full/incremental crawl policy architecture v1

P9.3 does not create executable crawl work. It adds no route, OpenAPI/generated-client change, DB migration/query/write, env/config/dependency change, timer/scheduler process, durable queue, worker, network request, crawl execution, persistence, deployment or publication.

## Certified implementation

- base SHA: `3907785ab69247c7876e7dcb63c3c33c794a06ac`
- base tree: `48398ece7617652cafba799fef01d0211e7faef0`
- exact tested PR head: `eb41b808e6cd90664a14d0e5d69a4ac33c5a829b`
- exact tested PR tree: `b0715be30d22f9183b91f08f92c253818627c7e0`
- exact-head PR CI: #531 / run `35471860344` / success
- implementation merge: `023df71e35376a774c11494d8c17b03a65e7c7b6`
- implementation tree: `b0715be30d22f9183b91f08f92c253818627c7e0`
- post-merge main CI: #532 / run `35471981585` / success

No corrective implementation commit was required.

## Architecture result

P9.3 independently validates and reconstructs the exact current first-party crawl lineage:
- P2.1 crawl-controller plan;
- P2.2 sitemap inventory;
- P2.3 full-site execution plan;
- P2.3 checkpoint;
- P2.4 full-site certification.

The supplied P2.4 certification must deterministically rebuild from that exact tuple. Any mismatch fails closed.

When incremental evidence is supplied, P9.3 additionally:
- validates the P2.5 comparison integrity;
- rebuilds the comparison from exact before/after history sources;
- validates the P2.6 incremental-plan integrity;
- rebuilds the P2.6 plan from the exact comparison, explicit incremental policy and explicit trusted candidates;
- requires the incremental `after` inventory/certification to equal the current full-site lineage.

Absent incremental evidence is represented explicitly. It is not inferred or fabricated.

## P9.1 schedule binding

P9.3 derives a P9.1 `crawl_refresh` schedule.

The scope fingerprint binds:
- exact site ID;
- exact canonical origin.

The upstream-lineage fingerprint binds:
- explicit P9.3 full-reconciliation policy;
- deterministic current crawl-plan fingerprint;
- exact current inventory fingerprint;
- exact current execution-plan fingerprint;
- exact current checkpoint fingerprint;
- exact current certification fingerprint;
- exact P2.5 comparison fingerprint when supplied;
- exact P2.6 incremental-plan fingerprint when supplied.

The caller must still explicitly supply:
- schedule key;
- start timestamp;
- cadence minutes;
- due-window minutes;
- paused state.

P9.3 reads no wall clock.

## Full-reconciliation interval

P9.3 adds one bounded policy input:

`fullReconciliationEverySlots`

Valid range:
- minimum 1;
- maximum 720.

The slot index is derived from the exact P9.1 schedule anchor/cadence and due intent.

Slot zero is a full-reconciliation boundary. Thereafter every configured Nth slot is a full-reconciliation boundary.

This is deterministic policy arithmetic only. It does not activate a timer.

## Selection precedence

Only a P9.1 `due` slot can emit a P9.3 candidate.

The deterministic selection precedence is:

1. configured periodic boundary → `full_reconciliation` / `scheduled_full_reconciliation`;
2. current P2.4 whole-site certification blocked → `full_reconciliation` / `current_full_site_not_certified`;
3. exact incremental evidence unavailable → `full_reconciliation` / `incremental_evidence_unavailable`;
4. P2.6 fallback recommends full reconciliation → preserve exact P2.6 reason;
5. exact safe P2.6 plan has selected URLs → `incremental` / `incremental_candidates_available`;
6. exact safe P2.6 plan has zero selected URLs → `no_work` / `no_incremental_candidates`.

P9.3 preserves the two P2.6 full-reconciliation reasons:
- `aggregate_regression_without_url_level_evidence`;
- `lineage_change_without_url_level_evidence`.

It does not weaken those fallbacks.

P9.1 states `not_started`, `paused`, `missed` and `already_materialized` emit no P9.3 candidate. There is no catch-up/backfill.

## Candidate semantics

A due P9.3 candidate has lifecycle:

`proposed_review`

It binds:
- exact P9.1 schedule/intent IDs and fingerprints;
- slot and expiry;
- deterministic slot index;
- exact site/origin;
- explicit full-reconciliation interval;
- exact current P2 fingerprints;
- optional P2.5/P2.6 fingerprints;
- selection and reason;
- selected/deferred URL counts;
- batch count;
- whether whole-site certification is required;
- closed P9.3 safety state.

The candidate is descriptive. It is not a durable queue row, reservation, crawl authorization, HTTP request, worker dispatch, retry instruction, persistence command or publication instruction.

## Preserved P2 safety semantics

P9.3 composes existing P2 artifacts instead of creating weaker crawl controls.

The exact lineage retains:
- first-party scope;
- HTTPS canonical origin;
- bounded page hard limit and absolute ceiling;
- sitemap-first full-site inventory;
- same-origin GET only;
- robots enforcement;
- canonical deduplication;
- query/trap controls;
- bounded batching;
- bounded concurrency;
- per-origin rate limiting;
- redirect revalidation;
- checkpoint/resume;
- whole-site completion accounting/certification;
- closed execution/persistence/scheduler/worker/retry authorization.

## Safety result

P9.3 marks only architecture/review properties true:
- `architectureOnly`;
- `deterministicProjectionOnly`;
- `firstPartyCrawlPolicyOnly`;
- `materializationReviewOnly`;
- `p2SafetyControlsRequired`;
- `fullReconciliationFallbackPreserved`.

It explicitly keeps false:
- wall-clock access;
- timer activation;
- scheduler activation;
- durable enqueue;
- queue reservation;
- worker;
- batch executor;
- retry loop;
- sitemap network fetching;
- crawl network reads;
- crawl execution;
- observation persistence;
- evidence persistence;
- Production DB reads;
- Production DB writes;
- provider writes;
- public-site writes;
- Task #53 execution;
- Task #54 execution;
- automatic transition;
- publication authorization.

Static source contracts verify there is no timer/environment/database/network/runtime crawl-execution primitive.

## CI result

PR #300 exact-head CI #531 passed:
- legacy PostgreSQL core schema validation;
- Task tests;
- P3.6 observation/evidence migration test;
- all current workspace package tests, including P9.3 unit/static-contract suites;
- Playwright browser critical paths;
- typecheck;
- build.

Post-merge main CI #532 passed on exact merge SHA `023df71e...`.

## Replit certification

After the implementation merge, Replit app `SEO_ENGINE` was Git-only fast-forwarded:

- branch: `main`
- HEAD: `023df71e35376a774c11494d8c17b03a65e7c7b6`
- tree: `b0715be30d22f9183b91f08f92c253818627c7e0`
- origin/main: exact same SHA/tree
- ahead/behind: `0/0`
- worktree/index: clean
- untracked files: 0

Exact-tree validation:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS
- non-fatal build notes only: existing sourcemap messages and large-chunk warning.

No Replit-only source/config/runtime/database/deployment/publication change was made.

## Publication/runtime result

P9.3 is unpublished.

The separately certified production application remains Task #73 — GSC First-Live-Read Pilot Readiness v1.

P9.3 performed no:
- live timer/scheduler activation;
- crawl/sitemap network request;
- durable queue materialization/reservation;
- worker/batch/retry activation;
- observation/evidence persistence;
- Production DB read/write/DDL/DML;
- Task #53/#54 execution;
- provider/public-site mutation;
- credential/secret/config mutation;
- deployment/publication.

## Next boundary

Default next safe boundary: **P9.4 — bounded external intelligence refresh**.

Generic continuation may:
- compose existing P5 external-intelligence source/adapter/telemetry foundations with Task #67/#68 and P9.1 `signal_refresh` semantics;
- use deterministic supplied/fake provider results only;
- define bounded refresh/materialization-review policy and explicit unavailable/fallback states;
- preserve source quality/cost/rate-limit and exact-lineage requirements;
- keep all live/runtime/persistence gates false.

Generic continuation does not authorize:
- provider enrollment;
- credentials;
- live provider/network requests;
- Task #69 packet materialization;
- Task #70 execution;
- durable queue enqueue/reservation;
- worker/retry activation;
- observation/evidence persistence;
- Production DB writes;
- provider/public-site mutation;
- deployment or publication.

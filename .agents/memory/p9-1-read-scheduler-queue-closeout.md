# P9.1 — Read Scheduler / Queue Architecture Closeout

## Scope

Roadmap P9.1 implemented a pure deterministic, default-off architecture for future scheduled read work.

Implementation:
- issue #293 — P9.1 Read-only scheduler/queue architecture v1
- PR #294 — P9.1 Read-only scheduler/queue architecture v1

P9.1 intentionally sits above planning and below future job/materialization/runtime execution. It adds no route, OpenAPI/generated-client change, DB migration/query/write, jobs-table mutation, environment/config/dependency change, provider SDK, timer process, scheduler process, worker, network call, deployment or publication.

## Certified implementation

- base SHA: `53aef9450ed282d74fe3b3436bbb5ec05315f47c`
- base tree: `b11922ac555733f96b03c65e8bf112e37ae14cc3`
- exact tested PR head: `71aa75c620c8e05ea37c23a1ca932dbe255139b9`
- exact tested PR tree: `e2f2d40dd530b80c74d6803f9245ff642f9f11a8`
- exact-head PR CI: #522 / run `35467292055` / success
- merge SHA: `e348aed49b3d787d237096a2bde24b23930e3223`
- merge tree: `e2f2d40dd530b80c74d6803f9245ff642f9f11a8`
- post-merge main CI: #523 / run `35467412415` / success

## Architecture result

P9.1 defines only:
- read work classes `signal_refresh` and `crawl_refresh`;
- deterministic schedule ID/fingerprint;
- caller-supplied evaluation time with no wall-clock dependency;
- fixed cadence slots anchored to `startAt`;
- bounded due windows that do not overlap the next slot;
- explicit schedule evaluation states: `not_started`, `paused`, `due`, `missed`, `already_materialized`;
- no implicit catch-up/backfill after a missed due window;
- exact alignment validation for supplied prior materialization;
- at most one deterministic proposed intent per due schedule/slot;
- bounded queue projection over at most 100 schedule definitions;
- duplicate schedule key/ID fail-closed behavior;
- canonical serialization with no hidden priority/ranking meaning.

The capability model explicitly preserves:
- `architectureOnly=true`;
- `deterministicProjectionOnly=true`;
- `readWorkOnly=true`;

and explicitly keeps false:
- scheduler/timer activation;
- durable enqueue;
- queue reservation/claim;
- worker or batch executor;
- retry loop;
- Task #69 packet materialization;
- Task #70 execution;
- credential use;
- provider/network read;
- crawl execution;
- observation/evidence persistence;
- Production DB write;
- provider/public-site write;
- Task #53/#54 execution;
- automatic transition;
- publication.

## Replit certification

Replit app `SEO_ENGINE` was independently verified on the exact merged tree:
- branch: `main`
- HEAD: `e348aed49b3d787d237096a2bde24b23930e3223`
- tree: `e2f2d40dd530b80c74d6803f9245ff642f9f11a8`
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

## Safety result

P9.1 remained architecture-only and unpublished. It performed no:
- timer or scheduler activation;
- durable queue materialization/reservation;
- worker/batch/retry activation;
- Task #69 packet creation;
- Task #70 execution;
- provider or crawl request;
- credential use;
- observation/evidence persistence;
- Production DB DDL/DML;
- Task #53/#54 execution;
- provider/public-site mutation;
- deployment or publication.

The separately certified published application remains Task #73.

## Next boundary

Default next safe boundary: **P9.2 — scheduled GSC/analytics/catalog refresh architecture/materialization review**.

Generic continuation may:
- define deterministic schedule-to-first-party-read intent mappings;
- bind exact source/refresh-plan lineage;
- define fail-closed readiness/materialization semantics;
- keep all runtime/network/persistence gates false;
- use fake/supplied data and pure tests.

Generic continuation does not authorize:
- a live timer/scheduler;
- durable queue enqueue/reservation;
- worker or retry activation;
- Task #70 execution;
- GSC/GA4/Shopify provider calls;
- credentials/OAuth use;
- observation/evidence persistence;
- Production DB writes;
- provider/public-site mutation;
- deployment or publication.

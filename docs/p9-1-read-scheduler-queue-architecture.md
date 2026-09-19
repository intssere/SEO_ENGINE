# P9.1 — Read-only Scheduler / Queue Architecture v1

## Purpose

P9.1 defines the deterministic control-plane semantics for deciding **when read work is due** and projecting a bounded queue of proposed read-work intents.

It does not activate a scheduler.

It adds no timer, worker, durable enqueue, queue reservation, database write, provider request, crawl, retry loop, Task #70 execution, Task #53/#54 execution, or publication.

P9.1 therefore sits between existing planning foundations and later separately reviewed runtime materialization:

`certified read-plan lineage`
→ `P9.1 fixed schedule + due-slot projection`
→ **future P9.2/P9.3/P9.4 materialization**
→ existing Task #69/#70 or P2 execution boundaries as applicable

The final arrows do not exist in P9.1.

## Read-work classes

V1 admits only:

- `signal_refresh`
- `crawl_refresh`

There is no mutation/action/deployment work class.

`signal_refresh` is intended for later P9.2 first-party refresh and P9.4 bounded external-intelligence refresh materialization.

`crawl_refresh` is intended for later P9.3 full/incremental crawl materialization.

P9.1 itself does not know provider requests, crawl targets, credentials, routes, or runtime adapters.

## Schedule identity

A canonical schedule binds:

- descriptive stable key;
- read-work class;
- exact scope fingerprint;
- exact upstream lineage fingerprint;
- fixed `startAt` anchor;
- cadence minutes;
- due-window minutes;
- paused state;
- immutable closed safety markers.

The deterministic schedule fingerprint covers every material field. The schedule ID is derived from that fingerprint.

V1 bounds:

- cadence: 60 minutes through 43,200 minutes (30 days);
- due window: at least one minute and no longer than the cadence;
- queue projection: at most 100 schedule definitions.

These are architecture bounds only. P9.2–P9.4 can adopt narrower source-specific policies.

## Caller-supplied time only

P9.1 does not read the system clock.

Every evaluation receives `now` from the caller. Timestamps are parsed and normalized to canonical ISO strings before evaluation and fingerprinting.

This keeps tests deterministic and prevents architecture code from becoming an active scheduler by accident.

## Fixed cadence slots

Cadence is anchored permanently to `startAt`.

For example, a 60-minute schedule anchored at 00:00 has slots at 00:00, 01:00, 02:00, and so on.

A task completing at 00:07 does not shift the next slot to 01:07.

Completion/runtime timestamps are not schedule inputs.

## Due-window semantics

For the current anchored slot:

- before `startAt` → `not_started`;
- paused definition → `paused`;
- exact current slot already materialized → `already_materialized`;
- current time at or beyond slot expiry → `missed`;
- otherwise → `due`.

The expiry boundary is exclusive for due work: at `expiresAt`, the slot is already missed.

A missed slot emits no intent.

There is no automatic catch-up/backfill. When the next anchored slot begins, only that new slot is evaluated.

## Materialization-state input

P9.1 accepts at most one caller-supplied `lastMaterializedSlotAt` value per schedule.

It must:

- be on or after `startAt`;
- align exactly to an anchored cadence slot;
- not be in the future relative to the supplied evaluation time.

Malformed or misaligned state fails closed.

P9.1 does not persist this state.

## Read-work intent

Only a `due` slot produces an intent.

The deterministic intent binds:

- schedule ID/fingerprint;
- stable schedule key;
- read-work class;
- exact scope fingerprint;
- exact upstream-lineage fingerprint;
- exact slot time;
- exact slot expiry;
- lifecycle `proposed`;
- immutable closed safety markers.

The intent ID/fingerprint is descriptive. It is not a durable queue reservation, authorization, job row, dispatch request, or execution grant.

## Queue projection

`buildReadQueueProjection` evaluates a bounded set of schedules using one caller-supplied `now`.

It:

- fails closed on duplicate schedule IDs;
- fails closed on duplicate schedule keys;
- emits at most one intent per due schedule/current slot;
- canonicalizes schedule and intent serialization by schedule ID;
- reports explicit counts for due/not-started/paused/missed/already-materialized states;
- emits a deterministic projection fingerprint.

Canonical order is serialization only. It is not priority, importance, provider ordering, dispatch order, or execution order.

## Relationship to Task #69 and Task #70

P9.1 deliberately does not import or call Task #69 or Task #70.

For future signal work:

1. P9.1 may later establish that an exact read slot is due.
2. A separately reviewed P9.2/P9.4 materializer may reconstruct fresh Task #67/Task #68 lineage.
3. Only then could it build a fresh Task #69 packet.
4. Task #70 remains separately default-off and requires its exact authorization/gates.

A P9.1 intent does not authorize any of those steps.

Task #70 remains unchanged with:

- scheduler disabled;
- batch executor disabled;
- autonomous worker disabled;
- retry loop disabled;
- generic execution authorization false.

## Crawl boundary

A `crawl_refresh` intent does not authorize a crawl.

Future P9.3 must bind the intent to certified P2 full/incremental crawl policy and preserve the existing crawl execution/coverage gates.

## Safety capability

P9.1 explicitly keeps false:

- wall-clock access;
- timer activation;
- scheduler activation;
- durable enqueue;
- queue reservation;
- worker;
- batch executor;
- retry loop;
- Task #69 packet materialization;
- Task #70 execution;
- credential use;
- network reads;
- crawl execution;
- observation/evidence persistence;
- Production DB writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication authorization.

P9.1 marks only these true:

- architecture only;
- deterministic projection only;
- read work only.

## No side effects

P9.1 adds no:

- API route;
- OpenAPI/generated-client change;
- environment variable;
- scheduler process;
- timer;
- worker;
- queue consumer;
- provider SDK;
- DNS/HTTP/API request;
- database query/write;
- jobs-table reservation;
- migration/DDL;
- Task #69 packet;
- Task #70 execution;
- crawl execution;
- provider/public-site mutation;
- deployment/publication behavior.

## Next boundary

After P9.1 is certified, P9.2 may separately define **scheduled GSC/analytics/catalog refresh materialization** over exact certified first-party source contracts.

P9.2 must remain separately reviewed and default-off. P9.1 does not authorize a real schedule, durable enqueue, Task #70 run, credential use, provider request, persistence, or deployment.

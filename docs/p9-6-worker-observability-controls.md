# P9.6 — Worker Observability and Pause / Drain / Kill / Resume Controls v1

## Purpose

P9.6 defines deterministic/default-off worker control and observability semantics above certified P9.5 failure/retry/dead-letter/idempotency projections.

It is a control-plane model only.

P9.6 does not start a scheduler, worker, retry loop, provider request, crawl, queue claim, database write or durable control record.

## Control precedence

The control precedence is:

`kill > drain > pause > running`

Supported control modes:

- `running`
- `paused`
- `draining`
- `drained`
- `killed`

Supported review actions:

- `pause`
- `drain`
- `kill`
- `resume`

Every transition is an inert deterministic `proposed_review` artifact.

## Pause

Pause means stop admitting new work while allowing already in-flight work to continue.

While paused:

- new schedule admission review is closed;
- new claim review is closed;
- retry-dispatch review is closed;
- an already claimed/in-flight attempt may continue;
- P9.5 attempts, backoff, idempotency and expiry are unchanged;
- dead-lettered and succeeded work remain terminal.

An in-flight observation claimed at or after the supplied pause effective time fails closed because it would contradict pause semantics.

## Drain

Drain means become quiescent without interrupting already in-flight work.

While draining:

- new schedule admission review is closed;
- new claim review is closed;
- retry-dispatch review is closed;
- in-flight work may continue;
- no replacement work is synthesized.

A supplied draining state with one or more in-flight observations projects as `draining` / health `quiescing`.

When supplied in-flight count reaches zero, effective mode projects as `drained`.

Resume from an incomplete drain fails closed.

## Kill

Kill is the highest-precedence emergency control.

While killed:

- admission review is closed;
- new claim review is closed;
- retry-dispatch review is closed;
- in-flight continuation is not authorized;
- cancellation is conceptually requested;
- each supplied in-flight item receives a deterministic kill-reconciliation review.

P9.6 never performs cancellation itself.

### Confirmed not started

If supplied evidence is `confirmed_not_started`:

- no execution-start timestamp may exist;
- if the original P9.1 work window remains open, the item may be marked `confirmed_not_started_reviewable_after_recovery`;
- if the original work window has expired, it is marked `confirmed_not_started_dead_letter_review`.

Neither state dispatches a retry.

### Execution started or outcome uncertain

If supplied evidence is:

- `execution_started`; or
- `outcome_uncertain`

the kill reconciliation is:

`manual_intervention_required`

Reason:

`killed_in_flight_outcome_uncertain`

This is deliberately non-automatic because upstream work may have occurred even if a local response was lost.

## Resume

Ordinary resume reopens control review only from pause or a completed drain.

A draining state with outstanding in-flight work cannot resume.

A killed state cannot ordinary-resume:

`killed_requires_recovery_review`

A future recovery boundary must reconcile killed in-flight work before the kill latch can be cleared.

Resume does not:

- create missed P9.1 slots;
- backfill work;
- reset attempt count;
- reset backoff;
- reset idempotency identity;
- extend expiry;
- revive P9.5 dead-letter review.

P9.5 state is simply re-evaluated from the existing supplied history at the caller-supplied time.

## In-flight attempt validity

P9.6 models active work separately from terminal P9.5 attempt records.

A supplied active attempt must:

- bind the exact P9.5 artifact-reference fingerprint and idempotency key;
- have a canonical deterministic observation identity;
- have a claim timestamp at or after original slot and strictly before original expiry;
- not be future-dated;
- use the exact next attempt number implied by P9.5 state at claim time;
- for retries, be claimed only after P9.5 backoff eligibility;
- have ordered claim/start/heartbeat timestamps;
- not coexist with a terminal P9.5 state at claim time.

This distinction allows pause/drain to let a legitimately claimed attempt finish after its admission window later expires. The expiry still prohibits a new claim.

## Heartbeat observability

P9.6 accepts one bounded supplied heartbeat policy:

`staleAfterMinutes: 1..1440`

Heartbeat age uses caller-supplied `now` only.

Each in-flight item reports:

- `fresh`; or
- `stale`

with deterministic age minutes.

A running control state with stale heartbeat evidence projects health `degraded`.

No polling/timer is created.

## Health states

Overall projected health is:

- `healthy` — running, no stale in-flight heartbeat;
- `degraded` — running with one or more stale heartbeats;
- `paused`;
- `quiescing` — draining with in-flight work;
- `drained` — drain complete / zero in-flight;
- `killed` — killed with no supplied unresolved started/uncertain item;
- `blocked_recovery` — killed with one or more manual-intervention reconciliations.

## Work-item dispositions

P9.6 exposes descriptive control dispositions:

- `control_review_open`
- `retry_waiting`
- `retry_review_open`
- `held_by_control`
- `retry_held_by_control`
- `in_flight_running`
- `in_flight_continuing`
- `in_flight_kill_reconciliation`
- `succeeded_terminal`
- `dead_letter_terminal`
- `no_work_terminal`

These are observability/review labels, not execution authorization.

## P9.5 interaction

For work without an active in-flight observation, P9.6 evaluates canonical P9.5 at the supplied observation time.

Therefore:

- retryable work can mature while paused but remains held;
- on resume, a still-valid retry may again project `retry_review_open`;
- if the window expired while held, P9.5 remains authoritative and returns dead-letter review;
- succeeded/dead-lettered work remains terminal.

For active work, P9.6 validates P9.5 eligibility at the supplied claim time, then treats the item as in-flight until a later supplied terminal attempt record replaces it.

## P9.3 no-work

A validated P9.3 `no_work` candidate always projects `no_work_terminal`.

P9.6 rejects any supplied attempt or in-flight history for a `no_work` candidate.

This prevents control-plane observability from accidentally turning `no_work` into executable work.

## Observability summary

The deterministic projection reports:

- total items;
- open initial control reviews;
- retry waiting;
- retry review open;
- held items;
- in-flight count;
- stale heartbeat count;
- succeeded count;
- dead-letter review count;
- no-work count;
- kill reconciliation count;
- unreconciled-killed/manual-intervention count;
- requested control mode;
- effective control mode;
- overall health.

No priority/ranking is inferred from ordering.

## Closed safety boundary

P9.6 explicitly keeps false:

- wall-clock access;
- timer activation;
- scheduler activation;
- live worker;
- live retry loop;
- durable control-state persistence;
- durable enqueue/reservation;
- durable dead-letter store;
- batch executor;
- Task #69 materialization;
- Task #70 execution;
- credential/OAuth use;
- provider network reads;
- crawl network reads/execution;
- observation/evidence persistence;
- Production DB reads/writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

Static tests also forbid timer, environment, database, network and worker-process primitives in the P9.6 module.

## Runtime/publication boundary

P9.6 is engineering architecture only and remains unpublished.

Production remains the separately certified Task #73 application release.

Generic continuation does not authorize worker activation, persistent pause/kill state, scheduler/retry-loop activation, queue claims, network reads, database operations, provider/public-site mutation, deployment or publication.

## Next boundary

After P9.6 certification, the next roadmap item is **P9.7 — recommendation generation worker**.

P9.7 must remain default-off and synthetic/supplied-input only until its own execution boundary is reviewed. Generic continuation must not activate a live worker, AI proposal generation, provider/crawl runtime, persistence, mutation or publication.

# P9.6 — Worker Observability and Pause / Drain / Kill / Resume Controls Closeout

## Scope

P9.6 implements deterministic/default-off worker observability plus pause, drain, kill and resume control semantics over supplied/fake state and canonical P9.5 projections.

Implementation:
- issue #310
- PR #311

No live worker, timer, scheduler, retry loop, durable control state, durable queue/DLQ, provider/crawl request, Task #69/#70 execution, persistence, database operation, mutation, deployment or publication was added.

## Canonical base

P9.6 started from:
- base SHA: `d44952fc57e29dd4289b24dfe14f198c2754e9d4`
- base tree: `bdb704e93435db34c83852f59b8741cc024ccba4`
- main CI #545: success

GitHub and Replit were exact-aligned and clean before branching.

## Certified implementation

- exact tested PR head: `cf982342b540db6d2f73b8b4c8c5800f61e46c33`
- exact tested tree: `f0cbc84c274379e7b120edc6636187e8d741ff55`
- exact-head PR CI #546 / run `35498483145`: success
- implementation merge: `6886c518cad989d14ea8f61ff02d20fbf2f771ab`
- implementation tree: `f0cbc84c274379e7b120edc6636187e8d741ff55`
- post-merge main CI #547 / run `35498627966`: success

The first implementation head passed the complete CI matrix; no correction commit was required.

## Control precedence

P9.6 defines:

`kill > drain > pause > running`

Transitions are deterministic `proposed_review` artifacts only.

Kill can supersede any state. Drain cannot be downgraded to pause. Incomplete draining cannot resume. Killed state cannot ordinary-resume and instead requires future explicit recovery review.

## Pause

Pause:
- closes new admission review;
- closes new claim review;
- closes retry-dispatch review;
- permits already in-flight work to continue;
- rejects supplied claims created at/after pause effective time.

Pause does not change P9.1 schedule identity or P9.5 history.

## Drain

Drain:
- closes admission/claim/retry-dispatch review;
- permits already in-flight work to finish;
- projects `quiescing` while in-flight work remains;
- projects effective `drained` when supplied in-flight count reaches zero.

No replacement/catch-up work is synthesized.

## Kill and reconciliation

Kill:
- closes admission/claim/retry-dispatch review;
- disallows in-flight continuation;
- conceptually requests cancellation;
- emits deterministic per-item reconciliation review.

Supplied `confirmed_not_started` evidence:
- must have no execution-start timestamp;
- may be reviewable after a future recovery only while the original work window remains open;
- becomes dead-letter review if the original window expired.

Supplied `execution_started` or `outcome_uncertain` evidence:
- yields `manual_intervention_required`;
- never creates automatic retry authority.

## Resume

Resume is review-only and may reopen running mode from:
- paused;
- drained;
- draining only when supplied in-flight count is already zero.

Resume never:
- resets attempts;
- resets backoff;
- resets idempotency;
- extends expiry;
- creates P9.1 catch-up/backfill;
- revives succeeded/dead-letter/no-work items.

Killed state cannot ordinary-resume.

## P9.5 claim-time eligibility

Active work is represented separately from terminal P9.5 attempt records.

An in-flight attempt must:
- bind exact P9.5 artifact/idempotency identity;
- use the exact next attempt number implied by P9.5 at claim time;
- for retry attempts, be claimed only after P9.5 backoff eligibility;
- have a claim timestamp inside the original P9.1 admission window;
- have canonical ordered claim/start/heartbeat times.

This allows a legitimately claimed in-flight attempt to finish later under pause/drain even if the original admission window subsequently expires. Expiry still prohibits a new claim.

## Heartbeat and health

Heartbeat freshness uses only caller-supplied timestamps and a bounded 1–1440 minute stale threshold.

Health projection:
- `healthy`
- `degraded`
- `paused`
- `quiescing`
- `drained`
- `killed`
- `blocked_recovery`

No polling/timer exists.

## Terminal-state preservation

- P9.5 success remains terminal.
- P9.5 dead-letter review remains terminal.
- P9.3 `no_work` remains terminal.
- Attempts or in-flight state supplied for `no_work` fail closed.
- Worker controls cannot reactivate terminal items.

## Safety

P9.6 keeps false:
- wall clock access;
- timer/scheduler activation;
- live worker;
- live retry loop;
- durable control-state persistence;
- durable enqueue/reservation;
- durable dead-letter store;
- batch execution;
- Task #69 materialization;
- Task #70 execution;
- credential/OAuth use;
- provider/crawl network access;
- crawl execution;
- observation/evidence persistence;
- Production DB reads/writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

Static contracts verify absence of runtime timer/environment/database/network/worker-process/Task #69/#70 primitives.

## Replit certification

Replit was Git-only fast-forwarded to:
- branch `main`
- HEAD `6886c518cad989d14ea8f61ff02d20fbf2f771ab`
- tree `f0cbc84c274379e7b120edc6636187e8d741ff55`
- origin/main exact
- ahead/behind `0/0`
- clean index/worktree
- zero tracked differences
- zero untracked files

Validation:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS

## Publication/runtime result

P9.6 is unpublished. Production remains the separately certified Task #73 release.

No live worker/scheduler/retry, durable control/queue/DLQ state, Task #69/#70, provider/crawl request, credential, persistence, Production DB mutation, provider/public-site mutation, deployment or publication occurred.

## Next boundary

Default next safe boundary: **P9.7 — recommendation generation worker**.

Generic continuation may define deterministic/default-off recommendation generation over supplied/synthetic P6/P7/P8-compatible evidence and existing proposal structures only.

It does not authorize:
- a live worker;
- AI/provider model calls;
- `AI_PROPOSAL_GENERATION_ENABLED`;
- durable queue mutation;
- provider/crawl runtime;
- persistence;
- Production DB writes;
- provider/public-site mutation;
- deployment;
- publication.

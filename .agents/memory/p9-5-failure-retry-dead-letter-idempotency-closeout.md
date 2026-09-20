# P9.5 — Failure / Retry / Dead-Letter / Idempotency Closeout

## Scope

P9.5 implements deterministic/default-off failure-history, retry-review, dead-letter-review and idempotency controls over supplied/proposed P9.1–P9.4 artifacts.

Implementation:
- issue #307
- PR #308

No live retry loop, durable queue/DLQ, worker, provider/crawl request, Task #69/#70 execution, persistence, database operation, mutation, deployment or publication was added.

## Canonical base

P9.5 started from:
- base SHA: `91a2dcc1d94421964a6c16940fac4c12855a1676`
- base tree: `df1a0f2ada77af20bbeae253fb69bffb07b15d55`
- main CI #541: success

GitHub and Replit were exact-aligned and clean before branching.

## Certified implementation

- exact tested PR head: `bf4c69555eb7eb29deeff330e25db195d8533b72`
- exact tested tree: `3737d643751b0404a4fbd0837626b50eda839d90`
- exact-head PR CI #542 / run `35496786420`: success
- implementation merge: `83334cf68900bf779851f92056dc351811822533`
- implementation tree: `3737d643751b0404a4fbd0837626b50eda839d90`
- post-merge main CI #543 / run `35496913783`: success

No corrective commit was required; the first exact P9.5 implementation head passed the full CI matrix.

## Upstream artifact integrity

P9.5 accepts:
- P9.1 read-work intent;
- P9.2 first-party refresh candidate + exact P9.1 intent;
- P9.3 scheduled crawl candidate + exact P9.1 intent;
- P9.4 external-intelligence candidate + exact P9.1 intent.

It validates deterministic IDs/fingerprints, safety contracts, canonical work-window timestamps and exact candidate ↔ P9.1 schedule/intent/slot/expiry binding.

P9.2/P9.3/P9.4 source evidence remains transitively bound by the upstream candidate fingerprint; P9.5 does not reopen raw P2/P5/Task #67/#68 source objects.

## Idempotency and attempt history

One deterministic artifact-reference fingerprint and one `idk-...` idempotency key are derived for each exact upstream artifact.

Supplied attempt records:
- are bounded;
- start at attempt 1;
- are contiguous;
- use strictly increasing timestamps;
- remain inside the original P9.1 window;
- may not be future-dated at evaluation;
- stop after success;
- contain fixed failure codes rather than raw error text.

Exact replay of the same attempt record is suppressed and counted.

A conflicting record for the same attempt number fails closed.

## Failure taxonomy

Automatically retryable:
- `transport_timeout`
- `provider_rate_limited`
- `provider_unavailable`
- `dependency_unavailable`

Not automatically retryable:
- generic `runner_failed`;
- `normalization_failed`;
- stale lineage;
- authorization closed;
- invalid input;
- identity collision;
- claim failure;
- manual intervention;
- expiry;
- unsupported operation;
- already consumed;
- unknown failure.

This preserves Task #70's conservative uncertainty boundary rather than assuming an opaque terminal failure is safe to replay.

## Retry review

Retry policy is bounded:
- 1–8 total attempts;
- 1–1440 minute base backoff;
- integer multiplier 1–4;
- capped maximum backoff up to 10080 minutes.

A retry intent is only an inert `proposed_review` record. It is emitted only when:
- latest failure is explicitly retryable;
- attempt budget remains;
- evaluation is still inside original work expiry;
- computed retry eligibility is strictly before original expiry.

The record says `waiting` or `eligible_for_review` from caller-supplied time only.

No timer or retry executor exists.

## Dead-letter review

An inert dead-letter review is emitted for:
- unattempted work whose original window expired;
- non-retryable failure;
- exhausted attempt budget;
- retry eligibility at/after original expiry.

No durable dead-letter row/store is created.

P9.5 does not invent catch-up/backfill or move work into a new P9.1 slot.

## Success / replay

A successful supplied attempt is terminal:
- state `succeeded`;
- no retry;
- no dead letter;
- terminal replay suppressed.

Any later distinct attempt after success fails closed.

## P9.3 no-work semantics

A valid P9.3 `no_work` candidate can be represented for control-plane identity/history purposes.

This does not grant crawl execution authority and no attempt is synthesized.

## Safety

P9.5 keeps false:
- wall-clock/timer/scheduler activation;
- live retry loop;
- durable enqueue/reservation;
- durable dead-letter store;
- worker/batch execution;
- Task #69 packet materialization;
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

Static contracts verify absence of timer/environment/database/network/Task #69/#70 runtime primitives.

## Replit certification

Replit was Git-only fast-forwarded to:
- branch `main`
- HEAD `83334cf68900bf779851f92056dc351811822533`
- tree `3737d643751b0404a4fbd0837626b50eda839d90`
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

P9.5 is unpublished. Production remains the separately certified Task #73 release.

No live retry, queue/DLQ, worker, Task #69/#70, provider/crawl request, credential, persistence, Production DB mutation, provider/public-site mutation, deployment or publication occurred.

## Next boundary

Default next safe boundary: **P9.6 — worker observability and pause/kill controls**.

Generic continuation may model deterministic/default-off worker state, health/observability, pause and kill-switch behavior from supplied/fake state.

It does not authorize a live worker, scheduler, retry loop, queue mutation, provider/crawl request, persistence, database write, mutation or publication.

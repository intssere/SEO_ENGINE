# P9.5 — Failure / Retry / Dead-Letter / Idempotency Controls v1

## Purpose

P9.5 adds a deterministic/default-off control-plane layer for reasoning about failure history over already-proposed P9.1–P9.4 read-work artifacts.

It does **not** add a runtime retry system.

P9.5 accepts caller-supplied synthetic attempt records, validates exact upstream artifact identity, derives stable idempotency identity, suppresses exact duplicate attempt records, classifies bounded failure codes, and emits only inert review artifacts:

- retry review intents; or
- dead-letter review artifacts.

No emitted object is a durable queue row, worker dispatch, retry command, provider/crawl request, Task #69 packet, Task #70 execution, persistence request, or publication authorization.

## Upstream artifact scope

P9.5 accepts exactly four artifact kinds:

1. P9.1 `ReadWorkIntent`
2. P9.2 `FirstPartyRefreshCandidate` bound to its exact P9.1 intent
3. P9.3 `ScheduledCrawlPolicyCandidate` bound to its exact P9.1 intent
4. P9.4 `ExternalIntelligenceRefreshCandidate` bound to its exact P9.1 intent

For P9.2–P9.4, the caller must supply the exact P9.1 intent referenced by the candidate.

P9.5 independently validates:

- P9.1 intent version, lifecycle, safety, work class, IDs, fingerprints, canonical slot/expiry, and deterministic intent fingerprint;
- candidate version, lifecycle, safety and deterministic candidate fingerprint;
- exact candidate ↔ P9.1 schedule/intent/slot/expiry binding;
- selected candidate-specific semantic invariants.

P9.5 does not reopen every raw P2/P5/Task #67/#68 source object. Their exact lineage remains transitively bound by the canonical P9.2/P9.3/P9.4 candidate fingerprints.

## Stable idempotency identity

Every exact accepted upstream artifact receives:

- one artifact-reference fingerprint;
- one idempotency fingerprint;
- one `idk-...` idempotency key.

The identity binds:

- artifact kind/version/ID/fingerprint;
- P9.1 work class;
- schedule ID/fingerprint;
- intent ID/fingerprint;
- original slot;
- original expiry.

Changing exact upstream lineage changes idempotency identity.

No database lock or reservation is created.

## Supplied attempt records

Attempt records are deterministic supplied-data objects only.

Each record binds:

- P9.5 version;
- exact idempotency key;
- sequential attempt number;
- caller-supplied attempt timestamp;
- outcome;
- fixed failure code/class when failed;
- retryable flag derived by P9.5;
- closed P9.5 safety state.

Raw provider/runner error text is intentionally unsupported.

Attempts must:

- start at 1;
- be contiguous;
- have strictly increasing timestamps;
- occur at or after the original P9.1 slot;
- occur strictly before the original P9.1 expiry;
- not be future-dated relative to caller-supplied P9.5 evaluation time;
- stop after a success.

Exact duplicate records for the same attempt number/fingerprint are suppressed and counted.

Conflicting records for the same attempt number fail closed.

## Conservative failure taxonomy

P9.5 automatically marks retryable only explicitly bounded transient/throttled codes:

- `transport_timeout`
- `provider_rate_limited`
- `provider_unavailable`
- `dependency_unavailable`

Everything else is non-retryable by default:

- `runner_failed` → unknown;
- `normalization_failed` → integrity;
- `stale_lineage`;
- `authorization_closed`;
- `invalid_input`;
- `identity_collision`;
- `claim_failed`;
- `manual_intervention_required`;
- `window_expired`;
- `unsupported_operation`;
- `already_consumed`;
- `unknown_failure`.

This is intentionally more conservative than assuming an opaque runner failure is transient.

A future source-specific execution layer may provide a richer reviewed failure mapping, but P9.5 does not infer one.

## Retry policy

The deterministic policy contains:

- `maxAttempts`: 1–8 total attempts;
- `baseBackoffMinutes`: 1–1440;
- integer `backoffMultiplier`: 1–4;
- `maxBackoffMinutes`: capped at 10080 minutes and never below base backoff.

Backoff after attempt N is:

`min(maxBackoffMinutes, baseBackoffMinutes × multiplier^(N-1))`

The arithmetic is deterministic and uses caller-supplied timestamps only.

No timer is started.

## Retry review

A retry review intent exists only when all are true:

- latest supplied attempt failed;
- failure code is explicitly retryable;
- attempt count is below policy maximum;
- caller-supplied evaluation time is still inside the original P9.1 work window;
- calculated next eligible time is strictly before original expiry.

The retry review records:

- same artifact/idempotency identity;
- previous attempt identity;
- next attempt number;
- failure code/class;
- bounded backoff;
- deterministic eligible timestamp;
- original expiry;
- `waiting` or `eligible_for_review` relative to caller-supplied evaluation time;
- lifecycle `proposed_review`.

`eligible_for_review` is not execution authorization.

## Dead-letter review

P9.5 emits an inert dead-letter review when:

- an artifact reaches expiry without any supplied attempt;
- the latest failure is non-retryable;
- attempt budget is exhausted;
- next retry would fall at/after original expiry;
- evaluation occurs after the original expiry with an unresolved retryable failure.

Reasons are explicit:

- `work_window_expired_unattempted`
- `non_retryable_failure`
- `attempt_budget_exhausted`
- `retry_window_expired`

The dead-letter object is not persisted and does not represent a durable DLQ record.

## Success and replay

A supplied successful attempt is terminal.

P9.5 returns:

- state `succeeded`;
- no retry intent;
- no dead-letter review;
- `terminalReplaySuppressed=true`.

Exact duplicate success records are idempotently suppressed.

Any later distinct attempt after success fails closed.

## Original P9.1 work window is authoritative

P9.5 does not create catch-up/backfill semantics.

Retries never extend the original due window.

An expired proposed work item moves to review rather than generating a new slot or silently shifting the schedule.

A future new scheduled slot must come from P9.1/P9.2/P9.3/P9.4 again under its own exact lineage.

## P9.3 no-work candidates

A valid P9.3 `no_work` candidate can be represented by the P9.5 control plane for identity/history consistency.

That representation does not make it executable.

P9.5 has no crawl-execution authority, and no attempt is synthesized automatically.

## Safety capability

P9.5 marks true only deterministic architecture/review properties:

- architecture only;
- deterministic projection only;
- supplied attempt records only;
- retry review only;
- dead-letter review only;
- idempotency projection only;
- exact duplicate attempt suppression;
- conflicting replay fail-closed;
- original work-window preservation;
- non-retryable failure fail-closed.

It explicitly keeps false:

- wall-clock access;
- timer/scheduler activation;
- live retry loop;
- durable enqueue;
- queue reservation/claim;
- durable dead-letter store;
- worker/batch execution;
- Task #69 packet materialization;
- Task #70 execution;
- credential/OAuth use;
- provider/crawl network reads;
- crawl execution;
- observation/evidence persistence;
- Production DB reads/writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

## Task #70 relationship

Task #70 already contains its own separately authorized single-job durable replay lock and terminal execution states.

P9.5 does not import or call Task #70.

P9.5 deliberately treats generic `runner_failed` as unknown/non-retryable and `normalization_failed` as integrity/non-retryable. It does not reinterpret a Task #70 terminal failure as permission for automatic replay.

Future integration would need an explicit reviewed adapter from runtime receipts into P9.5 supplied failure codes plus separate authorization for any live retry worker.

## Tests

The deterministic suite verifies:

- P9.1–P9.4 artifact/idempotency normalization;
- exact candidate ↔ P9.1 binding;
- candidate identity tamper detection;
- transient/throttled-only retry eligibility;
- deterministic/capped backoff;
- retry waiting/eligible review states;
- non-retryable dead-letter review;
- attempt-budget exhaustion;
- retry-window expiry;
- unattempted expiry;
- terminal success/replay suppression;
- exact duplicate attempt dedupe;
- conflicting replay rejection;
- non-contiguous history rejection;
- future-attempt rejection;
- post-success attempt rejection;
- cross-window attempt rejection;
- cross-artifact history rejection;
- bounded policy validation;
- static absence of timer/network/DB/environment/Task #69/#70 execution primitives;
- closed runtime/persistence/mutation/publication capability.

## Runtime / publication boundary

P9.5 is engineering architecture only.

Generic continuation does not authorize:

- retry worker activation;
- durable queue/DLQ persistence;
- provider/crawl requests;
- Task #69 packet construction;
- Task #70 execution;
- credentials;
- database reads/writes;
- evidence persistence;
- mutation;
- deployment;
- publication.

Production remains the separately certified Task #73 application release.

## Next boundary

After P9.5 certification, the next safe roadmap item is **P9.6 — worker observability and pause/kill controls**.

Generic continuation for P9.6 may define deterministic/default-off worker-state, pause/kill and health/observability contracts over synthetic state only. It must not activate a worker, scheduler, retry loop, provider/crawl request, queue persistence, database write, mutation, deployment or publication.

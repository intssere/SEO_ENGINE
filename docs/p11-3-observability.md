# P11.3 — Offline observability contracts, correlation and job health

## Scope

P11.3 adds a deterministic/offline observability foundation over supplied synthetic/local evidence. It covers:

- descriptive metric rollups;
- structured log records;
- trace/span and correlation lineage;
- deterministic alert candidates;
- exact P9.1 scheduler-health evidence;
- exact P9.6 worker-health evidence.

P11.3 does **not** configure or contact a production telemetry vendor, exporter, collector, alert service or incident-management system. It performs no Production DB access, provider request, scheduler/worker activation, deployment or publication.

## Baseline

Canonical implementation baseline:

- GitHub main: `a246f021a1eb0a511d0b27b7a3dbdb8256a77d3a`;
- tree: `2c7ad666e86a13a9de7415d23d1a2f0941b4e015`;
- P11.2 complete/certified;
- final P11.2 post-closeout CI #599 / run `35580110848`: success;
- Replit exact-aligned, `0/0`, clean.

Published production remains the separately certified Task #73 source.

## Existing observability primitives retained

P11.3 does not replace earlier evidence/control layers.

Existing primitives remain authoritative for their scopes:

- API Pino/Pino HTTP logging retains query-string stripping and authorization/cookie/set-cookie redaction;
- P5.8 retains source quality, cost and rate-limit telemetry;
- P9.1 retains deterministic read-schedule evaluation and queue intent projection;
- P9.5 retains failure/retry/dead-letter/idempotency semantics;
- P9.6 retains worker control, heartbeat freshness, kill reconciliation and worker health.

P11.3 composes supplied evidence from those layers without activating any of them.

## Structured observability events

Version `p11.3-observability-v1` normalizes bounded supplied events with:

- event ID and stable SHA-256 fingerprint;
- component and operation;
- kind: HTTP request, job, provider, control or system;
- outcome: success, partial, failure, blocked or skipped;
- severity: debug, info, warn, error or critical;
- canonical UTC `observedAt`;
- optional bounded duration;
- explicit correlation ID;
- exact 32-hex trace ID;
- exact 16-hex span ID and optional parent-span ID;
- bounded scalar attributes only.

Attribute keys that identify likely credentials/secrets are rejected fail-closed, including authorization, cookies, passwords, secrets, tokens, API keys and client secrets.

No free-form payload/body is required by the contract.

Exact replay of one identical event ID dedupes. Reusing an event ID with different content fails closed.

## Metrics

P11.3 derives descriptive rollups by exact component + operation + event kind.

Each rollup may include:

- event count;
- success/partial/failure/blocked/skipped counts;
- arithmetic failure rate;
- supplied-duration count;
- supplied-duration min/max/mean;
- nearest-rank p50/p95 over supplied durations.

These are arithmetic summaries only.

P11.3 does not infer:

- an SLO/SLA;
- production user impact;
- availability or reliability certification;
- Core Web Vitals;
- causal impact;
- a deployment decision;
- a success/failure verdict beyond the explicit supplied event outcomes.

## Structured logs

Every retained normalized event projects to a structured log record with exact:

- timestamp;
- severity;
- component/operation/kind/outcome;
- correlation/trace/span lineage;
- duration when supplied;
- bounded attributes;
- event/log fingerprints.

The P11.3 module does not write those records to a sink. It creates deterministic local records only.

## Trace and correlation integrity

Trace/span lineage is validated before projection.

Rules:

- a span ID is unique inside its trace;
- parent span references must resolve inside the same trace;
- self-parenting is rejected;
- lineage cycles are rejected;
- roots remain the spans whose parent is null;
- trace and correlation ordering/fingerprints are deterministic;
- multiple traces may share one explicit correlation ID.

Trace/correlation summaries are descriptive lineage only. They do not establish causality between operations or outcomes.

## Exact P9.1 and P9.6 evidence binding

P11.3 accepts supplied P9.1 scheduler evidence and supplied P9.6 worker evidence only as an input-plus-projection pair.

Before use, it independently rebuilds:

- the P9.1 queue projection with `buildReadQueueProjection`;
- the P9.6 worker projection with `projectWorkerControlObservability`.

The supplied projection must equal the deterministic rebuild exactly.

Tampered counts, health, fingerprints, lineage or control state fail closed.

P11.3 then exposes bounded job-health context:

### Scheduler

- checked-at time;
- exact projection fingerprint;
- schedules;
- due;
- not started;
- paused;
- missed;
- already materialized;
- intents.

### Worker

- checked-at time;
- exact projection fingerprint;
- effective control mode;
- exact P9.6 health;
- item/control/retry/in-flight/stale-heartbeat/dead-letter/kill-reconciliation counts.

P11.3 does not dispatch an intent, retry work, change control mode, recover killed work or activate a worker.

## Alert candidates

Alert policy is caller-supplied and explicit.

P11.3 can produce local deterministic candidates for:

- metric failure rate;
- missed schedules;
- stale heartbeats;
- dead-letter review;
- unreconciled killed work;
- P9.6 blocked-recovery health.

Threshold ordering must be valid. Critical thresholds cannot be weaker than warning thresholds.

Every alert record is fixed to:

- `lifecycle = candidate_only`;
- `deliveryAuthorized = false`;
- `incidentCreationAuthorized = false`.

There is **no alert delivery**.

P11.3 does not send Slack, email, PagerDuty, webhook or other notifications and does not create/update an incident.

## Safety capability

The P11.3 capability explicitly records:

- deterministic projection only;
- offline only;
- supplied evidence only;
- no wall-clock access;
- no telemetry exporter;
- no telemetry sink;
- no production telemetry ingestion authority;
- no alert delivery;
- no incident creation;
- no scheduler activation;
- no worker activation;
- no retry dispatch;
- no Production DB read/write;
- no credential use;
- no provider/public-site request/write;
- no Task #51/#53/#54 execution;
- no P9.8 implementation;
- no deployment;
- no publication.

## What P11.3 does not claim

P11.3 does not claim that production is currently observable end-to-end.

It does not prove:

- that all production requests emit these events;
- that every job has a live heartbeat;
- that a production log/metric/trace backend is configured;
- that alert delivery works;
- that retention/querying dashboards exist;
- that current production incidents would be detected.

Those require later explicitly authorized runtime configuration, deployment and production certification.

## Implementation

P11.3 adds:

- `artifacts/api-server/src/lib/observability-foundation.ts`;
- `artifacts/api-server/src/lib/observability-foundation.test.ts`;
- `artifacts/api-server/src/lib/observability-foundation-contract.test.ts`;
- this document.

Existing dependencies only. No database migration, lockfile change, telemetry exporter dependency, API route, worker or scheduler activation is required.

## Publication boundary

P11.3 engineering may be merged and Git-synchronized after CI certification.

It does not authorize deployment or publication.


## Certification

P11.3 is complete and certified as a deterministic/offline engineering observability milestone.

- Issue: #348 — `P11.3 — offline observability contracts, correlation and job-health projection`
- Implementation PR: #349 — `P11.3 — offline observability contracts, correlation and job-health projection`
- Base SHA/tree: `a246f021a1eb0a511d0b27b7a3dbdb8256a77d3a` / `2c7ad666e86a13a9de7415d23d1a2f0941b4e015`
- Exact tested implementation head/tree: `350c6463a4466574d181bfe8c543f32fe73eb0ac` / `6759f50bd55bd89409939a275f92cabd7b0dce9c`
- Detached Replit exact-head validation: 12/12 focused P11.3 tests PASS; 1,038/1,038 API tests PASS; API typecheck and `git diff --check` PASS
- Exact-head PR CI: #600 / run `35583135013` — success
- Implementation merge/tree: `e2cd22ae0e8e072be04bb6d31369e27e9f8ee040` / `6759f50bd55bd89409939a275f92cabd7b0dce9c`
- Post-merge main CI: #601 / run `35583379204` — success
- Replit exact Git alignment: same merge/tree, origin/main exact, ahead/behind `0/0`, clean
- Replit validation: 1,194 reported tests passed / 0 failed, full typecheck PASS, full build/P11.1 budget gate PASS, `git diff --check` PASS
- No deployment or publication

P11.3 remains an offline/local-synthetic observability contract and does not certify production telemetry emission, exporter/backend configuration, alert delivery, retention/querying or incident detection.

## Next safe boundary

**P11.4 — backup/recovery and disaster-runbook certification**

Generic continuation may begin with deterministic/offline backup inventory and recovery contracts, synthetic restore/recovery fixtures, integrity verification and disaster-runbook/checklist tests. It does not authorize production backup retrieval/export, production restore/failover, Production DB/storage mutation, secret/runtime/deployment changes, provider/public-site activity, scheduler/worker activation, Task #51/#53/#54 execution, P9.8 implementation/activation, deployment or publication.

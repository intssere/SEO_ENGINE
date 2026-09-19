# P9.3 — Scheduled Full / Incremental Crawl Policy Architecture v1

## Purpose

P9.3 defines a deterministic, default-off policy layer between a P9.1 due crawl-refresh slot and the existing certified P2 crawl artifacts.

It answers one bounded question:

> For this exact due crawl slot and exact certified first-party crawl lineage, should the reviewed policy propose a full reconciliation, a bounded incremental recrawl, or no crawl work?

P9.3 does not execute that decision.

It adds no timer, live scheduler, durable queue, crawler request, sitemap network fetch, worker, retry runtime, observation/evidence persistence, Production DB access, provider/public-site mutation, deployment, or publication.

## Position in the crawl pipeline

The reviewed architecture is:

P2.1–P2.4 exact full-site crawl lineage and certification
→ P2.5 exact crawl-history comparison
→ P2.6 exact bounded incremental recrawl plan
→ P9.1 crawl_refresh schedule / due intent
→ P9.3 crawl-policy review candidate
→ future separately reviewed materialization/runtime boundary

P9.3 deliberately stops before any crawl execution primitive.

## Exact current full-site lineage

Every P9.3 schedule and projection requires an exact current full-site lineage:

- P2.1 crawl controller plan;
- P2.2 sitemap inventory;
- P2.3 full-site execution plan;
- P2.3 checkpoint;
- P2.4 full-site certification.

P9.3 rebuilds the P2.4 certification from the exact plan/inventory/execution-plan/checkpoint tuple and requires byte-equivalent deterministic semantics.

That reconstruction preserves the P2 safeguards, including:

- first-party target only;
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
- closed execution/persistence/scheduler/worker/retry authorization;
- whole-site completion accounting.

A tampered or mismatched current lineage fails closed.

## Exact incremental lineage

Incremental evidence is optional, but when supplied it must contain:

- exact P2.5 before source;
- exact P2.5 after source;
- exact P2.5 comparison;
- explicit P2.6 incremental policy;
- optional explicit trusted candidates;
- exact P2.6 incremental plan.

P9.3:

1. validates the supplied P2.5 comparison;
2. rebuilds that comparison from the exact before/after sources;
3. validates the supplied P2.6 plan;
4. rebuilds that plan from the exact comparison/policy/trusted candidates;
5. requires the P2.6 after inventory/certification to equal the current full-site lineage.

Malformed or inconsistent supplied evidence fails closed.

If incremental evidence is simply unavailable, P9.3 does not guess. A due non-full slot falls back to full reconciliation review.

## P9.1 schedule binding

P9.3 derives a P9.1 crawl_refresh schedule.

The scope fingerprint binds:

- exact site ID;
- exact canonical origin.

The upstream-lineage fingerprint binds:

- explicit P9.3 policy;
- deterministic current crawl-plan fingerprint;
- exact current inventory fingerprint;
- exact current execution-plan fingerprint;
- exact current checkpoint fingerprint;
- exact current certification fingerprint;
- exact P2.5 comparison fingerprint when incremental evidence exists;
- exact P2.6 plan fingerprint when incremental evidence exists.

The caller still supplies:

- schedule key;
- startAt;
- cadence minutes;
- due-window minutes;
- paused state.

P9.3 reads no wall clock.

A material policy or lineage change changes P9.1 schedule identity.

## Full-reconciliation cadence policy

P9.3 adds one explicit bounded policy value:

fullReconciliationEverySlots

Valid range:

- minimum: 1;
- maximum: 720 slots.

The slot index is derived deterministically from the P9.1 start anchor, cadence, and exact due intent slot.

Slot zero is a full-reconciliation boundary.

Thereafter every Nth slot is a full-reconciliation boundary, where N is fullReconciliationEverySlots.

This makes periodic full-site reconciliation explicit and deterministic without introducing a timer or runtime scheduler.

## Selection order

For a P9.1 due slot, P9.3 selects exactly one result in this order.

### 1. Scheduled full reconciliation

If the slot is a configured full-reconciliation boundary:

- selection: full_reconciliation
- reason: scheduled_full_reconciliation

### 2. Current full-site certification is blocked

If the latest exact P2.4 artifact is not whole-site certified:

- selection: full_reconciliation
- reason: current_full_site_not_certified

P9.3 does not use incremental crawling to conceal a broken whole-site accounting state.

### 3. Incremental evidence unavailable

If exact P2.5/P2.6 evidence is absent:

- selection: full_reconciliation
- reason: incremental_evidence_unavailable

### 4. P2.6 requires full reconciliation

P9.3 preserves the exact P2.6 fallback reasons:

- aggregate_regression_without_url_level_evidence
- lineage_change_without_url_level_evidence

When either is present:

- selection: full_reconciliation

P9.3 does not override or weaken P2.6.

### 5. Incremental candidates exist

If exact safe P2.6 evidence has selected URLs:

- selection: incremental
- reason: incremental_candidates_available

The candidate reports only the bounded P2.6 selected/deferred/batch counts.

It does not execute a batch.

### 6. No incremental candidates

If exact safe P2.6 evidence has no selected candidates:

- selection: no_work
- reason: no_incremental_candidates

This is a policy review result, not a durable completion record.

## Due-state semantics

P9.3 delegates timing to P9.1.

Only P9.1 status due can emit one P9.3 candidate.

These states emit no candidate:

- not_started
- paused
- missed
- already_materialized

There is no catch-up/backfill behavior.

## Candidate semantics

A P9.3 candidate has lifecycle:

proposed_review

It binds:

- exact P9.1 schedule and intent IDs/fingerprints;
- exact slot and expiry;
- deterministic slot index;
- site/origin;
- full-reconciliation interval;
- current P2 lineage fingerprints;
- optional P2.5/P2.6 fingerprints;
- policy selection and reason;
- selected/deferred URL counts;
- batch count;
- whether whole-site certification is required;
- immutable closed P9.3 safety state.

The candidate is descriptive only.

It is not:

- a durable queue row;
- a queue reservation;
- a crawl authorization;
- an HTTP request;
- a worker dispatch;
- a retry instruction;
- a persisted job;
- a publication instruction.

## Safety capability

P9.3 marks only architecture/review semantics true:

- architectureOnly
- deterministicProjectionOnly
- firstPartyCrawlPolicyOnly
- materializationReviewOnly
- p2SafetyControlsRequired
- fullReconciliationFallbackPreserved

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

## Tests

The deterministic suite covers:

- stable schedule identity;
- policy and lineage changes altering schedule identity;
- deterministic periodic full-reconciliation slots;
- incremental selection from exact safe P2.5/P2.6 lineage;
- explicit no_work state;
- missing incremental evidence falling back to full reconciliation;
- preservation of the P2.6 lineage-change fallback;
- blocked whole-site certification forcing full reconciliation;
- P9.1 non-due states producing no candidate;
- schedule tamper failure;
- incremental-plan tamper failure;
- bounded full-reconciliation interval validation;
- exact default-off capability state;
- static absence of timer/network/DB/environment/runtime execution primitives.

## Runtime and publication boundary

P9.3 is engineering architecture only.

Generic continuation does not authorize:

- live crawl scheduling;
- a crawl network request;
- sitemap fetching;
- durable materialization;
- worker/retry activation;
- observation/evidence persistence;
- Production DB access;
- provider/public-site mutation;
- deployment or publication.

The separately attested production release remains unchanged unless a later task receives explicit publication authorization.

## Next boundary

After P9.3 is certified, the roadmap next safe boundary is P9.4 — bounded external intelligence refresh.

P9.4 must remain deterministic/default-off on generic continuation and must not treat P9.1 or P9.3 review candidates as runtime authorization.

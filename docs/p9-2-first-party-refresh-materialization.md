# P9.2 — Default-off First-Party Refresh Materialization Review v1

## Purpose

P9.2 defines a pure deterministic review boundary between P9.1 due `signal_refresh` intents and the certified first-party read foundations.

It answers only two questions:

1. does this exact P9.1 due slot bind to one exact first-party Task #67 refresh plan and Task #68 adapter request?
2. does a current source-specific Task #70-compatible runner foundation exist for that exact channel?

It does not create executable work.

P9.2 adds no timer, scheduler process, durable queue row, Task #69 packet, Task #70 call, provider request, credential/OAuth use, observation/evidence persistence, Production DB write, provider/public-site mutation, deployment, or publication.

## Position in the read pipeline

The reviewed architecture is:

`Task #67 source + refresh plan`
→ `Task #68 adapter request`
→ `P9.1 signal_refresh schedule / due intent`
→ `P9.2 materialization review candidate`
→ **future separately reviewed materialization/runtime boundary**

P9.2 deliberately stops before Task #69 and Task #70.

A P9.2 candidate is not:
- a Task #69 packet;
- an authorization string;
- a durable queue reservation;
- a job-row identity;
- a worker dispatch;
- a Task #70 execution request;
- provider runtime readiness.

## Exact lineage validation

P9.2 independently reconstructs and validates:

- Task #66 market identity;
- Task #66 category identity;
- Task #67 source descriptor identity;
- Task #67 refresh-plan ID/fingerprint and exact closed safety state;
- the exact selected Task #67 source/signal item;
- Task #68 request identity and closed safety state by rebuilding the request from the exact source/item/market/category/plan lineage;
- first-party source class;
- P9.1 schedule identity and safety;
- P9.1 schedule → exact first-party scope and upstream lineage binding;
- P9.1 evaluation and due intent.

Tampered source, market, category, plan, request or schedule lineage fails closed.

## Deterministic P9.1 schedule binding

`buildFirstPartyRefreshSchedule()` derives two fingerprints.

### Scope fingerprint

The scope binds:

- exact source ID/fingerprint/key;
- exact market fingerprint;
- exact category fingerprint;
- exact Task #68 signal type.

### Upstream-lineage fingerprint

The upstream lineage binds:

- exact Task #67 plan ID/fingerprint;
- exact Task #68 request ID/fingerprint.

Those fingerprints become the P9.1 `scopeFingerprint` and `upstreamLineageFingerprint` for a `signal_refresh` schedule.

The caller must still explicitly provide:

- schedule key;
- start timestamp;
- cadence minutes;
- due-window minutes;
- paused state.

P9.2 supplies no cadence default and does not read the wall clock.

A material source/market/category/plan/request lineage change changes the schedule identity.

## Supported first-party review channels

V1 recognizes exactly:

- `gsc_search_analytics`
- `analytics`
- `catalog`

All require:
- source class `first_party`;
- trust class `first_party_authoritative`;
- complete provenance;
- manual review;
- collection mode `provider_api`.

Other first-party signals remain outside P9.2.

## GSC Search Analytics

GSC is recognized only when the exact Task #67 source uses the certified Task #71 source key:

`google-search-console-search-analytics`

and the source supports exactly the `keyword` signal for this runner contract.

The review then reports:

`runner_foundation_available`

This means only that the Task #71 source-specific runner architecture exists.

It does **not** mean:
- configured;
- credential-ready;
- OAuth-ready;
- property-ready;
- network-ready;
- Task #70 authorized;
- executable.

Task #72/#73/#75 and Task #70 remain separately authoritative for those states.

## Analytics / GA4

A first-party `analytics` signal can bind to P9.1 and be represented in P9.2, but the current repository has no certified Task #70-compatible source-specific GA4 runner equivalent to Task #71.

The review therefore reports:

- `runner_foundation_unavailable`
- blocker `task70_compatible_analytics_runner_unavailable`

Historical GA4 ingestion/baseline code is not reclassified as a current Task #70 runner.

Future GA4 runner work must preserve the repository's completeness rule: discovery alone does not prove Analytics Data API readiness, and provider failures must be reduced to bounded sanitized categories.

## Shopify catalog

A first-party `catalog` signal can bind to P9.1 and be represented in P9.2, but the current repository has no certified Task #70-compatible source-specific Shopify catalog runner equivalent to Task #71.

The review therefore reports:

- `runner_foundation_unavailable`
- blocker `task70_compatible_catalog_runner_unavailable`

Historical baseline/catalog code is not reclassified as a Task #70 runner.

Future catalog runner work must preserve the repository's completeness rule: a zero/malformed count cannot suppress bounded cursor pagination, and completeness requires observed pagination exhaustion reconciled with the best known total.

## Due-state semantics

P9.2 delegates schedule timing to P9.1.

Only a P9.1 evaluation with state `due` produces one P9.2 review candidate.

These P9.1 states produce no candidate:
- `not_started`
- `paused`
- `missed`
- `already_materialized`

There is no catch-up/backfill behavior.

## Candidate semantics

A due candidate binds:

- exact P9.1 schedule/intent IDs and fingerprints;
- exact slot and expiry;
- exact source ID/fingerprint/key;
- exact market/category/signal scope;
- exact Task #67 plan ID/fingerprint;
- exact Task #68 request ID/fingerprint;
- channel;
- runner-foundation status;
- explicit blockers;
- closed P9.2 safety state.

Candidate lifecycle is:

`proposed_review`

Canonical fingerprints are deterministic and descriptive. They do not create queue identity, execution identity, authorization, priority or provider ordering.

## Safety capability

P9.2 marks only these true:

- `architectureOnly`
- `deterministicProjectionOnly`
- `firstPartyReadOnly`
- `materializationReviewOnly`

It explicitly states:

- runner-foundation availability is not runtime readiness;
- ordering does not imply priority.

P9.2 keeps false:

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
- OAuth use;
- provider network reads;
- observation/evidence persistence;
- Production DB writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

## Tests

The deterministic suite covers:

- exact GSC schedule binding;
- exact Task #67/#68 lineage reconstruction;
- GSC runner-foundation recognition with all runtime gates closed;
- explicit analytics/catalog runner-foundation gaps;
- non-due states producing no candidate;
- material lineage changes changing schedule identity;
- source/plan/request/schedule tamper failure;
- external source rejection;
- unsupported first-party channel rejection;
- malformed GSC contract rejection;
- source-input immutability;
- static absence of Task #69/#70 imports/calls;
- static absence of timer/network/database/environment/persistence primitives.

## Next boundary

After P9.2 is certified, the next roadmap item is P9.3 scheduled full/incremental crawl policy.

P9.2 does not authorize:
- a live schedule;
- durable materialization;
- GSC/GA4/Shopify provider calls;
- credentials or OAuth;
- Task #70 execution;
- persistence;
- Production DB writes;
- deployment or publication.

GA4 and catalog source-specific runner foundations remain explicit prerequisites before those channels could progress toward runtime materialization.

# P10.1 — Unified Change Timeline v1 closeout

## Status

P10.1 is complete as a deterministic/read-only engineering milestone.

It does not activate live timeline loading, attribution inference, Production persistence, provider access, mutation, automation, deployment or publication.

## Canonical implementation record

- Issue: #319 — `P10.1 — Unified change timeline v1`
- Implementation PR: #320 — `P10.1 — unified change timeline v1`
- Base SHA: `621750c172bddef78a30415b6e157f1bc2e3cb8c`
- Base tree: `70a5ede3f9c0cf62fce1738efff12c570a0ae4ae`
- Exact tested PR head: `23d9f97fb3c644f62b41e7b6c8c0cf22c8755fb4`
- Exact tested tree: `f321069813c95546d95ed253119b7bc8d79f2380`
- Exact-head CI: #558 / run `35505049246` — success
- Implementation merge: `779b5a655dd04f60744d24ee373071a6a03dca23`
- Implementation tree: `f321069813c95546d95ed253119b7bc8d79f2380`
- Post-merge main CI: #559 / run `35505161647` — success

## What P10.1 added

The implementation adds:

- `artifacts/api-server/src/lib/unified-change-timeline.ts`
- `artifacts/api-server/src/lib/unified-change-timeline.test.ts`
- `artifacts/api-server/src/lib/unified-change-timeline-contract.test.ts`
- `docs/p10-1-unified-change-timeline.md`

The model has five bounded descriptive event classes:

- opportunity;
- recommendation;
- proposal;
- execution;
- measurement.

Each normalized event can carry only directly supplied facts:

- canonical event timestamp;
- exact source system/version/event ID;
- exact source fingerprint when available;
- exact site identity when supplied;
- opportunity/recommendation/action-plan/proposal/approval/action/deployment/verification/rollback lineage when supplied;
- exact target page/URL/resource/field and before/after fingerprints when supplied;
- query/category association only when supplied;
- terminal/provider-write/verification/rollback/retained-live/manual-intervention/measurement state only when supplied;
- exact supplemental source-lineage references.

Unknown facts stay null.

## Exact P6.7 lineage adapter

P10.1 includes `projectP67OpportunityLifecycleTimelineEvents`.

It independently rebuilds the supplied P6.7 lifecycle report with the certified P6.7 builder before projection. A mismatch fails closed with `p67_lifecycle_integrity_mismatch`.

Only explicit P6.7 lifecycle transition IDs/fingerprints are projected. P10.1 does not fabricate an initial observed transition because P6.7's neutral observed baseline is snapshot state, not a separately persisted first-observed event.

## Replay, conflict and ordering semantics

For one exact `source.system + source.version + source.eventId` identity:

- exact canonical replay collapses;
- differing canonical content fails closed with `timeline_source_event_conflict`.

Supplemental source-lineage references also collapse exact replay and reject conflicting fingerprints for the same lineage kind/ID.

Ordering is strictly:

1. canonical timestamp;
2. fixed event-kind precedence only for equal timestamps;
3. P10.1 event fingerprint.

Ordering does not create score, importance, risk, recommendation priority or execution priority.

## Non-causal guard

P10.1 explicitly records:

- `causalAttributionPerformed=false`;
- `metricMovementAttributedToAction=false`;
- `temporalProximityCreatesLineage=false`;
- `temporalProximityCreatesAttribution=false`;
- `measurementImpactCalculated=false`.

A metric change near an execution event is not treated as evidence that the action caused the metric change.

## Execution and measurement state

P10.1 may describe directly supplied execution history such as:

- action authorized;
- execution reserved;
- provider write accepted;
- provider write outcome uncertain;
- verification passed/failed;
- rollback started/verified/failed;
- manual intervention required;
- verified change retained live.

Uncertain provider-write outcome must keep provider mutation occurrence unknown.

Measurement markers are limited to descriptive eligible/pending/unavailable state. P10.1 does not calculate before/after impact.

## Safety capability

The P10.1 module explicitly keeps all of the following closed:

- wall clock and timer runtime;
- scheduler/live worker/live retry loop;
- database and Production DB reads/writes;
- schema mutation;
- provider network reads;
- provider credentials;
- provider/public-site writes;
- proposal persistence;
- approval grant;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- automatic transition;
- publication.

The static contract test prevents importing the current operational DB loaders or Task #53/#54 mutation runtime into the P10.1 module.

## Replit certification

After GitHub post-merge CI succeeded, Replit was independently verified exact-aligned at:

- branch: `main`
- HEAD: `779b5a655dd04f60744d24ee373071a6a03dca23`
- tree: `f321069813c95546d95ed253119b7bc8d79f2380`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0
- diff against origin/main: zero

Validation on that exact Replit tree:

- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS

Validation used the existing workspace dependencies only; no dependency or lockfile installation/update was performed. No Git sync was required during the resumed closeout because Replit already matched canonical `main`.

No config, secret, database, runtime-setting, deployment or publication change occurred.

## Publication state

P10.1 is unpublished.

The published application remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P10.2 — action-to-page/query/category attribution**

P10.2 should begin by defining deterministic direct-association rules over exact P10.1/source lineage.

It must preserve:

- unavailable association rather than inference;
- no association from timestamp proximity alone;
- chronology vs attribution separation;
- attribution vs causality separation;
- no P9.8 autonomous-mutation implementation;
- no Task #51/#53/#54 execution;
- no provider/public-site write;
- no Production DB mutation or DDL;
- no deployment/publication on generic continuation.

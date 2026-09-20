# P10.2 — Action-to-page/query/category attribution

## Scope

P10.2 adds deterministic, read-only **direct association** from an explicitly identified action to page, query and category facts already present on exact P10.1 events.

It does not implement causal impact attribution.

The module is:

`artifacts/api-server/src/lib/action-attribution.ts`

## Input boundary

P10.2 consumes one supplied P10.1 `UnifiedChangeTimelineReport`.

Before association, it independently rebuilds the P10.1 report with the certified P10.1 builder. The supplied report must match the rebuilt canonical report. Tampered/non-canonical lineage fails closed with:

`p10_1_timeline_integrity_mismatch`

P10.2 adds no Production DB loader or runtime route.

## Exact action join

An event participates in action attribution only when it carries a non-null:

`event.lineage.actionId`

That exact action ID is the only action join key.

P10.2 does not associate an event to an action merely because it shares:

- an opportunity ID/fingerprint;
- a recommendation ID/fingerprint;
- an action-plan ID;
- a proposal fingerprint;
- a URL;
- a timestamp window;
- event ordering.

Events without an explicit action ID do not contribute page/query/category associations to any action.

## Page association

For an exact action-bound P10.1 event, page association may use only:

- `event.target.pageId`;
- `event.target.url`.

At least one must be non-null.

Bounded identity enrichment is allowed only through a direct common identifier:

- same page ID can enrich a missing URL;
- same URL can enrich a missing page ID.

Conflicts fail closed:

- same page ID + different non-null URLs;
- same URL + different non-null page IDs.

A page-ID-only association and URL-only association with no shared identifier remain separate. P10.2 does not guess that they represent the same page.

P10.2 does not infer page identity from resource ID, path text, opportunity title or timestamps.

## Query association

Query association uses only:

`event.associations.query`

Multiple distinct directly supplied query strings for one action are retained as a deterministic set.

P10.2 does not:

- expand semantic synonyms;
- derive queries from opportunity title/rationale;
- import nearby GSC rows;
- treat a same-plan query as action-bound without explicit action ID.

## Category association

Category association uses only:

`event.associations.category`

Multiple distinct directly supplied category strings are retained as a deterministic set.

P10.2 does not infer category from:

- `target.resourceKind`;
- URL path;
- page title;
- collection/product naming;
- query terms;
- opportunity type.

## Provenance

Every page/query/category association retains exact contributing P10.1 provenance:

- P10.1 event ID;
- P10.1 event fingerprint;
- event kind;
- event time;
- source system/version/event ID;
- source event fingerprint when supplied.

Exact provenance replay dedupes deterministically.

## Action lineage integrity

For one exact action ID, these singular lineage facts may enrich null values but cannot conflict:

- site ID;
- site domain;
- opportunity ID;
- opportunity fingerprint;
- recommendation ID;
- recommendation fingerprint;
- action-plan ID;
- proposal fingerprint.

Different non-null values for one action fail closed.

This validation does not create association; it only protects the integrity of already explicit same-action lineage.

## Unavailable semantics

Each dimension has one status:

- `direct`;
- `unavailable`.

If no exact action-bound source event directly supplies a page/query/category value, the dimension stays `unavailable`.

There is no “likely”, “inferred”, “estimated” or confidence-ranked association state in P10.2.

## Determinism

P10.2 deterministically serializes:

- actions by action ID;
- page associations by explicit page identity;
- query/category values lexically;
- provenance by event time and event fingerprint.

Each association, action attribution and report has a stable SHA-256-derived fingerprint.

Shuffling supplied P10.1 event order does not change the P10.2 report identity when the underlying canonical events are unchanged.

## Non-causal interpretation guard

P10.2 explicitly records:

- `directAssociationOnly=true`;
- `explicitActionIdJoinOnly=true`;
- `temporalProximityCreatesAssociation=false`;
- `temporalProximityCreatesCausality=false`;
- `measurementMovementCreatesAssociation=false`;
- `orderingCreatesAssociationStrength=false`;
- `causalAttributionPerformed=false`;
- `impactCalculated=false`.

“Attributed” in P10.2 means **directly associated by exact lineage**, not “caused by”.

## Safety boundary

P10.2 authorizes no:

- Production DB read/write;
- schema mutation;
- provider network read;
- provider credential use;
- provider/public-site write;
- proposal persistence;
- approval grant;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- P10.3 implementation;
- timer/scheduler/worker/retry runtime;
- automatic transition;
- deployment;
- publication.

## Next boundary

P10.3 may later define before/after windows and confounder flags.

P10.2 does not open that boundary automatically and does not interpret association as causal effect.

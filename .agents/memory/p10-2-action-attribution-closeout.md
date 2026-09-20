# P10.2 — Action-to-page/query/category attribution closeout

## Status

P10.2 is complete as a deterministic/read-only engineering milestone.

It does not activate live attribution loading, causal inference, impact measurement, Production persistence, provider access, mutation, automation, deployment or publication.

## Canonical implementation record

- Issue: #322 — `P10.2 — action-to-page/query/category attribution`
- Implementation PR: #323 — `P10.2 — direct action attribution`
- Base SHA: `5046f1ed19fd93bbcee332934efcc9a967fd229c`
- Base tree: `d122b0f80a1789bef6863f3305cc6b5c7a55eacc`
- Exact tested PR head: `4040632c297af50b5a7b49d5bcd1efcdf36bd711`
- Exact tested tree: `99fed5c9fd8dc2df0d72076f0c05e35bde45212d`
- Exact-head CI: #563 / run `35507439693` — success
- Implementation merge: `34eb263c48b2c01920cb23df1b854d7df95b3bea`
- Implementation tree: `99fed5c9fd8dc2df0d72076f0c05e35bde45212d`
- Post-merge main CI: #564 / run `35507555715` — success

## What P10.2 added

The implementation adds:
- `artifacts/api-server/src/lib/action-attribution.ts`
- `artifacts/api-server/src/lib/action-attribution.test.ts`
- `artifacts/api-server/src/lib/action-attribution-contract.test.ts`
- `docs/p10-2-action-attribution.md`

The model consumes one supplied P10.1 timeline and independently rebuilds it before deriving any association.

A mismatch fails closed with:

`p10_1_timeline_integrity_mismatch`

## Exact action join boundary

Only a non-null exact P10.1:

`event.lineage.actionId`

may group events into one action.

P10.2 does not join an event to an action from shared opportunity, recommendation, action-plan or proposal lineage alone.

It also does not join from matching URL, URL path, resource kind, timestamp proximity, event order or measurement movement.

## Page association

Page association consumes only same-action:
- `target.pageId`
- `target.url`

A direct page ID may enrich a missing URL when another same-action event supplies the same page ID and a URL.

A direct URL may enrich a missing page ID when another same-action event supplies the same URL and a page ID.

Conflicts fail closed:
- same page ID with different non-null URLs;
- same URL with different non-null page IDs.

Page-ID-only and URL-only records with no common explicit identifier remain separate.

## Query and category association

Query association consumes only:

`associations.query`

Category association consumes only:

`associations.category`

Multiple distinct directly supplied values are retained as deterministic sets.

P10.2 does not perform semantic query expansion, keyword matching, category taxonomy inference, URL-path classification or confidence weighting.

## Provenance and unavailable state

Every association retains exact P10.1 provenance:
- timeline event ID/fingerprint;
- event kind/time;
- source system/version/event ID;
- source event fingerprint when supplied.

For each action, page/query/category status is either:
- `direct`
- `unavailable`

No “likely”, “estimated” or inferred state exists.

## Singular lineage protection

Within one exact action ID, site/opportunity/recommendation/action-plan/proposal singular lineage may enrich null values.

Different non-null values for the same singular lineage field fail closed.

This protects lineage integrity and does not create additional association.

## Determinism

P10.2:
- is invariant to supplied P10.1 event ordering;
- serializes actions deterministically;
- serializes page/query/category sets deterministically;
- dedupes exact provenance replay;
- fingerprints each association, action attribution and report.

## Non-causal guard

P10.2 explicitly records:
- `directAssociationOnly=true`;
- `explicitActionIdJoinOnly=true`;
- `temporalProximityCreatesAssociation=false`;
- `temporalProximityCreatesCausality=false`;
- `measurementMovementCreatesAssociation=false`;
- `orderingCreatesAssociationStrength=false`;
- `causalAttributionPerformed=false`;
- `impactCalculated=false`.

“Action attribution” here means exact lineage association, not causal effect.

## Safety capability

P10.2 keeps closed:
- Production DB reads/writes;
- schema mutation;
- provider network reads;
- provider credentials;
- provider/public-site writes;
- proposal persistence;
- approval grants;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- P10.3 implementation;
- timers/scheduler/live worker/retry runtime;
- automatic transitions;
- publication.

The static contract test prevents importing current operational DB, measurement loader and mutation runtimes.

## Replit certification

Before PR creation, a detached temporary worktree at exact head/tree passed:
- focused P10.2 unit tests;
- focused P10.2 contract tests;
- API typecheck;
- `git diff --check`.

The original Replit main worktree remained unchanged and clean.

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `34eb263c48b2c01920cb23df1b854d7df95b3bea`
- tree: `99fed5c9fd8dc2df0d72076f0c05e35bde45212d`
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

Validation used existing dependencies only. No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

## Publication state

P10.2 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P10.3 — before/after windows and confounder flags**

P10.3 should begin with deterministic supplied-window membership and explicit confounder flags over exact P10.1/P10.2 lineage.

It must preserve:
- association vs causality separation;
- time-window overlap is not causal evidence;
- unavailable data remains unavailable;
- no P9.8 autonomous-mutation implementation;
- no Task #51/#53/#54 execution;
- no provider/public-site write;
- no Production DB mutation or DDL;
- no deployment/publication on generic continuation.

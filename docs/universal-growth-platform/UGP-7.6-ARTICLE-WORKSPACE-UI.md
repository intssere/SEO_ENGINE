# UGP-7.6 — Article Workspace UI

## Status

IMPLEMENTATION CANDIDATE — CUSTOMER-FACING / READ-ONLY / FAIL-CLOSED / NON-PUBLISHING

## Purpose

UGP-7.6 exposes the article workflow as a customer-facing workspace under:

`/content/articles`

The workspace surfaces:

- research progress;
- sources;
- outline;
- editor;
- claims/citations;
- SEO checks;
- internal links;
- publication state.

It also exposes:

- quality-gate state;
- provenance fingerprints.

## Data-binding boundary

The current customer frontend does not yet have a certified runtime read API for the complete article artifact chain.

UGP-7.6 therefore does not invent article data.

The page currently binds:

`buildArticleWorkspaceModel(null)`

and renders explicit unavailable states for:

- research progress;
- source ledger;
- outline;
- draft;
- claims/citations;
- SEO checks;
- internal links;
- quality-gate result;
- provenance.

Publication is shown explicitly as:

`NOT PUBLISHED`

This is deliberate.

A later bounded read-model/API milestone may supply a frozen `ArticleWorkspaceSnapshot` without changing the workspace safety semantics.

## Frozen snapshot model

When supplied, an article workspace snapshot can expose:

- article ID;
- title;
- target topic;
- research summary and unresolved evidence classes;
- source identities and support tiers;
- ordered outline sections;
- frozen draft body and draft fingerprint;
- claim verification and citation-evidence references;
- SEO/AEO quality results;
- evidence-backed internal-link targets;
- quality-gate status and blocking reasons;
- publication state;
- complete provenance fingerprints.

## Editor

The article editor is currently read-only.

It can display a frozen draft body but does not persist edits.

The UI states:

`Read-only · no persistence · no publish action`

No save/publish mutation is present.

## Deterministic reproduction

The snapshot contract exposes:

`deterministicFromFrozenInputs`

When the upstream artifact chain certifies deterministic reproduction, the workspace can disclose that state.

The UI does not claim determinism when no frozen artifact is bound.

## Provenance

The workspace can expose:

- research-plan fingerprint;
- source-evidence-ledger fingerprint;
- brief fingerprint;
- draft fingerprint;
- quality-gate fingerprint.

This makes the research → sources → outline → draft → quality chain inspectable from one customer workspace.

## Quality-gate separation

The workspace explicitly preserves:

`modelConfidenceIsNotQualityGate = true`

Generation completion, model confidence, quality-gate passage, and publication authority remain separate states.

A passing quality gate may expose `approvalEligible`, but the workspace still does not grant publication authority.

## Publication state

The publication panel remains explicit.

A completed draft or passing quality gate cannot publish content on its own.

The current unbound workspace shows:

`NOT PUBLISHED`

The snapshot type can represent a later published state only when an authorized publishing workflow provides that certified state.

## Closed capabilities

The workspace model permanently declares:

- `networkExecutionEnabled: false`;
- `productionEvidenceReadsAuthorized: false`;
- `persistenceAuthorized: false`;
- `publicationAuthorized: false`;
- `schedulerEnabled: false`;
- `workerEnabled: false`;
- `publicSiteWrites: false`.

The frontend sources contain no direct:

- HTTP fetch;
- WebSocket/EventSource;
- database access;
- environment credential access;
- publication execution;
- scheduler/worker activation.

## Customer routing

The existing Content hub now exposes:

`Article workspace`

with route:

`/content/articles`

and status:

`PREVIEW`

The workspace remains inside the existing Content product domain rather than adding another top-level navigation domain.

## Contract tests

UGP-7.6 tests certify:

- all eight required workspace areas are present;
- quality gate and provenance are present;
- route is mounted under Content;
- no article data is synthesized while unbound;
- editor is read-only;
- publication remains unauthorized;
- quality gate remains separate from model confidence;
- deterministic-reproduction/provenance fields are preserved;
- all execution/persistence capabilities remain closed;
- frontend has no direct network/database/runtime execution primitive.

## Explicit exclusions

UGP-7.6 does not:

- add a live article read API;
- synthesize example article data;
- call article-generation providers;
- edit or persist drafts;
- publish;
- mutate a CMS;
- perform provider writes;
- use production credentials;
- modify Railway;
- deploy;
- activate scheduler/worker/autonomous execution.

## Exit criteria mapping

### Article can be reproduced deterministically from frozen inputs where appropriate

Represented by the frozen snapshot's `deterministicFromFrozenInputs` state and complete provenance fingerprint chain.

### Source/claim provenance is inspectable

Represented by source, claims/citations, and provenance panels.

### Quality gate is separate from model confidence

Explicitly encoded in the model and displayed in the quality-gate panel.

### No article is published solely because generation completed

Publication authority remains false and the unbound UI explicitly shows `NOT PUBLISHED`.

## Follow-on milestone

With UGP-7.6 complete, **UGP-7 Research and Article Engine** is structurally complete.

The roadmap then advances to **UGP-8 — Publishing, internal linking and refresh**, which should introduce publication capability only through separately authorized, approval-aware write contracts.

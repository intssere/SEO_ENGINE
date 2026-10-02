# UGP-7.6 — Article Workspace UI

## Status

IMPLEMENTATION CANDIDATE — CUSTOMER-FACING / BINDING-READY / FAIL-CLOSED / NON-PUBLISHING

## Purpose

UGP-7.6 adds the customer-facing Article Workspace under:

`/content/articles`

The runtime surface exposes the eight roadmap areas:

- research progress;
- sources;
- outline;
- editor;
- claims/citations;
- SEO checks;
- internal links;
- publication state.

The workspace is intentionally truthful when article runtime evidence is unavailable.

## Current runtime state

There is no certified customer read API yet for the complete research → evidence → brief → draft → quality artifact chain.

The runtime page therefore uses the already-shipped `CustomerDomainHub` composition and exposes each required area as an explicit unavailable or preview card.

It does not synthesize:

- research progress;
- source records;
- outline sections;
- article text;
- claim verification;
- citations;
- SEO results;
- internal-link targets;
- publication results.

The publication card explicitly states:

`NOT PUBLISHED`

and:

`Model confidence is not the quality gate.`

The page also states that a completed draft or quality check never publishes content on its own.

## Why the runtime surface is lightweight

The repository has a certified frontend performance budget.

A first implementation rendered the full frozen-snapshot workspace directly in React. Although functionally correct, CI showed that the additional runtime code exceeded the existing aggregate JavaScript budget.

The implementation was therefore reduced instead of raising or weakening the budget.

The final runtime design:

- lazy-loads the Article Workspace route;
- reuses the existing `CustomerDomainHub`;
- adds no new heavy UI dependency graph;
- keeps the richer future binding contract outside the current runtime import graph.

This preserves the existing performance certification boundary.

## Frozen snapshot binding contract

`artifacts/seo-engine/src/lib/article-workspace-model.ts` defines a richer `ArticleWorkspaceSnapshot` for a future certified read-model binding.

It can represent:

- article ID;
- title and target topic;
- research summary and unresolved evidence classes;
- source identity, publisher, support tier, and evidence counts;
- ordered outline sections;
- frozen draft body;
- draft fingerprint;
- deterministic-reproduction state;
- claim text, verification state, and citation evidence IDs;
- SEO/AEO quality results;
- evidence-backed internal-link targets;
- quality-gate state and blocking reasons;
- publication state;
- full provenance fingerprints.

The current runtime page intentionally does not import this model. The contract exists so a later bounded read API can bind real certified artifacts without redesigning the provenance/safety vocabulary.

## Deterministic reproduction

The frozen snapshot contract includes:

`deterministicFromFrozenInputs`

The UI contract may disclose deterministic reproduction only when the bound upstream artifact explicitly certifies it.

The current unbound runtime page makes no deterministic-reproduction claim.

## Provenance

The frozen snapshot contract preserves:

- research-plan fingerprint;
- source-evidence-ledger fingerprint;
- brief fingerprint;
- draft fingerprint;
- quality-gate fingerprint.

This establishes a binding-ready UI contract for inspectable source/claim provenance.

Until the certified runtime read model exists, the customer surface reports those dimensions as unavailable instead of fabricating provenance.

## Editor boundary

The current Editor area is unavailable because no certified draft read/write contract is bound.

The page explicitly states:

`No certified draft is bound. Editing and persistence stay disabled.`

UGP-7.6 does not introduce draft persistence or editing authority.

## Quality-gate separation

The snapshot contract explicitly preserves:

`modelConfidenceIsNotQualityGate: true`

The runtime Publication state also states that model confidence is not the quality gate.

Generation completion, model confidence, quality-gate status, approval eligibility, and publication authority remain distinct states.

## Publication boundary

Publication authority remains closed.

A generated draft or passing quality check cannot publish an article.

Current customer-visible publication state is:

`NOT PUBLISHED`

No publish control or public-site mutation exists in this milestone.

## Closed capabilities

The article workspace model permanently declares:

- `networkExecutionEnabled: false`;
- `productionEvidenceReadsAuthorized: false`;
- `persistenceAuthorized: false`;
- `publicationAuthorized: false`;
- `schedulerEnabled: false`;
- `workerEnabled: false`;
- `publicSiteWrites: false`.

The Article Workspace frontend contains no direct:

- fetch/XMLHttpRequest/WebSocket/EventSource;
- database access;
- environment credential access;
- publication execution;
- scheduler/worker activation.

## Customer routing

The existing Content hub now exposes:

`Article workspace`

at:

`/content/articles`

with status:

`PREVIEW`

The route is lazy-loaded and remains inside the existing Content product domain.

## Contract tests

UGP-7.6 mechanically certifies:

- all eight roadmap areas are present;
- route is mounted under Content;
- route is lazy-loaded;
- runtime article evidence is not synthesized;
- editing and persistence remain unavailable;
- publication remains explicitly not published;
- model confidence remains separate from the quality gate;
- frozen snapshot contract retains deterministic-reproduction and provenance fields;
- execution, persistence, scheduler, worker, and public-site write capabilities remain closed;
- runtime page reuses the existing lightweight composition;
- no direct network/database/runtime execution primitive is introduced.

## Exit criteria mapping

### Article can be reproduced deterministically from frozen inputs where appropriate

The binding contract contains `deterministicFromFrozenInputs` and the complete frozen provenance chain. No claim is made while the workspace is unbound.

### Source/claim provenance is inspectable

The frozen snapshot contract contains source, claim/citation, and fingerprint lineage. The current runtime refuses to display invented provenance until a certified read model is bound.

### Quality gate is separate from model confidence

Explicitly represented in the snapshot model and customer publication-state messaging.

### No article is published solely because generation completed

Publication capability remains closed, and the runtime state explicitly reports `NOT PUBLISHED`.

## Explicit exclusions

UGP-7.6 does not:

- add a live article read API;
- synthesize sample article data;
- call an LLM/provider;
- acquire new research evidence;
- edit or persist drafts;
- publish;
- mutate a CMS;
- perform provider writes;
- use production credentials;
- modify Railway;
- deploy;
- activate scheduler/worker/autonomous execution.

## Follow-on

With UGP-7.6 merged, UGP-7 Research and Article Engine is structurally complete.

The roadmap then advances to **UGP-8 — Publishing, internal linking and refresh**. Publication capability must remain approval-aware and separately authorized.

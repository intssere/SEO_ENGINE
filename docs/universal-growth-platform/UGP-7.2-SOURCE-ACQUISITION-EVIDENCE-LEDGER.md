# UGP-7.2 — Source Acquisition and Evidence Ledger

## Status

IMPLEMENTATION CANDIDATE — CAPTURED ACQUISITION / PURE NORMALIZATION / NO LIVE NETWORK / NO PERSISTENCE

## Purpose

UGP-7.2 turns a certified UGP-7.1 research plan plus already-acquired source observations into a deterministic source/evidence ledger.

It normalizes:

- source identity;
- acquisition provenance;
- publication/update dates where available;
- extracted evidence;
- research-question bindings;
- planned evidence-class bindings;
- claim relevance references;
- explicit source-quality signals;
- deterministic source/evidence/ledger fingerprints;
- required-evidence coverage and unresolved evidence classes.

The implementation intentionally separates **source acquisition capture** from live network execution.

The current contract accepts captured source observations from an authorized caller but performs no HTTP request, provider call, browser operation, database write, or filesystem write itself.

## Version

`ugp-7-2-source-evidence-ledger-v1`

## Input boundary

The builder consumes:

1. one integrity-checked UGP-7.1 `ResearchPlan`;
2. one or more captured source observations;
3. one or more extracted evidence observations.

It refuses free-floating evidence that is not bound to:

- a known captured source;
- at least one exact UGP-7.1 question ID;
- at least one evidence class explicitly required by the certified research plan.

This prevents UGP-7.2 from expanding research scope silently.

## Captured source identity

Each source record includes:

- caller-supplied stable source ID;
- source kind;
- acquisition method;
- observed locator;
- optional canonical locator;
- title;
- publisher where known;
- author where known;
- publication date where available;
- update date where available;
- acquisition timestamp;
- caller-supplied raw/source fingerprint;
- explicit source-quality signals;
- deterministic normalized source-record fingerprint.

URL fragments are removed from URL locators before identity/fingerprinting.

Non-URL locators remain valid opaque captured identifiers.

## Source kinds

The v1 normalized source kinds are:

- `official_primary`;
- `standards_or_regulatory`;
- `first_party_business`;
- `reputable_secondary`;
- `site_content`;
- `search_context`;
- `upstream_certified_evidence`;
- `other`.

A source-kind label is descriptive provenance only.

It does not establish factual truth.

## Acquisition methods

The normalized acquisition methods are:

- `captured_http`;
- `provider_api`;
- `manual_import`;
- `internal_evidence`;
- `other`.

UGP-7.2 records these methods but does not execute them.

`captured_http` therefore means an upstream authorized process captured the source via HTTP; it does not mean this contract performs HTTP.

## Date semantics

Publication and update dates are nullable.

The contract rejects:

- invalid timestamps;
- publication dates after acquisition;
- update dates after acquisition;
- quality flags that claim a publication/update date is available when the corresponding normalized date is absent, or vice versa.

No missing date is fabricated.

## Extracted evidence

Each evidence record includes:

- source ID;
- normalized source-record fingerprint;
- bounded extracted evidence text;
- one or more exact research-question IDs;
- one or more planned evidence classes;
- zero or more externally supplied claim references;
- deterministic evidence ID;
- deterministic evidence fingerprint.

The v1 extracted-evidence limit is 4,000 characters per item.

UGP-7.2 does not claim that extracted evidence is a quotation, complete source representation, or verified fact.

The acquisition layer must preserve any separate legal/copyright handling required by the actual source-fetching implementation.

## Claim relevance

Because UGP-7.1 does not generate article claims, UGP-7.2 does not invent them.

A caller may attach opaque `claimKey` references to extracted evidence using one of:

- `direct`;
- `supporting`;
- `contextual`;
- `not_assessed`.

The ledger stores those relations deterministically.

It does not verify the claim, resolve contradictory sources, or decide that the claim is safe to publish.

Duplicate claim keys on one evidence record fail closed.

## Source quality signals

UGP-7.2 preserves explicit transparent quality signals:

- publisher identity known;
- author identity known;
- publication date available;
- update date available;
- provenance complete;
- first-party or official source;
- independently produced source.

The ledger derives a bounded support tier:

- `insufficient`;
- `limited`;
- `supported`;
- `strong`.

The tier is intentionally simple and explainable.

### Insufficient

Used when provenance is incomplete or publisher identity is unknown.

### Strong

Used when provenance is complete, publisher identity is known, the source is first-party/official, and a publication date is available.

### Supported

Used when provenance is complete, publisher identity is known, the source is independently produced, and at least one publication/update date is available.

### Limited

Used for the remaining provenance-complete cases.

The contract permanently declares:

`sourceQualityDoesNotEstablishTruth = true`

A higher support tier does not mean that every statement in the source is correct.

## Conflicting evidence

UGP-7.2 deliberately allows conflicting evidence records to coexist.

It does not:

- discard the weaker source automatically;
- overwrite one source with another;
- average incompatible claims;
- select a winner;
- treat support tier as truth resolution.

Conflict resolution and claim verification remain downstream responsibilities.

The ledger permanently declares:

`conflictingEvidenceMayCoexist = true`

## Evidence-class coverage

For every evidence class required by the certified UGP-7.1 plan, the ledger emits:

- evidence item count;
- distinct source count;
- `observed` or `missing` status.

It also emits:

`unresolvedEvidenceClasses`

for required classes with no captured evidence.

The ledger never fabricates coverage merely because a source exists.

## Research-plan scope enforcement

Evidence classes not present in `researchPlan.requiredEvidenceClasses` are rejected.

Unknown research-question IDs are rejected.

This keeps the acquired evidence inside the exact certified UGP-7.1 research scope.

A later research-plan revision must produce a new plan fingerprint before evidence for newly introduced classes/questions is admitted.

## Duplicate handling

UGP-7.2 fails closed for:

- duplicate source IDs;
- duplicate raw source fingerprints;
- duplicate normalized evidence fingerprints;
- duplicate claim keys inside one evidence record;
- unknown source references.

It does not silently merge duplicates.

## Determinism

The ledger normalizes and sorts sources and evidence before creating the final result.

Therefore source/evidence input order does not change:

- normalized source records;
- evidence records;
- coverage;
- unresolved evidence classes;
- ledger fingerprint;
- ledger ID.

## Limits

The v1 policy caps:

- sources: 64;
- evidence items: 256;
- evidence items per source: 32;
- question refs per evidence item: 8;
- evidence classes per evidence item: 8;
- claim refs per evidence item: 16;
- extracted evidence text: 4,000 characters.

Exceeding a bound fails closed.

## Provenance

The ledger preserves the complete UGP-7.1 upstream provenance:

- content opportunity model fingerprint;
- content opportunity fingerprint;
- topic clustering fingerprint;
- coverage assessment fingerprint;
- cannibalization assessment fingerprint;
- business relevance evidence fingerprint.

It also binds:

- exact UGP-7.1 plan ID;
- exact UGP-7.1 plan fingerprint;
- exact opportunity ID.

This creates a deterministic chain:

`UGP-6 content intelligence`
→ `UGP-7.1 research plan`
→ `UGP-7.2 captured source/evidence ledger`.

## Safety semantics

Every ledger permanently declares:

- `deterministic = true`;
- `capturedAcquisitionOnly = true`;
- `performsNetworkOperation = false`;
- `performsLiveSourceAcquisition = false`;
- `performsPersistence = false`;
- `extractedEvidenceIsNotVerifiedClaim = true`;
- `conflictingEvidenceMayCoexist = true`;
- `sourceQualityDoesNotEstablishTruth = true`;
- `generatesArticleText = false`;
- `publicationAuthorized = false`;
- `executionAuthorized = false`;
- `providerWrites = false`;
- `publicSiteWrites = false`.

UGP-7.2 cannot authorize:

- live browsing;
- HTTP fetching;
- search/provider calls;
- credential use;
- DB persistence;
- source deletion;
- fact verification;
- claim acceptance;
- brief generation;
- outline generation;
- article drafting;
- publication;
- provider/public-site mutation;
- scheduler/worker/autonomous execution.

## Tests

The synthetic suite verifies:

- captured-source ledger construction;
- URL fragment normalization;
- transparent support-tier derivation;
- unresolved evidence-class preservation;
- multi-class evidence bindings;
- contradictory evidence coexistence;
- unknown research-question rejection;
- unplanned evidence-class rejection;
- duplicate source-fingerprint rejection;
- date-quality signal consistency;
- future publication/update rejection relative to acquisition;
- input-order invariance;
- ledger fingerprint tamper rejection;
- permanently closed/non-authorizing semantics.

## Explicit exclusions

UGP-7.2 does not:

- perform live web search;
- perform live HTTP acquisition;
- use OpenAI;
- use DataForSEO;
- use Google Search Console;
- crawl arbitrary sites;
- persist the evidence ledger;
- run a source-quality ML model;
- resolve contradictory claims;
- determine legal/copyright reuse rights;
- verify claims;
- generate citations;
- generate a brief;
- generate an outline;
- generate article prose;
- publish;
- deploy;
- modify Railway;
- activate scheduler/worker/autonomous execution.

## Follow-on milestone

The next roadmap milestone is **UGP-7.3 — Brief and Outline**.

UGP-7.3 should consume:

- a certified UGP-7.1 research plan; and
- a certified UGP-7.2 source/evidence ledger

to create an evidence-grounded brief and outline.

It must preserve unresolved evidence classes and must not convert extracted evidence into verified claims merely because the ledger contains it.

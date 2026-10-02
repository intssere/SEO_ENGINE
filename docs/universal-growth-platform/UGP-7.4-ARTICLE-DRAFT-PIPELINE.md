# UGP-7.4 — Article Draft Pipeline

## Status

IMPLEMENTATION CANDIDATE — STAGE-BASED / EVIDENCE-BOUND / PROVIDER-NEUTRAL / NON-PUBLISHING

## Purpose

UGP-7.4 converts a certified UGP-7.3 brief plus its exact UGP-7.2 source/evidence ledger into a staged article draft.

The pipeline covers:

- section drafts;
- citation binding;
- fact verification;
- coherence;
- originality;
- additive value;
- brand voice;
- SEO;
- AEO/GEO;
- metadata;
- schema/media planning.

UGP-7.4 does not publish content and does not replace the separate UGP-7.5 quality gate.

## Version

`ugp-7-4-article-draft-pipeline-v1`

## Architectural boundary

UGP-7.4 contains no built-in provider transport.

Instead, callers inject four adapters:

1. section generator;
2. claim verifier;
3. draft evaluator;
4. finishing-asset generator.

The core contract owns:

- exact lineage validation;
- evidence scoping;
- claim/citation validation;
- unresolved-evidence blocking;
- stage ordering;
- normalized outputs;
- deterministic fingerprints;
- closed publication semantics.

An injected adapter may be implemented by a local deterministic fixture, an LLM provider, or another authorized service.

The contract itself does not contain:

- API keys;
- provider credentials;
- provider URLs;
- HTTP clients;
- persistence;
- deployment logic;
- publication authority.

## Inputs

The pipeline requires:

- one integrity-checked UGP-7.3 `ContentBriefOutline`;
- the exact integrity-checked UGP-7.2 `SourceEvidenceLedger` referenced by that brief;
- optional explicit brand-voice evidence;
- four injected adapters.

The brief and ledger must match on:

- ledger ID;
- ledger fingerprint;
- research-plan fingerprint;
- opportunity ID;
- target topic.

Any mismatch fails closed.

## Stage 1 — Section drafts

Each UGP-7.3 outline section becomes one generation request.

The request includes only:

- section heading intent;
- purpose code;
- content goal;
- audience;
- intent;
- evidence admitted to that section;
- claim intents supported by that section evidence;
- evidence-backed entities;
- evidence-backed internal-link targets;
- optional explicit brand-voice profile;
- hard generation constraints.

The hard constraints require the adapter to:

- use only supplied evidence for factual claims;
- reference citations by supplied evidence IDs;
- avoid inventing entities;
- avoid inventing internal links;
- avoid silently resolving unverified claims;
- treat publication as unauthorized.

### Unresolved evidence

If a section has any unresolved evidence class, generation for that section is blocked before the generator is invoked.

The pipeline records:

`blocked_unresolved_evidence`

and the overall draft cannot become complete.

## Stage 2 — Citation binding

A generated section may cite only evidence IDs already assigned to that UGP-7.3 section.

Out-of-scope evidence IDs fail the section.

A generated factual claim must reference evidence that is:

- admitted to the section;
- already attached to that claim intent by UGP-7.3;
- also present in the section citation set.

This prevents a generator from introducing a citation or factual basis that was never admitted by the research chain.

## Stage 3 — Fact verification

Every generated claim use is passed to the injected verifier with:

- claim key;
- generated claim text;
- requested evidence IDs;
- corresponding extracted evidence;
- source IDs;
- source support tiers.

Verification status is normalized to:

- `verified`;
- `unsupported`;
- `conflicting`;
- `not_verified`.

A `verified` result must cite at least one of the claim's admitted evidence IDs.

Evidence from a source with support tier `insufficient` cannot be used to establish a `verified` result.

Any non-verified claim status blocks downstream evaluation and finishing assets.

This is a draft-stage verification result, not the final UGP-7.5 quality gate.

## Stage 4 — Draft evaluation

Only a complete section set with no verification blocker advances to draft evaluation.

The injected evaluator is called separately for:

- coherence;
- originality;
- additive value;
- brand voice;
- SEO;
- AEO/GEO.

Each evaluation must return:

- the exact requested dimension;
- pass/warning/fail;
- score 0–100;
- summary.

A `fail` becomes a draft blocker.

A `warning` is preserved as a warning but does not by itself block the draft.

### Brand voice

UGP-7.4 does not infer a brand voice.

A complete brand-voice stage requires an explicit `BrandVoiceProfile` containing:

- profile ID;
- evidence fingerprint;
- one or more guidelines.

If no explicit profile is supplied, brand-voice evaluation is blocked and the draft cannot reach `draft_complete`.

## Stage 5 — Metadata and schema/media plan

Finishing assets are generated only when:

- every section generated;
- every generated claim use is verified;
- no evaluation dimension failed;
- brand voice is explicitly available and passed/warned.

The finishing-asset adapter returns:

### Metadata

- title;
- meta description.

### Schema plan

- bounded list of schema types.

### Media plan

Each item includes:

- purpose;
- placement;
- source/licensing requirement.

UGP-7.4 creates a plan only.

It does not upload media, create schema markup on a website, or alter metadata in production.

## Draft status

The normalized draft status is one of:

- `draft_complete`;
- `incomplete_evidence`;
- `generation_failed`;
- `verification_blocked`;
- `evaluation_failed`.

`draft_complete` means only that the UGP-7.4 stages completed successfully.

It does **not** mean:

- quality gate passed;
- publication approved;
- page mutation authorized;
- provider write authorized.

## Article body

When every section is generated, the article body is deterministically assembled from the frozen section outputs in section order.

If any section is missing or blocked:

`articleBody = null`

This prevents downstream systems from treating a partial article as a complete draft.

## Determinism

Adapters may be nondeterministic at execution time.

UGP-7.4 therefore makes the narrower, auditable guarantee:

`deterministicGivenFrozenInputsAndAdapterOutputs = true`

Once the certified inputs and returned adapter outputs are frozen, the normalized:

- section records;
- claim-verification records;
- stage records;
- finishing assets;
- article body;
- draft fingerprint;
- draft ID

are deterministic.

This preserves reproducibility without falsely claiming that an external generative model is inherently deterministic.

## Safety semantics

Every result permanently declares:

- `evidenceBound = true`;
- `stageBased = true`;
- `builtInNetworkTransport = false`;
- `providerAdapterInjected = true`;
- `performsPersistence = false`;
- `publicationAuthorized = false`;
- `executionAuthorized = false`;
- `qualityGatePassed = false`;
- `requiresUGP75QualityGate = true`;
- `deterministicGivenFrozenInputsAndAdapterOutputs = true`.

UGP-7.4 therefore cannot by itself:

- use credentials;
- initiate built-in provider HTTP;
- persist a draft;
- mutate a CMS;
- publish an article;
- claim final quality approval;
- activate worker/scheduler/autonomous execution.

## Limits

The v1 contract caps:

- section text: 12,000 characters;
- heading: 240 characters;
- citations per section: 24;
- claims per section: 24;
- metadata title: 120 characters;
- meta description: 320 characters;
- schema types: 12;
- media-plan items: 24.

These bounds are contract limits, not universal editorial recommendations.

## Tests

The synthetic suite verifies:

- successful staged draft completion;
- unresolved-evidence blocking before generator invocation;
- out-of-scope citation rejection;
- claim-verification blocking;
- explicit brand-voice requirement;
- evaluator failure preservation;
- deterministic normalization for frozen adapter outputs;
- fingerprint tamper rejection.

All adapters used in tests are local synthetic functions.

No live provider is called.

## Explicit exclusions

UGP-7.4 does not:

- call OpenAI directly;
- call another LLM provider directly;
- browse;
- acquire new research sources;
- alter the UGP-7.2 ledger;
- silently invent claims;
- silently invent entities or internal links;
- persist article drafts;
- perform CMS writes;
- publish;
- deploy;
- modify Railway;
- activate scheduler/worker/autonomous execution.

## Relationship to UGP-7.5

UGP-7.4 draft evaluation is a generation-stage inspection.

UGP-7.5 remains a separate final quality gate with hard blockers including:

- unsupported important factual claims;
- broken/mismatched citations;
- obvious duplication/cannibalization;
- unsafe/prohibited content;
- missing intent requirements;
- low-value scaled-content patterns.

A UGP-7.4 `draft_complete` result must still pass UGP-7.5 before any later publishing workflow can consider it eligible.

## Follow-on milestone

The next roadmap milestone is **UGP-7.5 — Quality Gate**.

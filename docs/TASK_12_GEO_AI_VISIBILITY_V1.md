# Task #12 — GEO / AI Visibility v1

## Purpose
Provide a provider-neutral, read-only layer for measuring brand visibility and citation behavior across generative search / answer engines.

## Scope
This task normalizes AI-engine observations, preserves model provenance, calculates visibility summaries, and emits deterministic GEO visibility signals. It does not rewrite content, publish pages, or call customer CMS write APIs.

## Observation contract
Every observation records:
- site ID
- provider
- model family
- model version when available
- query/prompt
- location
- language
- observation timestamp
- answer text
- citations with normalized domains
- detected/declared brand mentions
- competitor mentions
- sampling method
- deterministic dedupe key

Model family/version are part of the longitudinal identity so results from materially different model configurations are not silently mixed.

## V1 metrics
- brand mention rate
- target-domain citation rate
- target-domain citation share
- competitor mention share

Metrics are grouped by site, provider, model family, and model version.

## V1 GEO signals
### citation_gap
The engine returned citations, but the target brand/domain was not represented.

### mention_without_citation
The target brand was mentioned but the target domain was not cited.

### competitor_visibility_gap
A configured competitor was mentioned or cited while the target brand/domain was absent.

These are analytical signals, not claims about causal ranking factors.

## Determinism and provenance
- exact duplicate observations are removed by deterministic SHA-256 keys
- duplicate citation URLs are removed
- summaries are grouped by provider/model version
- signals retain source observation dedupe keys
- no hard-coded AI provider/model catalog is required

## Safety invariants
- read-only analytics only
- no prompt-driven content publishing
- no autonomous GEO rewriting
- no Shopify/CMS mutations
- no ranking or citation guarantees
- `PUBLIC_SITE_WRITES_ENABLED=false` remains unchanged

## Deferred work
- live provider adapters and sampling orchestration
- repeated stochastic sampling / confidence intervals
- prompt-set lifecycle management
- citation-position analysis
- page-level retrieval/extractability analysis
- AutoGEO-style controlled rewrite experiments
- downstream opportunity integration

Those belong in later experimentation, action-planning, and learning tasks.

# Task #7 — Evidence Normalizer v1

## Purpose
Convert heterogeneous observations from crawler, GSC, GA4, SEO data providers, policy sources, manual review, and AI visibility into one canonical evidence contract for downstream proprietary engines.

## Canonical fields
- siteId / optional pageId
- source and evidence kind
- normalized observedAt
- confidence in [0,1]
- sanitized payload
- provenance (provider/version/external ref/fetch time/raw type)
- deterministic SHA-256 dedupeKey

## Invariants
1. Same semantic payload with different object-key order produces the same dedupe key.
2. Duplicate batch records are removed deterministically.
3. Secret-like fields are stripped recursively before evidence can be persisted.
4. Confidence is explicit and bounded.
5. Provenance is mandatory and provider-neutral.
6. No action, deployment, CMS mutation, or public-site write exists in this package.

## Default source confidence
- policy: 1.00
- GSC: 0.98
- crawler: 0.95
- GA4: 0.95
- SEO provider: 0.80
- AI visibility: 0.75
- manual: 0.70

These defaults are priors, not truth claims; later tasks may recalibrate them using source quality and observed reliability.

## Safety
`PUBLIC_SITE_WRITES_ENABLED=false` remains unchanged. This task is normalization-only.

# UGP-9.4A — Prospect Qualification Core

Version: `ugp-9-4a-prospect-qualification-v1`

## Purpose

UGP-9.4A adds deterministic, evidence-bound prospect qualification on top of certified UGP-9.3 authority-opportunity discovery.

This increment performs qualification only. It does not discover contacts, draft outreach, send outreach, call providers, persist prospects, schedule work, or mutate customer/public resources.

## Inputs

Qualification requires:

- a validated UGP-9.3A `AuthorityOpportunityDiscovery`;
- the exact UGP-9.1 `BacklinkEvidenceDataset` referenced by that discovery;
- optional explicit qualification signals, keyed by the discovered opportunity fingerprint.

The discovery target domain and current dataset fingerprint must match the supplied backlink dataset exactly.

Unknown or duplicate opportunity signals are rejected.

## Qualification dimensions

Each prospect has transparent component output.

| Dimension | Weight | Source |
| --- | ---: | --- |
| Evidence quality | 20 | Count of certified opportunity evidence fingerprints |
| Source quality | 15 | Provider-native authority normalized only within the current provider metric range |
| Competitor precedent | 15 | Number of competitors already linked from the source domain; only applicable to competitor-backed classes |
| Topical relevance | 20 | Explicit scored evidence only |
| Target-page fit | 15 | Explicit scored evidence only |
| Contactability | 5 | Explicit scored evidence only |
| Risk safety | 10 | Explicit spam/risk evidence, inverted into safety points |

Provider-native authority remains non-cross-provider-comparable.

## Missing evidence

Missing evidence is never silently converted to zero.

Every component is one of:

- `available`;
- `unavailable`;
- `not_applicable`.

Unavailable component points remain `null`.

The prospect result exposes `evidenceCoverage`, calculated as available component weight divided by eligible component weight.

## Score

The visible score is normalized only over available component weight:

`available points / available weight * 100`

This prevents absent evidence from being treated as negative evidence.

The separate evidence-coverage gate prevents a high score on too little evidence from becoming a qualified result.

## Qualification statuses

### qualified_for_review

Requires:

- evidence coverage >= 70%;
- normalized available-evidence score >= 70;
- no hard high-risk signal.

This means qualified for human review only. It does not authorize outreach.

### needs_review

Returned when:

- evidence coverage >= 70%;
- score is below 70;
- no hard high-risk signal.

### insufficient_evidence

Returned when evidence coverage is below 70%.

### disqualified

Returned when explicit spam/risk evidence is >= 0.75 on the normalized 0–1 risk scale.

The hard risk gate overrides otherwise strong scores.

## Risk classes

Explicit spam/risk evidence maps to:

- low: < 0.25;
- medium: >= 0.25 and < 0.60;
- high: >= 0.60.

No risk evidence produces `unknown`.

## Integrity

The result is fingerprinted and can be revalidated against:

- the exact discovery;
- the exact backlink dataset;
- the exact qualification signals.

Integrity validation recomputes the complete qualification result and rejects any score, status, component, evidence, or summary tampering.

## Safety boundary

UGP-9.4A explicitly records:

- deterministic: true;
- evidence bound: true;
- transparent scoring: true;
- prospect qualification performed: true;
- synthetic fallback: false;
- missing evidence scored as zero: false;
- contact discovery performed: false;
- outreach authorized: false;
- live acquisition authorized: false;
- network operation: false;
- persistence: false;
- scheduler: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

This increment cannot create automated reciprocal, purchased, or ranking-manipulation link networks.

## Tests

Tests cover:

1. missing evidence remains unavailable and lowers evidence coverage;
2. strong explicit evidence can qualify only for review;
3. high explicit spam risk hard-disqualifies;
4. competitor precedent is only scored for competitor-backed opportunity classes;
5. signals for unknown opportunities are rejected;
6. result tampering fails integrity validation.

## Next increment

UGP-9.4B may expose this certified qualification model through an authenticated read-only API/customer surface.

That later binding must preserve:

- no synthetic fallback;
- no contact discovery;
- no outreach authorization;
- no provider execution;
- no persistence unless separately designed and approved.

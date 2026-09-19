# P7.4 — Deterministic Citation/Domain/Competitor Comparison v1

## Purpose

P7.4 provides a deterministic descriptive comparison over exact P7.3 supplied-observation records.

It compares:
- explicit tracked-brand mention evidence;
- citation-domain co-occurrence;
- descriptive citation-domain provenance.

It does not score visibility, select a winner, rank competitors, infer market share, fetch citations, mine answer text, or call an AI/provider.

## Exact P7.3 lineage

P7.4 accepts:
- exact P7.3 collection input;
- exact P7.3 collection report;
- explicit caller-supplied comparison groups.

Before comparison, P7.4 rebuilds P7.3 and requires complete canonical equality.

P7.3 reconstruction transitively retains exact P7.2 prompt/topic lineage.

A caller-tampered P7.3 report fails closed.

## Explicit competitor groups only

Each comparison group contains:
- normalized unique `comparisonKey`;
- exact tracked `subjectBrandKey`;
- one or more exact tracked `competitorBrandKeys`.

Every brand must exist in the exact P7.3 tracked-brand registry.

The subject may not appear in its own competitor set.

Repeated competitor references are deduplicated and sorted canonically.

P7.4 never infers competitors from:
- answer text;
- brand labels;
- topic similarity;
- citation domains;
- provider/model identity;
- market/category data;
- external knowledge.

## Positive mention evidence only

P7.3 records explicit positive brand-mention evidence supplied by the caller.

P7.4 therefore compares only that evidence.

For each subject-vs-competitor pair, P7.4 emits:
- observations with explicit subject mention evidence;
- observations with explicit competitor mention evidence;
- observations with explicit mention evidence for both;
- observations with explicit subject evidence and no supplied competitor evidence;
- observations with explicit competitor evidence and no supplied subject evidence.

### Evidence-only does not mean semantic absence

The labels `subjectEvidenceOnlyObservationKeys` and `competitorEvidenceOnlyObservationKeys` refer only to the supplied positive mention records.

They do not mean:
- the other brand is absent from answer text;
- the other brand was not semantically referenced;
- the other brand was not implied.

P7.4 performs no answer-text mining.

Missing supplied mention evidence remains missing evidence, not proof of absence.

## Citation-domain co-occurrence

For every brand side of a pair, P7.4 collects the exact P7.3 citation domains from observations that also carry explicit mention evidence for that brand.

It derives:
- subject-side domain set;
- competitor-side domain set;
- shared domain set;
- subject-side-only domain set;
- competitor-side-only domain set.

This is **observation-level co-occurrence only**.

A domain cited in the same answer observation as a brand mention does not prove:
- the citation supports that brand;
- the citation refers to that brand;
- endorsement;
- association;
- factual support;
- authority;
- trust.

P7.4 does not inspect citation contents.

## Descriptive domain summaries

P7.4 also emits one deterministic summary for every citation domain present in exact P7.3 observations.

Each summary contains:
- domain;
- citation-record count;
- distinct observation count;
- exact citation fingerprints;
- observation keys;
- provider keys;
- prompt keys;
- topic keys.

These are provenance/count summaries only.

They do not produce:
- domain authority;
- trust;
- quality;
- rank;
- recommendation;
- share of market;
- visibility score.

## No competitive winner

P7.4 does not decide that one brand is:
- more visible;
- preferred;
- higher quality;
- more authoritative;
- more competitive;
- winning.

Larger descriptive counts do not automatically imply superiority.

P7.5 owns visibility scoring/history under a separately reviewed contract.

## No cross-provider metric normalization

Provider/model identities remain the opaque caller-supplied P7.3 identities.

P7.4 may expose provider keys in domain provenance, but it does not normalize observations into a cross-provider performance metric.

Counts spanning providers remain descriptive record counts only.

## Determinism

P7.4 deterministically emits:
- domain summary fingerprints;
- subject-vs-competitor pair fingerprints;
- comparison-group fingerprints;
- report counts;
- report fingerprint.

Comparison input order and repeated competitor-reference order do not affect canonical identity.

Canonical comparison ordering uses normalized comparison key.

Canonical competitor ordering uses normalized brand key.

## Bounds

P7.4 v1 bounds:
- comparison groups: 128;
- competitor references per group: 64;
- normalized keys: 96 characters under the established key grammar.

Bounds fail closed.

## Separation from later milestones

P7.4 deliberately does not:
- score AI visibility/history — P7.5;
- generate AI/GEO opportunities — P7.6;
- build the production AI Visibility workspace — P7.7.

## Runtime and safety boundary

P7.4 is pure deterministic engineering over exact P7.3 supplied/synthetic records only.

It adds no:
- route or OpenAPI change;
- live AI/provider request;
- provider credential use;
- answer-text mining;
- citation fetch;
- source admission;
- comparison/domain persistence;
- database read/write/DDL/DML;
- visibility scoring;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

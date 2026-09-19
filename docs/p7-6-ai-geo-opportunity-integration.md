# P7.6 — Deterministic AI/GEO Opportunity Integration v1

## Purpose

P7.6 is the explicit lineage bridge from the certified AI/GEO evidence stack into the existing P6 opportunity system.

It projects caller-requested P7 evidence into exact P6.1 AI opportunity records.

It does **not** automatically turn AI visibility measurements into recommendations or executable work.

## Exact P7.5 lineage

P7.6 accepts:
- exact P7.5 scoring/history input;
- exact P7.5 scoring/history report;
- zero or more explicit integration requests.

Before any opportunity projection, P7.6 rebuilds P7.5 and requires complete canonical equality.

P7.5 reconstruction transitively revalidates exact:
- P7.4 comparison;
- P7.3 answer/mention/citation collection;
- P7.2 prompt/topic definitions.

A tampered P7.5 report fails closed.

## Explicit request required

P7.6 never scans P7.5 scores or history deltas and invents opportunities.

A P6 opportunity exists only when the caller supplies an explicit integration request.

An empty request list returns an empty deterministic integration report.

No score threshold, count, difference or delta creates an opportunity by itself.

## Supported P6 AI opportunity kinds

P7.6 supports only:
- `ai_visibility_gap`;
- `ai_citation_gap`.

Both map to P6 family `ai`.

The kind is caller-selected.

P7.6 validates evidence lineage but does not decide from the source metrics that a “gap” objectively exists.

## Request identity

Each request contains:
- normalized unique `integrationKey`;
- requested P6 AI kind;
- exact caller-supplied opaque P6 `subjectKey`;
- exact P7.5 snapshot fingerprint;
- exact P7.5 score fingerprint;
- exact P7.4 comparison fingerprint;
- optional/required P7.4 pair fingerprint depending on kind;
- bounded exact P7.4 domain-summary fingerprints;
- optional explicit P6 market/category fingerprints.

Duplicate normalized integration keys fail closed.

If two different integration keys would produce the exact same P6.1 opportunity fingerprint, P7.6 fails closed rather than duplicating one opportunity.

## Visibility-gap lineage

For `ai_visibility_gap`:
- exact snapshot is required;
- exact score is required;
- exact score comparison group is required;
- pair fingerprint must be null;
- domain-summary list must be empty.

This prevents a generic visibility request from silently making citation-specific claims.

## Citation-gap lineage

For `ai_citation_gap`:
- exact snapshot and score are required;
- exact comparison group is required;
- exact pair fingerprint is required;
- the pair must involve the exact brand of the selected P7.5 score;
- at least one exact P7.4 domain summary is required;
- every selected domain must appear in that pair's citation-domain co-occurrence evidence.

This is provenance validation only.

It does not mean the domain:
- supports the brand;
- endorses the brand;
- refers to the brand;
- is authoritative or trustworthy.

P7.4's co-occurrence semantics remain unchanged.

## P7.3 observation evidence

P7.6 collects the exact P7.3 observation fingerprints that the selected P7.5 score components already cite as evidence.

It does not add unrelated P7.3 observations.

Those observation refs preserve their exact P7.3 `observedAt` timestamps.

## Derived-artifact timestamps

P7.4 comparison/pair/domain-summary and P7.5 score fingerprints are derived artifacts.

Their P6 evidence refs use `observedAt = null`.

P7.6 does not pretend a derived report fingerprint was itself independently observed at the collection time.

The P6 opportunity reference time is the exact selected P7.5 snapshot collection reference time.

## P6.1 evidence projection

Every projected P6.1 opportunity contains `ai_visibility` evidence refs for:
- exact P7.5 score;
- exact P7.4 comparison;
- exact P7.4 pair when citation-specific;
- selected exact P7.4 domain summaries when citation-specific;
- exact P7.3 observations used by the selected P7.5 score components.

The certified P6.1 maximum evidence bound still applies.

If the complete deterministic evidence set would exceed that bound, P7.6 fails closed.

No evidence is silently dropped to fit the limit.

## P6 scope

P7.6 never maps P7.2 `marketKey` or `languageKey` into P6 market/category scope.

P6 market/category fingerprints are used only when supplied explicitly in the integration request.

If omitted as null, the P6.1 opportunity scope remains null.

## Unscorable P7.5 source

P7.5 null components remain null.

If the selected P7.5 score is unscorable:
- source score remains null;
- exact P7.5 missing component codes remain in P7.6 lineage metadata;
- P6.1 `missingEvidence` receives the deterministic generic code `p7.5.unscorable_score`.

P7.6 never converts an unavailable P7.5 component to zero.

## P7.5 score is not a P6.2 score

This is the most important separation in P7.6.

The P7.5 visibility score is source evidence only.

P7.6 does not:
- call P6.2 scoring;
- copy `score100` into a P6.2 score;
- map P7.5 components to P6 impact/confidence/risk/effort/freshness;
- assign P6 priority;
- generate P6 explanation/actionability.

A projected P6.1 AI opportunity must enter the existing P6 pipeline through its normal contracts if later scoring or governance is desired.

## No recommendation shortcut

A projected P6.1 opportunity does not itself mean:
- recommended action;
- approved action;
- execution priority;
- implementation instruction;
- site mutation.

P6.2–P6.7 remain separate certified stages.

P7.6 performs none of them automatically.

## Determinism

P7.6 deterministically emits:
- normalized request identities;
- exact source lineage;
- exact P6.1 opportunity records/fingerprints;
- integration fingerprints;
- report counts;
- report fingerprint.

Request input order does not affect output identity.

Domain-summary references deduplicate and sort canonically.

## Bounds

P7.6 v1 bounds:
- integration requests: 256;
- domain summaries per request: 32;
- P6.1 evidence refs: existing certified P6.1 limit of 64.

Bounds fail closed.

## Runtime and safety boundary

P7.6 is pure deterministic engineering over exact certified P7 records.

It adds no:
- route or OpenAPI change;
- live AI/provider request;
- provider credential use;
- source admission;
- opportunity persistence;
- score persistence;
- database read/write/DDL/DML;
- P6.2 scoring;
- P6.3 prioritization;
- recommendation generation;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

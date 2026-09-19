# P7.5 — Deterministic AI Visibility Scoring/History v1

## Purpose

P7.5 adds transparent deterministic scoring and in-memory history projection over exact certified P7.3/P7.4 records.

P7.5 does not invent visibility from raw mention/citation/domain counts.

Instead, the caller supplies bounded normalized score components, explicit weights, explicit basis codes and exact P7.3 observation evidence.

P7.5 validates that contract, computes a transparent weighted score when every required component is available, and builds arithmetic history only across exactly comparable scoring scopes.

It performs no live provider call, persistence, ranking, opportunity generation or execution.

## Exact P7.4 lineage

Every scoring snapshot contains:
- exact P7.4 comparison input;
- exact P7.4 comparison report;
- explicit score records.

P7.5 rebuilds P7.4 and requires complete canonical equality.

P7.4 reconstruction transitively revalidates exact P7.3 and P7.2 lineage.

A tampered P7.4 report fails closed.

## Exact scoring scope

Every score binds to one explicit:
- score key;
- P7.4 comparison key;
- P7.3 provider;
- P7.3 model;
- P7.3 tracked brand;
- P7.2 prompt set.

The brand must be part of the selected explicit P7.4 comparison group.

P7.5 derives exact provider/model/brand/prompt-set fingerprints from the certified lineage.

No identity is inferred from labels, answer text, citations, topics or external knowledge.

## Stable comparison frame

P7.4 comparison fingerprints include current evidence and therefore may change between collection snapshots.

For history comparability, P7.5 derives a separate comparison-frame fingerprint from only:
- comparison key;
- exact subject brand identity;
- exact competitor brand identities.

This frame changes if the explicit comparison membership changes, but does not change merely because new supplied observations arrive.

## Explicit weighted components

Each score supplies one or more components.

A component contains:
- normalized unique `componentCode`;
- `weight` in (0,1];
- `value` in [0,1] or null;
- normalized `basisCode` when a value exists;
- exact P7.3 observation fingerprints as evidence.

Weights are rounded to six decimals and must sum to 1 within the fixed six-decimal tolerance.

Component order is canonicalized by component code.

Repeated evidence fingerprints deduplicate and sort.

## Formula

When every component has a numeric value:

`score01 = Σ(weight × value)`

`score100 = score01 × 100`

Both are rounded to six decimals.

The formula is intentionally generic.

P7.5 does not assign hidden semantics to component codes or basis codes.

## Null versus zero

Zero is a valid supplied component value.

Null means the component is unavailable for this score.

If any component is null:
- status is `unscorable`;
- `score01 = null`;
- `score100 = null`;
- missing component codes are listed explicitly.

A null component must have:
- `basisCode = null`;
- no evidence fingerprints.

A non-null component must have:
- a valid basis code;
- at least one exact in-scope evidence observation.

P7.5 never replaces null with zero.

## Evidence binding

Every non-null component evidence fingerprint must identify an exact P7.3 observation inside the score scope.

The observation must match:
- exact provider;
- exact model;
- a prompt included in the exact prompt set.

This prevents a component from silently borrowing evidence from:
- another provider;
- another model;
- another prompt set.

Evidence binding does not mean:
- the observation is correct;
- a citation supports the brand;
- missing mention evidence proves brand absence.

## No automatic score derivation from counts

P7.5 does not turn these P7.3/P7.4 descriptive values into scores automatically:
- answer count;
- mention count;
- citation count;
- domain count;
- subject/competitor comparison counts;
- co-occurrence counts.

If a caller wants one of those facts represented in a normalized component, the normalization must be supplied explicitly under a reviewed basis code.

The normalization itself is outside P7.5 v1.

## Score profile

A deterministic score profile is derived from:
- component codes;
- component weights.

Component values, basis codes and evidence do not alter profile identity.

This permits history comparison only when the scoring formula remains structurally the same.

## History input

P7.5 accepts one or more exact scoring snapshots plus explicit canonical `historyReferenceTime`.

Rules:
- snapshot collection reference times must be unique;
- every snapshot time must be at or before history reference time;
- every snapshot must belong to the same site;
- snapshot input order does not affect identity.

P7.5 uses no wall clock.

History exists only in the returned deterministic report.

It is not persisted.

## Comparable history series

Scores are grouped into one history series only when all of these identities remain exact:
- score key;
- site;
- comparison key/frame;
- provider fingerprint;
- model fingerprint;
- brand fingerprint;
- prompt-set fingerprint;
- score-profile fingerprint.

Changing provider/model, brand definition, prompt-set definition, comparison membership or score profile creates a separate series.

P7.5 never aggregates different providers/models into one normalized winner score.

## History deltas

Each point retains:
- collection reference time;
- exact snapshot fingerprint;
- exact score fingerprint;
- scored/unscorable status;
- score100.

For consecutive points:
- if both are numeric, `delta100 = later - earlier`;
- positive delta → `increased`;
- negative delta → `decreased`;
- zero delta → `unchanged`;
- if either point is unscorable, delta is null and direction is `indeterminate`.

These are arithmetic directions only.

`increased` does not mean improved.

`decreased` does not mean regressed.

P7.5 does not judge quality or business outcome.

## Critical semantic boundaries

P7.5 explicitly records:
- score components are supplied normalized values only;
- raw P7.3/P7.4 counts are not automatic score inputs;
- null remains distinct from zero;
- no cross-provider normalized comparability claim;
- no cross-model normalized comparability claim;
- no provider winner score;
- score does not imply market share;
- score does not imply preference;
- score does not imply rank;
- score does not imply quality;
- score does not imply correctness;
- score does not imply recommendation;
- score does not imply execution priority;
- delta direction does not imply improvement/regression;
- citation co-occurrence does not imply citation support/endorsement;
- missing mention evidence does not prove brand absence;
- no P7.6 opportunity is generated.

## Determinism

P7.5 deterministically emits:
- normalized score components;
- profile fingerprints;
- exact scope fingerprints;
- score fingerprints;
- snapshot fingerprints;
- history points/deltas;
- series fingerprints;
- report counts;
- report fingerprint.

Input ordering of snapshots, scores, components and repeated evidence does not create an implicit ranking.

## Bounds

P7.5 v1 bounds:
- snapshots: 64;
- scores per snapshot: 256;
- components per score: 16;
- evidence observation fingerprints per component: 64;
- normalized keys/codes: 96 characters.

Bounds fail closed.

## Separation from later milestones

P7.5 deliberately does not:
- generate AI/GEO opportunities — P7.6;
- build the production AI Visibility workspace — P7.7.

It also performs no provider selection, live collection, persistence or scheduling.

## Runtime and safety boundary

P7.5 is pure deterministic engineering only.

It adds no:
- route or OpenAPI change;
- live AI/provider request;
- provider credential use;
- source admission;
- score/history persistence;
- database read/write/DDL/DML;
- scheduler/worker/retry behavior;
- AI/GEO opportunity generation;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

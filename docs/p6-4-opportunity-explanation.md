# P6.4 — Deterministic Explanation and Evidence Generation v1

## Purpose

P6.4 turns certified P6.1/P6.2/P6.3 state into a deterministic, auditable explanation projection.

It explains what the existing records and policy layer already say. It does not make a new SEO recommendation, infer a causal outcome, classify actionability, choose a conflict winner, produce a proposed site change, authorize execution, or invoke an AI model.

## Exact lineage requirement

P6.4 accepts:

- the exact P6.3 collection input, containing P6.1 opportunity records and P6.2 scores;
- the exact P6.3 prioritization report for that collection.

Before rendering any explanation, P6.4:

1. re-runs the P6.3 collection policy;
2. requires the complete canonical P6.3 report to match;
3. reconstructs each unique P6.1 record;
4. reconstructs each P6.2 score from the exact P6.1 record and declared components.

Tampered opportunity, score or prioritization output fails closed.

## Explanation item

Each unique P6.3 decision produces one explanation item containing:

- P6.1 opportunity identity: family, kind and opaque subject key;
- exact P6.3 decision state;
- advisory priority rank/tie state when eligible;
- explicit conflict key and suppression metadata when present;
- exact P6.2 score status, score values and formula;
- all five P6.2 components and their basis codes;
- exact P6.1 evidence cards;
- exact P6.1 missing-evidence codes;
- exact P6.1 semantic guards;
- deterministic explanation statements.

The explanation item itself has a deterministic fingerprint.

## Fixed deterministic templates only

P6.4 v1 uses fixed English templates.

There is no freeform model or language-model inference. Templates describe only recorded state such as:

- P6.3 eligibility/suppression/rank;
- P6.3 explicit-conflict policy outcomes;
- P6.2 score/formula/component values;
- P6.1 missing-evidence codes;
- P6.1 semantic guards.

The templates do not state that an opportunity will improve traffic, revenue, rankings or any other outcome.

They do not produce "should" / recommendation language or an actionability state.

## Exact score-evidence binding

For each non-null P6.2 component, the explanation statement carries the exact evidence fingerprints declared by that component.

P6.4 does not add a fingerprint that P6.2 did not cite.

For a null component:

- the statement says the component is unavailable;
- the evidence-basis list is empty.

The overall score statement may carry the deterministic union of the component basis fingerprints, but component-level evidence remains independently visible.

## Evidence cards

Every exact P6.1 evidence reference becomes one evidence card with:

- evidence kind;
- fingerprint;
- source key when present;
- observed time when present;
- market/category fingerprints when present;
- `usedByScoreDimensions`.

`usedByScoreDimensions` is only a reverse lookup of P6.2's explicit component basis. It does not infer relevance for dimensions that did not cite that fingerprint.

Evidence that exists on the P6.1 opportunity but is not cited by a P6.2 component remains visible with an empty dimension list.

## P6.3 decision explanation

P6.4 mirrors P6.3 rather than re-running a different decision rule.

Eligible rows retain:

- the exact P6.3 advisory rank;
- the exact P6.3 tie count.

Suppressed rows retain exact P6.3 system reasons:

- `explicit_suppression`;
- `unscorable_score`;
- `conflict_lower_score`;
- `conflict_top_score_tie`.

An equal-top explicit conflict remains unresolved. P6.4 never uses explanation order, opportunity fingerprint, family, kind or subject text to invent a winner.

## Missing evidence

P6.1 missing-evidence codes are projected explicitly.

P6.4 does not:

- synthesize missing evidence;
- treat missing evidence as zero;
- silently omit it from the explanation.

## Semantic guards

P6.4 renders fixed descriptions of P6.1 semantic guards while preserving their exact guard codes.

In particular:

- null remains distinct from zero;
- provider-native keyword difficulty is not cross-provider comparable;
- trend values remain request-frame relative and not absolute demand;
- trend frames are not silently compared;
- backlink authority remains provider-native/non-comparable;
- competitor visibility is not market share;
- gap evidence is not a recommendation by itself;
- source telemetry is descriptive only and does not control refresh/execution;
- missing evidence is not fabricated.

P6.4 performs no provider-native normalization or cross-provider comparison.

## Determinism

P6.4 has deterministic:

- statement fingerprints;
- explanation-item fingerprints;
- report fingerprint;
- item order inherited from canonical P6.3 decision serialization.

Exact input order and exact duplicate ordering cannot change the explanation report identity.

P6.3 serialization order for equal values does not become an additional P6.4 preference.

## Separation from later milestones

P6.4 deliberately does not:

- classify `informational / recommend / approval / blocked` — P6.5;
- produce current-vs-proposed implementation previews/diffs — P6.6;
- infer opportunity lifecycle/history/supersession — P6.7.

It also does not create execution plans or authorization.

## Runtime and safety boundary

P6.4 is pure deterministic engineering only.

It adds no:

- route or OpenAPI change;
- provider request or credential use;
- AI/LLM request;
- source admission or refresh-plan mutation;
- observation/evidence/score/priority/explanation persistence;
- database read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry behavior;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

# P6.3 — Conflict, Dedupe, Suppression and Prioritization v1

## Purpose

P6.3 adds deterministic collection policy over exact P6.1 opportunities and exact P6.2 scores.

It answers four bounded collection questions:

1. are two supplied rows exact duplicates?
2. has the caller explicitly suppressed a candidate?
3. has the caller explicitly declared candidates mutually exclusive?
4. which remaining candidates have higher canonical P6.2 scores inside one coherent collection snapshot?

P6.3 does **not** generate recommendations, infer action conflicts from prose/subjects, classify actionability, authorize execution, persist priority, or change any provider/site/runtime state.

## Collection coherence

One P6.3 report is a homogeneous comparison frame.

Every unique candidate must have the exact same:

- P6.1 `referenceTime`;
- market fingerprint;
- category fingerprint.

A mixed reference-time or mixed-scope collection fails closed.

This prevents scores from different snapshots/scopes from being silently treated as one comparable priority queue.

## Exact P6.1 / P6.2 integrity

Each candidate is revalidated before collection policy runs.

P6.3 reconstructs the P6.1 record and requires the complete canonical record to match.

It then reconstructs P6.2 from that exact opportunity plus the supplied score components and requires the complete canonical P6.2 score output to match.

Tampered opportunity or score output therefore fails closed.

## Dedupe

P6.3 performs **exact duplicate collapse only**.

Two rows collapse when they have the same P6.1 opportunity fingerprint and identical:

- P6.2 score fingerprint;
- normalized conflict key;
- normalized explicit suppression codes.

If the same opportunity fingerprint appears with different score or policy metadata, the collection fails closed with a duplicate metadata conflict.

P6.3 does not infer that same-subject opportunities with changed evidence are old/new versions. P6.7 owns lifecycle/history and supersession.

## Explicit suppression

The caller may attach up to eight normalized suppression codes to a candidate.

Examples are policy/audit labels such as `policy.manual_exclude`; P6.3 does not assign business meaning to the code.

A candidate with at least one explicit suppression code:

- remains present in the report;
- has status `suppressed`;
- keeps the explicit codes;
- receives no priority rank.

This is an auditable exclusion, not deletion.

A P6.2 `unscorable` candidate is also suppressed from ranking. P6.3 never invents a replacement score.

## Explicit conflict keys

P6.3 does not infer mutual exclusion from:

- family;
- kind;
- subject key;
- shared evidence;
- similar text.

Mutual exclusion exists only when the caller gives candidates the same normalized `conflictKey`.

Only candidates not already suppressed/unscorable participate actively in that conflict.

### Unique highest score

If an active conflict group has more than one candidate and exactly one candidate has the highest P6.2 `score100`:

- that candidate remains eligible;
- lower-scored active members are suppressed with `conflict_lower_score`.

### Equal highest score

If two or more active candidates tie at the highest score:

- P6.3 does not use opportunity fingerprint, insertion order, family or kind to invent a winner;
- all tied top members are suppressed with `conflict_top_score_tie`;
- lower-scored active members are suppressed with `conflict_lower_score`;
- the conflict group is reported as `unresolved_top_tie`.

A later human or explicitly designed policy may resolve that ambiguity. P6.3 v1 does not.

## Priority ranking

After exact dedupe, explicit suppression, unscorable suppression and explicit-conflict handling, remaining candidates are eligible.

Eligible candidates are sorted by canonical P6.2 `score100` descending and receive a **dense priority rank**.

Example scores:

- 80 → rank 1
- 80 → rank 1
- 55 → rank 2
- 20 → rank 3

Equal scores outside a conflict remain co-equal. Fingerprint ordering is used only to serialize equal-score rows deterministically; it is explicitly **not** a preference or winner.

Priority is advisory collection ordering. It is not:

- execution order;
- authorization;
- actionability;
- a scheduler instruction;
- a provider-write queue.

## Semantic preservation

P6.3 consumes only canonical P6.2 scores and preserves the P6.1/P6.2 boundaries.

It does not compare raw provider-native keyword difficulty, trend indices, backlink authority, competitor visibility or telemetry across incompatible providers/frames.

P6.1 semantic guards remain part of the underlying opportunity records.

## Separation from later milestones

P6.3 deliberately does not:

- generate explanatory/recommendation text — P6.4;
- classify informational/recommend/approval/blocked actionability — P6.5;
- generate current-vs-proposed previews — P6.6;
- infer lifecycle/supersession/history — P6.7.

## Safety boundary

P6.3 is pure deterministic engineering only.

It adds no:

- route or OpenAPI change;
- provider request or credential use;
- source admission or refresh-plan mutation;
- observation/evidence/score/priority persistence;
- database read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry behavior;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

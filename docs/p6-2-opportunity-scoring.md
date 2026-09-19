# P6.2 — Opportunity Scoring v1

## Purpose

P6.2 adds a transparent provider-neutral scoring kernel over exact P6.1 unified opportunity records.

It scores **one opportunity at a time**. It does not rank a collection, choose a winner, generate a recommendation, classify actionability, authorize execution, persist a score, or alter the legacy opportunity engine.

## Dimensions

Every component is normalized to the closed interval `[0,1]` by an upstream family-specific adapter.

| Dimension | Meaning of 0 | Meaning of 1 | Direction |
|---|---|---|---|
| impact | no supported upside | maximum supported upside in the adapter's bounded frame | benefit |
| confidence | unsupported/lowest confidence | strongest supported confidence | benefit |
| risk | lowest supported downside/uncertainty | highest supported downside/uncertainty | penalty |
| effort | lowest supported implementation cost/complexity | highest supported cost/complexity | penalty |
| freshness | stalest supported evidence | freshest supported evidence | benefit |

P6.2 does not manufacture these normalized inputs from provider-native values. Family-specific adapters remain responsible for defensible normalization and must preserve P6.1 semantic guards.

## Exact formula

The raw score is:

`score01 = impact × confidence × freshness × (1 - risk) × (1 - effort)`

The display-scale score is:

`score100 = score01 × 100`

Both are deterministic and rounded to six decimal places.

Risk and effort remain visible as raw components. Their multiplicative retention modifiers are also emitted:

- `riskRetention = 1 - risk`
- `effortRetention = 1 - effort`

This avoids relabeling a high-risk or high-effort value as though it were itself beneficial.

## Null versus zero

Null and zero are intentionally different.

- `0` is a real normalized value and may produce a valid combined score of zero.
- `null` means the dimension is unavailable/unscorable.
- if any required dimension is null, `score01` and `score100` are null and the record is `unscorable`.
- P6.2 never substitutes a neutral/default value for a missing dimension.

## Evidence binding

Every non-null component must provide:

- a normalized basis code;
- at least one evidence fingerprint;
- no more than 32 evidence fingerprints.

Every basis fingerprint must exist on the exact P6.1 opportunity record being scored. Basis fingerprints are deduplicated and sorted before hashing, so irrelevant input ordering cannot change score identity.

A null component must provide neither a basis code nor evidence fingerprints.

## P6.1 integrity

P6.2 reconstructs the supplied P6.1 opportunity using the P6.1 normalizer and requires the canonical opportunity ID/fingerprint to match. A tampered subject, evidence set, scope, kind/family, reference time, missing-evidence set, or legacy mapping therefore fails closed instead of being silently rescored.

## Preserved upstream semantics

P6.2 inherits P6.1 semantic guards and does not reinterpret them.

In particular:

- provider-native keyword difficulty is not cross-provider comparable;
- trend values are request-frame relative, not absolute demand, and different trend frames are not silently compared;
- backlink authority remains provider-native/non-comparable across providers;
- observed competitor visibility is not market share;
- gap evidence is not a recommendation by itself;
- P5.8 source telemetry is descriptive and does not control refresh/execution;
- null remains distinct from zero;
- missing evidence is not fabricated.

A component adapter may normalize evidence only inside a defensible bounded frame. P6.2 itself performs no provider-native cross-comparison.

## Separation from later P6 milestones

P6.2 deliberately does not:

- sort/rank/prioritize opportunities — P6.3 owns conflict/dedupe/suppression/prioritization;
- generate narrative recommendations/explanations — P6.4 owns explanation/evidence generation;
- decide informational/recommend/approval/blocked actionability — P6.5 owns that classification;
- generate current-vs-proposed previews — P6.6 owns previews/diffs;
- manage lifecycle/history — P6.7 owns lifecycle/history.

## Legacy compatibility

The pre-existing opportunity engine keeps its current `{ demand, proximity, confidence, evidence }` score and existing risk/confidence semantics. P6.2 does not mutate or replace it.

## Runtime and safety boundary

P6.2 is pure deterministic engineering only.

It adds no route, OpenAPI change, provider request, credential use, database read/write/DDL/DML, persistence, source admission, refresh-plan mutation, Task #64/#70 execution, scheduler, worker, retry loop, provider/public-site write, automatic transition, deployment, or publication.

Generic continuation remains engineering-only and default-off.

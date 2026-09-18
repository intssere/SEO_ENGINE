# P5.8 — Source Quality / Cost / Rate-Limit Telemetry Closeout

P5.8 is complete under issue #240 / PR #241.

## Purpose

P5.8 adds deterministic source/provider telemetry over supplied Task #67 source descriptors, the existing dated P5.1 provider review, supplied telemetry events and supplied rate-limit snapshots.

It performs no live collection.

## Canonical implementation

Files:
- `artifacts/api-server/src/lib/source-telemetry.ts`
- `artifacts/api-server/src/lib/source-telemetry.test.ts`
- `docs/p5-8-source-quality-cost-rate-limit-telemetry.md`

Version:
- `p5.8-source-telemetry-v1`

## Stream identity

A P5.8 telemetry stream is exactly:
- Task #67 source fingerprint;
- signal type;
- optional P5.1 provider key.

Only one provider binding is allowed per source/signal stream in one report.

Provider binding is descriptive lineage only. It does not admit the source into Production collection.

## Source identity validation

Every supplied Task #67 descriptor is reconstructed through `normalizeSignalSourceDescriptor()`.

The rebuilt Task #67 source ID and fingerprint must exactly match the supplied descriptor.

P5.8 therefore fails closed if telemetry is attached to a source whose source-registry identity has drifted.

## Quality telemetry

P5.8 preserves Task #68 outcome semantics:

- success: completeness exactly 1;
- empty: completeness exactly 1;
- partial: completeness 0.01–0.99;
- error: completeness exactly 0.

Confidence is derived consistently with Task #68:

- success / empty: Task #67 configured source quality;
- partial: source quality × completeness × 0.9;
- error: 0.

Positive evidence is true only for success/partial.

Per stream P5.8 exposes:
- event count;
- success / partial / empty / error counts;
- success rate;
- usable rate = success + partial;
- error rate;
- mean completeness;
- mean confidence;
- positive-evidence count/rate;
- configured Task #67 source quality.

P5.8 does not convert those values into a proprietary source rank or P6 opportunity score.

## Cost telemetry

Numeric cost exists only when explicitly supplied on telemetry events.

P5.8 supports:
- monetary amount + currency;
- billing-unit amount + unit label;
- both together;
- explicit zero values.

Rules:
- null != zero;
- amount/currency are paired;
- billingUnits/billingUnit are paired;
- empty cost records are rejected;
- negative values are rejected;
- mixed currencies in one stream are rejected;
- mixed billing-unit identities in one stream are rejected;
- no FX conversion;
- no numeric spend derived from P5.1 prose pricing.

Per stream P5.8 exposes:
- any-cost event coverage;
- monetary coverage;
- total supplied monetary amount;
- currency;
- billing-unit coverage;
- total supplied billing units;
- unit label;
- monetary cost per usable observation only when monetary coverage is complete.

## P5.1 provider metadata

For provider-bound streams, P5.8 joins only the canonical P5.1 provider-review snapshot.

It carries:
- provider key/name;
- pricing model;
- relative cost class;
- reliability evidence class;
- reviewedAt;
- reReviewAfter;
- fresh/stale review state;
- exact P5.1 review fingerprint.

No provider pricing research or network request occurs in P5.8.

## Rate-limit telemetry

Supplied snapshots may contain:
- capacity limit;
- remaining capacity;
- window seconds;
- optional reset timestamp;
- bounded scope label.

Capacity fields are all-present or all-null.

When present:

`utilization = (limit - remaining) / limit`

Descriptive state:
- unavailable: capacity absent;
- available: utilization < 0.50;
- elevated: 0.50–<0.85;
- constrained: utilization >=0.85 with remaining >0;
- exhausted: remaining = 0.

Latest snapshot selection is deterministic by newest capturedAt with snapshot fingerprint as tie-breaker.

These states do not throttle, schedule, retry, execute or reorder Task #67 refresh work.

## Diagnostics

Per-stream deterministic diagnostics:
- `no_events`
- `cost_unavailable`
- `cost_partial_coverage`
- `rate_limit_unavailable`
- `provider_review_stale`

Diagnostics are descriptive only.

## Bounds

Hard v1 bounds:
- max 50 Task #67 sources;
- max 200 streams;
- max 5,000 telemetry events;
- max 2,000 rate-limit snapshots;
- max 500 events per stream;
- max 200 rate-limit snapshots per stream.

Duplicate source descriptors, bindings, event IDs/fingerprints and snapshot IDs/fingerprints fail closed.

## Determinism

The final report fingerprint binds:
- explicit reference time;
- exact P5.1 review fingerprint/state;
- Task #67 source fingerprints;
- deterministic stream identities;
- quality summaries;
- cost summaries;
- rate-limit summaries;
- provider metadata;
- diagnostics.

Irrelevant array ordering does not change the report identity.

## Tests

Synthetic tests cover:
- complete-cost DataForSEO-bound SERP-like stream;
- partial-cost SerpApi-bound stream;
- explicit zero cost vs null cost;
- available/elevated/constrained/exhausted/unavailable rate states;
- deterministic newest-snapshot selection;
- stale future P5.1 review;
- provider-unbound stream;
- no-event stream;
- input-order invariance;
- fail-closed source identity/completeness/currency/binding/rate-capacity contradictions;
- closed runtime/persistence/publication gates;
- static rejection of network/environment/database/execution/scheduler primitives.

## Certification

Baseline:
- SHA `cce0217f3c3c8158ae3a7f6836244eba39db8a74`
- tree `6ad6ed0486e743cc491d65f80c5ac857b5718b65`

Issue:
- #240

Implementation PR:
- #241

Exact tested implementation head:
- `24a28000e11bf9de67313904652a4fc65b48927b`

PR CI:
- CI #446 / run `35396675109`
- success across:
  - legacy PostgreSQL schema validation;
  - Task tests;
  - P3.6 migration tests;
  - all current workspace tests including P5.8;
  - Playwright/P4.10 browser suite;
  - typecheck;
  - build.

Implementation merge:
- SHA `56b2f8e9dd4e6cc4934c2ab55c549ea6284d59d3`
- tree `f3d749819741d502e42c4059798109bc05b0b770`

Post-merge:
- CI #447 / run `35396903363`
- success across the full matrix.

## Replit certification

Replit was Git-only fast-forward synchronized after post-merge CI.

Certified implementation state:
- branch `main`
- HEAD `56b2f8e9dd4e6cc4934c2ab55c549ea6284d59d3`
- tree `f3d749819741d502e42c4059798109bc05b0b770`
- origin/main exact same SHA/tree
- ahead/behind `0/0`
- index/worktree clean
- untracked 0

Non-browser validation:
- `pnpm -r --if-present test`: passed
- `pnpm typecheck`: passed
- `pnpm build`: passed
- `git diff --check`: passed

The build retained the existing non-fatal chunk-size warning.

GitHub Actions Ubuntu/Chromium remains the canonical browser certification environment.

## Safety boundary

P5.8 hard-codes:
- deterministic reporting only;
- supplied telemetry only;
- P5.1 provider-review join only;
- no live provider reads;
- no provider credential use/mutation;
- no Task #67 source admission;
- no Task #67 refresh-plan reordering;
- no runtime rate-limit enforcement;
- no Task #64 execution;
- no Task #70 execution;
- no observation/evidence persistence;
- no DB reads/writes/schema mutation;
- no scheduler/batch/worker/retry;
- no provider/public-site writes;
- no publication;
- no automatic transition.

## Publication state

P5.8 was not published.

Production remains the separately certified Task #73 application release.

## Next safe boundary

The P5 external market/search intelligence engineering phase is now complete through P5.8.

The default next safe milestone is **P6.1 — unified opportunity types across technical/content/query/competitor/link/AI**.

Generic `continue` may advance only default-off deterministic opportunity-type engineering. It does not authorize live provider/public-site reads/writes, credentials, source admission, Task #64/#70 execution, persistence, Production DB activity, scheduler/worker activation, secret/config changes or publication.

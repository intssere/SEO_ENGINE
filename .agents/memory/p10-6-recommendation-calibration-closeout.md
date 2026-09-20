# P10.6 — Recommendation calibration / learning signals closeout

## Status

P10.6 is complete as a deterministic/read-only engineering milestone.

It does not activate recommendation persistence/update, reward scoring, model training/fine-tuning, model weight changes, ranking/policy mutation, live outcome loading, Production persistence, provider access, autonomous execution, deployment or publication.

## Canonical implementation record

- Issue: #334 — `P10.6 — recommendation calibration and learning signals`
- Implementation PR: #335 — `P10.6 — recommendation calibration and learning signals`
- Base SHA/tree: `73c7cbad06fe917d790ecd142bfef2210b27a064` / `2d388b480b99c4cf338a52b0b95853847cba4e87`
- Exact tested PR head/tree: `e0dbd4d6fd01a6043bfb1b164c3c0a9d23fff25a` / `00fe887aefa4a607cc26ec622d47ba9126ef68fb`
- Exact-head CI: #579 / run `35516046746` — success
- Implementation merge/tree: `255ec1058a01bf20f0db0e04f45d1c981b7c2ac6` / `00fe887aefa4a607cc26ec622d47ba9126ef68fb`
- Post-merge main CI: #580 / run `35516171732` — success

## What P10.6 added

The implementation adds:
- `artifacts/api-server/src/lib/recommendation-calibration.ts`
- `artifacts/api-server/src/lib/recommendation-calibration.test.ts`
- `artifacts/api-server/src/lib/recommendation-calibration-contract.test.ts`
- `docs/p10-6-recommendation-calibration.md`

P10.6 consumes one supplied P10.5 input/report pair plus caller-supplied calibration definitions.

Before any P10.6 projection, the P10.5 report is rebuilt from the supplied P10.5 input and must match exactly. P10.5 rebuilds P10.4, which verifies the earlier P10.1→P10.3 chain, so P10.6 preserves that lineage rather than introducing a weaker path.

## Exact recommendation subject

P10.6 resolves the calibration subject only from P10.1 events whose exact `lineage.actionId` equals the P10.5 treatment action.

Same-action lineage requires:
- non-null recommendation ID;
- non-null SHA-256 recommendation fingerprint.

Recommendation identity may not be inferred from opportunity, action plan, proposal, page, URL, query, category, timestamp or event order.

P10.6 retains a defensive recommendation-conflict guard. In valid upstream data, P10.2 already rejects conflicting same-action recommendation identity earlier.

## Supplied calibration definitions

Each definition carries:
- exact calibration key;
- exact recommendation ID/fingerprint;
- exact P10.5 expectation ID;
- role: `primary`, `secondary`, or `diagnostic`;
- exact source identity/fingerprint.

The recommendation identity must exactly equal the treatment recommendation lineage.

The expectation must exist and target the exact treatment action.

Holdout expectations cannot directly calibrate the treatment recommendation in P10.6 v1.

Role is provenance only. It does not create weight, priority, score, rank, confidence or authority.

Exact replay dedupes. Conflicting calibration-key/source/expectation replay fails closed.

## Directional signals

P10.6 derives exactly one bounded signal for every exact P10.5 actual record retained under a referenced treatment expectation:

- `same_as_declared_direction`
- `opposite_declared_direction`
- `equal_expected`
- `neutral_direction`
- `unavailable`

A signal describes only declared metric direction relative to exact P10.5 expected/actual arithmetic.

If an expectation has no actual records, P10.6 emits no fake signal and leaves the definition `signal_unavailable`.

## Multiple observations

Multiple actual observations remain independent signals.

P10.6 does not:
- select latest/best/worst;
- average;
- majority-vote;
- create win/loss counts as a score;
- infer trend;
- infer confidence;
- aggregate metrics into an overall recommendation grade.

Report-level counts are limited to definition/signal availability, not directional scorecards.

## Upstream context

P10.6 preserves:
- P10.4 structural-flag count;
- exact P10.4 structural-flag fingerprints;
- P10.3 treatment-confounder count.

This context never weights, discounts, suppresses or promotes directional signals and does not establish cause.

## Interpretation guard

P10.6 explicitly records:
- P10.5 expected values are not causal counterfactuals;
- P10.5 actual values do not prove recommendation/action impact;
- directional signal is not recommendation quality;
- directional signal is not reward or penalty;
- no reward score is calculated;
- no recommendation score is calculated;
- recommendation rank is not recalculated;
- no model parameter is updated;
- no model weight is updated;
- no policy is updated;
- no prompt/template is updated;
- no trend or confidence is inferred;
- no causal attribution is performed;
- no rollout recommendation is generated;
- no autonomous transition is generated.

## Safety capability

P10.6 keeps closed:
- live outcome loading;
- live experiment assignment;
- Production DB reads/writes;
- schema mutation;
- provider network reads;
- provider credentials;
- provider/public-site writes;
- recommendation persistence/update;
- model training/fine-tuning/weight update;
- recommendation ranking mutation;
- policy mutation;
- prompt/template mutation;
- proposal persistence;
- approval grants;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- P10.7 implementation;
- timers/scheduler/live worker/retry runtime;
- automatic transitions;
- publication.

The static contract test prevents importing current operational DB/live measurement/mutation runtimes or using network/timer/child-process primitives.

## Validation repair note

The first detached Replit validation found one test-fixture failure: a synthetic conflicting same-action recommendation fixture was rejected earlier by P10.2 with `action_attribution_recommendation_id_conflict`, before P10.6 could run.

No implementation/safety defect was found.

The bounded repair replaced that unreachable test with a valid repeated same-action lineage case proving multiple events must carry the same exact recommendation identity. P10.6's defensive conflict guard remains in the implementation.

## Replit certification

After the bounded test repair, a detached temporary worktree at exact tested head/tree passed:
- focused P10.6 unit/contract tests: `22/22`;
- API typecheck;
- `git diff --check`.

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `255ec1058a01bf20f0db0e04f45d1c981b7c2ac6`
- tree: `00fe887aefa4a607cc26ec622d47ba9126ef68fb`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0

Validation on that exact Replit tree:
- recursive workspace tests: PASS `1013/1013`;
- full typecheck: PASS;
- full build: PASS;
- `git diff --check`: PASS.

Validation used existing dependencies only. No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

Known non-fatal existing frontend build diagnostics remained limited to tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk advisory.

## Publication state

P10.6 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P10.7 — Impact workspace v2**

P10.7 should begin with deterministic/read-only workspace projection and frontend presentation over exact supplied/certified P10.1–P10.6 artifacts.

It must preserve:
- chronology, direct association, window/confounder evidence, experiment/holdout structure, expected/actual arithmetic and calibration signals as distinct layers;
- explicit unavailable/unknown states;
- directional calibration is not reward or recommendation quality;
- arithmetic differences are not causal impact;
- no UI label may silently upgrade descriptive evidence into success/failure or causal claims;
- no live provider/outcome loading on generic continuation;
- no recommendation/model/ranking/policy mutation;
- no P9.8 autonomous-mutation implementation;
- no Task #51/#53/#54 execution;
- no provider/public-site write;
- no Production DB mutation or DDL;
- no deployment/publication on generic continuation.

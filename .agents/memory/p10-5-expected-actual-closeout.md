# P10.5 — Expected-vs-actual outcome tracking closeout

## Status

P10.5 is complete as a deterministic/read-only engineering milestone.

It does not activate live outcome loading, statistical inference, causal inference, recommendation calibration, model reward, Production persistence, provider access, mutation, automation, deployment or publication.

## Canonical implementation record

- Issue: #331 — `P10.5 — expected-vs-actual outcome tracking`
- Implementation PR: #332 — `P10.5 — expected-vs-actual outcome tracking`
- Base SHA/tree: `e0fbb08f5f4995a5d691861a01a7a8c7dd8260fe` / `fe347637abdb7096b3b6a242e7e255add28ec7b6`
- Exact tested PR head/tree: `a7e198e38118ac091907713812dd526d17bd448c` / `81354446398d038a6360502385982cd47166c38f`
- Exact-head CI: #575 / run `35511781930` — success
- Implementation merge/tree: `d038fbb1b8cccc67366dec7eb79961e10e947507` / `81354446398d038a6360502385982cd47166c38f`
- Post-merge main CI: #576 / run `35511907628` — success

## What P10.5 added

The implementation adds:
- `artifacts/api-server/src/lib/expected-actual-outcome.ts`
- `artifacts/api-server/src/lib/expected-actual-outcome.test.ts`
- `artifacts/api-server/src/lib/expected-actual-outcome-contract.test.ts`
- `docs/p10-5-expected-actual-outcomes.md`

P10.5 consumes one supplied P10.4 input/report pair plus caller-supplied metric definitions, expectations and actual observations.

Before any P10.5 projection, the P10.4 report is rebuilt from the supplied P10.4 input and must match exactly. P10.4 itself independently verifies the P10.1→P10.2→P10.3 chain, so P10.5 preserves that lineage rather than introducing a weaker path.

## Metric definitions

Each metric definition carries:
- exact metric key;
- exact unit;
- direction metadata: `higher`, `lower`, or `neutral`;
- exact source identity/fingerprint.

Direction is metadata only. It does not mean good/bad, success/failure or action quality.

Exact replay dedupes; conflicting metric-key or source replay fails closed.

## Expected outcomes

Each expected outcome carries:
- exact expectation ID;
- exact metric key;
- exact treatment/holdout target;
- exact scope;
- exact after-window designation;
- canonical decimal expected value or `null`;
- exact source identity/fingerprint.

Treatment scope must match exact direct P10.2 action association.

Holdout scope must exactly equal the P10.4 holdout definition.

A null expected value stays `expected_unavailable`.

## Actual outcomes

Each actual record carries:
- exact expectation ID;
- exact metric key;
- exact target;
- exact scope;
- canonical timestamp;
- canonical decimal actual value or `null`;
- exact source identity/fingerprint.

Metric/target/scope must exactly match the referenced expectation.

The timestamp must lie inside the exact P10.4 after window.

Multiple actuals are preserved independently in deterministic order; P10.5 does not select, average, aggregate, smooth or infer a trend.

A null/missing actual remains `actual_unavailable`.

## Exact decimal arithmetic

P10.5 accepts bounded canonical decimal strings and rejects non-canonical forms such as leading plus, exponent notation, redundant leading/trailing zero forms and negative zero.

Value arithmetic does not use floating-point conversion.

The implementation aligns decimal scales using BigInt and derives only:

`signedDifference = actual - expected`

Numeric relation is only:
- `above_expected`
- `equal_expected`
- `below_expected`

These are numeric-order descriptions, not evaluation.

## Tracking states

Bounded states are:
- `comparison_available`
- `expected_unavailable`
- `actual_unavailable`

No state means target met/missed, success/failure, good/bad, winner/loser or rollout/rollback advice.

## Upstream context

P10.5 preserves:
- P10.4 structural-flag count;
- exact P10.4 structural-flag fingerprints;
- P10.3 treatment-confounder count.

This context never weights/discounts arithmetic, creates confidence, or establishes cause.

## Determinism

P10.5:
- validates canonical timestamps and decimals;
- uses exact source identities/fingerprints;
- dedupes exact replay;
- fails closed on conflicting replay;
- stably sorts metric definitions, expectations and actuals;
- is invariant to caller input order;
- creates stable SHA-256 identities;
- preserves missing values as unavailable.

## Non-causal / non-statistical guard

P10.5 explicitly records:
- expected values are supplied and are not causal counterfactuals;
- actual values are supplied observations and do not prove action impact;
- signed difference is arithmetic only;
- above/equal/below relation is descriptive only;
- metric direction is metadata only;
- percentage change is not calculated;
- treatment-vs-holdout effect is not calculated;
- difference-in-differences is not calculated;
- multiple-actual trend is not inferred;
- statistical significance is not calculated;
- confidence intervals are not calculated;
- causal attribution is not performed;
- recommendation is not generated;
- rollout decision is not generated.

## Safety capability

P10.5 keeps closed:
- live outcome loading;
- live experiment assignment;
- Production DB reads/writes;
- schema mutation;
- provider network reads;
- provider credentials;
- provider/public-site writes;
- proposal persistence;
- approval grants;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- P10.6 implementation;
- timers/scheduler/live worker/retry runtime;
- automatic transitions;
- publication.

The static contract test prevents importing current operational DB/live measurement/mutation runtimes or using network/timer/child-process primitives.

## Replit certification

Before PR creation, a detached temporary worktree at the exact tested head/tree passed:
- focused P10.5 unit/contract tests: `19/19`;
- API typecheck;
- `git diff --check`.

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `d038fbb1b8cccc67366dec7eb79961e10e947507`
- tree: `81354446398d038a6360502385982cd47166c38f`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0

Validation on that exact Replit tree:
- recursive workspace tests: PASS, including API `991/991`;
- full typecheck: PASS;
- full build: PASS;
- `git diff --check`: PASS.

Validation used existing dependencies only. No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

Known non-fatal existing frontend build diagnostics remained limited to tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk advisory.

## Documentation hygiene repaired

The P10.5 closeout also repairs one pre-existing literal `\n` artifact before the P10.4 entry in `.agents/memory/MEMORY.md`. This is documentation-only and does not change program semantics.

## Publication state

P10.5 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P10.6 — recommendation calibration/learning signals**

P10.6 should begin with deterministic supplied recommendation-calibration and learning-signal semantics over exact P10.1–P10.5 lineage.

It must preserve:
- chronology vs direct association vs window/confounder evidence vs experiment/holdout structure vs expected/actual tracking vs calibration as separate layers;
- signed difference and numeric relation are not recommendation quality or causal reward;
- explicit signal definition and provenance;
- unavailable/ambiguous learning facts remain unavailable;
- no automatic model reward or weight update;
- no recommendation ranking/policy mutation;
- no live provider/outcome loading on generic continuation;
- no P9.8 autonomous-mutation implementation;
- no Task #51/#53/#54 execution;
- no provider/public-site write;
- no Production DB mutation or DDL;
- no deployment/publication on generic continuation.

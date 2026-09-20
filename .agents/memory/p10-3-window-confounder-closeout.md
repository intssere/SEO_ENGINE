# P10.3 — Before/after windows and confounder flags closeout

## Status

P10.3 is complete as a deterministic/read-only engineering milestone.

It does not activate live measurement loading, experiment assignment, causal inference, impact measurement, Production persistence, provider access, mutation, automation, deployment or publication.

## Canonical implementation record

- Issue: #325 — `P10.3 — before/after windows and confounder flags`
- Implementation PR: #326 — `P10.3 — before/after windows and confounder flags`
- Base SHA/tree: `2340f788dfc26bda65cd6ab5fb8891d4a9abf933` / `ef58daa82cbcfd355cc0cbe5ee64ee2d36d4b8ee`
- Exact tested PR head/tree: `14d24e1c4186fafd5ef5f159d789f0e1cd05cd99` / `a6b4e87a607f9a2ea973c7d2f6f603d511669d53`
- Exact-head CI: #567 / run `35508864497` — success
- Implementation merge/tree: `7337cefde56bfecc11664f81fbba8adcc6130393` / `a6b4e87a607f9a2ea973c7d2f6f603d511669d53`
- Post-merge main CI: #568 / run `35509022152` — success

## What P10.3 added

The implementation adds:
- `artifacts/api-server/src/lib/action-window-confounder.ts`
- `artifacts/api-server/src/lib/action-window-confounder.test.ts`
- `artifacts/api-server/src/lib/action-window-confounder-contract.test.ts`
- `docs/p10-3-window-confounder.md`

The model consumes one supplied P10.1 timeline and one supplied P10.2 action-attribution report. It independently rebuilds P10.2 from P10.1 before deriving any P10.3 result.

A mismatch fails closed with:

`p10_2_attribution_integrity_mismatch`

## Exact action and anchor boundary

P10.3 analyzes one exact P10.2 `actionId`.

A measurement anchor is available only when the caller supplies an exact timeline event fingerprint that:
- belongs to the same exact action; and
- is `verified_change_retained_live`.

Authorization time, deployment time, provider-write acceptance, verification alone, nearby timestamps and event order never create an anchor.

Missing anchor remains unavailable. Windows supplied without an anchor fail closed.

## Window semantics

Window bounds are explicit caller-supplied canonical UTC timestamps.

For an available anchor:
- before start <= before end;
- before end is strictly earlier than the anchor;
- after start <= after end;
- after start is strictly later than the anchor;
- each window includes its own endpoints;
- the anchor instant is in neither window.

P10.3 derives no preferred duration, lag, cooldown, significance threshold or causal frame.

## Observation scope

Each supplied observation has explicit source identity, canonical time and at least one page/query/category scope dimension.

Every non-null supplied scope dimension must exactly match P10.2:
- page ID/URL against a direct page association;
- query against a direct query;
- category against a direct category;
- optional site ID/domain against exact site lineage.

Membership states are:
- `before`
- `after`
- `outside`
- `unassociated`
- `window_unavailable`

No fuzzy URL/path matching, semantic query/category expansion, shared opportunity/action-plan/proposal or temporal-proximity fallback exists.

## Confounder flags

Bounded direct-evidence flags are:
- `same_action_uncertain_write`
- `same_action_rollback`
- `same_action_manual_intervention`
- `overlapping_direct_action`
- `external_supplied`

The overlapping-action flag requires another exact action with retained-live evidence inside the subject window and at least one exact shared direct P10.2 page ID, URL, query or category association.

External supplied facts require explicit bounded kind, source identity, canonical interval, exact compatible scope and window overlap.

These flags mean presence/overlap only. They do not prove that the flagged condition affected any metric and do not perform causal adjustment.

## Replay and determinism

P10.3:
- validates canonical timestamps;
- keys supplied observations/external facts by exact source identity;
- dedupes exact replay;
- fails closed on conflicting replay for one source identity;
- serializes output deterministically;
- is invariant to supplied observation/external-fact order;
- SHA-256 fingerprints observations, flags and the report.

## Non-causal guard

P10.3 explicitly records:
- chronology does not create association;
- P10.2 association does not create causality;
- window membership does not create causality;
- confounder overlap does not create causal adjustment;
- temporal proximity does not create causality;
- no metric delta is calculated;
- no confidence is calculated;
- no recommendation is generated;
- no causal attribution is performed;
- no impact is calculated.

## Safety capability

P10.3 keeps closed:
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
- P10.4 implementation;
- timers/scheduler/live worker/retry runtime;
- automatic transitions;
- publication.

The static contract test prevents importing current operational DB, live measurement and mutation runtimes.

## Replit certification

Before PR creation, a detached temporary worktree at the exact tested head/tree passed:
- focused P10.3 unit tests;
- focused P10.3 contract tests;
- API typecheck;
- `git diff --check`.

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `7337cefde56bfecc11664f81fbba8adcc6130393`
- tree: `a6b4e87a607f9a2ea973c7d2f6f603d511669d53`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0
- diff against origin/main: zero

Validation on that exact Replit tree:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS

Validation used existing dependencies only. No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

Known non-fatal existing frontend build diagnostics remained limited to tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk warning.

## Publication state

P10.3 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P10.4 — experiment/holdout framework where practical**

P10.4 should begin with deterministic supplied experiment/holdout design and analysis semantics over exact P10.1–P10.3 lineage.

It must preserve:
- chronology vs direct association vs window membership vs confounder overlap vs experiment/causal analysis as separate layers;
- before/after timing alone is not causal evidence;
- unavailable facts remain unavailable;
- no live experiment assignment on generic continuation;
- no P9.8 autonomous-mutation implementation;
- no Task #51/#53/#54 execution;
- no provider/public-site write;
- no Production DB mutation or DDL;
- no deployment/publication on generic continuation.

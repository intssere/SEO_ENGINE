# P9.7 — Deterministic Recommendation Generation Worker v1

## Purpose

P9.7 defines a deterministic/default-off recommendation-generation worker contract over the certified opportunity pipeline.

It consumes supplied/synthetic canonical P6.1–P6.7 lineage and a canonical P9.6 worker-control state.

It does **not** run a live worker and does not call an AI/model/provider.

## Canonical input path

P9.7 accepts an exact P6.7 lifecycle input/report pair.

P6.7 independently rebuilds:
- P6.6 preview/diff;
- P6.5 actionability;
- P6.4 explanation;
- P6.3 prioritization;
- P6.2 scoring;
- P6.1 opportunity identity/evidence.

P9.7 rebuilds P6.7 again and requires exact equality with the supplied report.

P7.6 AI/GEO opportunities are supported only after they have entered the canonical P6 opportunity pipeline. P9.7 does not read P7 provider observations directly.

## P9.6 control binding

P9.7 also receives one canonical P9.6 worker-control state.

The state is rebuilt deterministically and must match exactly.

Only `running` permits recommendation review generation.

These modes hold otherwise eligible work:
- `paused`
- `draining`
- `drained`
- `killed`

P9.7 does not resume or recover a killed worker. The P9.6 killed-state recovery boundary remains authoritative.

## Generation boundary

Generation is deterministic template generation only.

P9.7 does not import or call:
- `ai-proposal-runtime`;
- OpenAI;
- any model/provider client;
- network I/O.

Every generated candidate records:
- `mode=deterministic_template`;
- `aiAssisted=false`;
- `providerModel=null`;
- `freeformGeneration=false`.

The generated text is bounded review guidance, not site copy.

## Eligibility

### Advisory review

A P6.5 `recommend` opportunity may generate an `advisory_review` only when:
- its P6.7 state is `observed` or `active`;
- P9.6 control mode is `running`.

A P6.6 preview is optional for advisory review.

### Proposal review

A P6.5 `approval` opportunity may generate a `proposal_review` only when:
- its P6.7 state is `observed` or `active`;
- at least one exact P6.6 preview exists with at least one changed field;
- P9.6 control mode is `running`.

The preview remains caller-supplied P6.6 state. P9.7 does not claim it is better, correct, safe, approved, or executable.

## Withheld/held states

P9.7 does not generate recommendations for:
- P6.5 `informational` → `withheld_informational`;
- P6.5 `blocked` → `withheld_blocked`;
- P6.7 `deferred` → `held_deferred`;
- P6.7 `dismissed|closed|superseded` → `withheld_terminal`;
- P6.5 `approval` without a changed P6.6 preview → `withheld_approval_preview_required`.

Otherwise eligible work under a non-running P9.6 control mode becomes `held_by_control`.

This ordering preserves intrinsic terminal/governance blockers instead of hiding them behind a temporary worker pause.

## Deterministic recommendation templates

P9.7 maps each P6.1 opportunity kind to one bounded internal review instruction.

Templates explicitly avoid unsupported causal or execution claims.

Examples:
- competitor gaps are comparative evidence and never permission to copy competitor content;
- backlink authority remains provider-relative;
- AI visibility/citation gaps do not imply model behavior changes or guaranteed citation acquisition;
- CTR/ranking opportunities do not imply performance improvement.

No customer-facing/site-facing copy is generated.

## Exact lineage

Each recommendation candidate binds:
- opportunity ID/fingerprint;
- family/kind/subject;
- explanation ID/fingerprint;
- actionability ID/fingerprint;
- lifecycle ID/fingerprint/state;
- score fingerprint/status/value;
- inherited P6.3 priority rank/tie count;
- exact evidence fingerprints;
- exact explanation statement fingerprints;
- missing-evidence codes;
- semantic guards;
- all preview fingerprints;
- changed-preview fingerprints.

P6.3 priority is preserved only as upstream lineage.

P9.7 canonical output ordering is by opportunity fingerprint and creates no additional priority, winner, worker dispatch order, or execution preference.

## Idempotency

Each generated recommendation gets:
- one recommendation fingerprint;
- one stable `rgk-...` idempotency key.

The idempotency identity depends on exact upstream recommendation lineage, template code, recommendation class and preview lineage.

It intentionally does not depend on the P9.7 observation timestamp or temporary P9.6 pause/resume control state.

Therefore an unchanged opportunity resumed later produces the same recommendation identity.

Changed lifecycle/actionability/explanation/preview lineage changes the identity.

No lock/reservation/persistence is created.

## P8 governance handoff

P9.7 emits a P8-compatible descriptive handoff projection:

- surface: `p8_governance_review`;
- preview availability;
- changed-preview availability;
- whether approval is required.

It explicitly keeps false:
- proposal record creation;
- proposal persistence;
- approval grant;
- execution authorization;
- public-site writes;
- automatic transition;
- Task #51 authorization creation.

P9.7 therefore stops before P8 proposal persistence or any Task #51/#53/#54 execution path.

## Batch projection

The deterministic batch reports:
- total opportunities;
- generated recommendations;
- advisory/proposal-review counts;
- held-by-control count;
- held-deferred count;
- informational/blocked/terminal withholding;
- approval-preview withholding;
- exact candidate fingerprints;
- canonical P9.6 control projection.

Batch observation time is caller-supplied and must be canonical and not precede P6.7 history or P9.6 control effective time.

No wall clock is read.

## Safety boundary

P9.7 explicitly keeps false:
- timer/scheduler activation;
- live recommendation worker;
- live retry loop;
- AI/model calls;
- AI proposal-generation gate activation;
- AI proposal runtime;
- credential/OAuth use;
- durable queue enqueue/claim/reservation;
- recommendation/proposal persistence;
- database/Production DB reads/writes;
- Task #69/#70 execution;
- provider/crawl network reads;
- approval grant;
- Task #51/#53/#54 execution;
- provider/public-site writes;
- automatic transition;
- publication.

Static tests forbid AI runtime, provider/network, DB, wall-clock, timer and worker-process primitives.

## Production boundary

P9.7 is engineering architecture only and remains unpublished.

Production remains the separately certified Task #73 application release.

Generic continuation does not authorize a live recommendation worker, model call, `AI_PROPOSAL_GENERATION_ENABLED`, persistence, execution, deployment or publication.

## Next boundary

After P9.7 certification, **P9.8 — autonomous mutation policy engine** remains a separate future boundary.

P9.8 must not be treated as a generic continuation into autonomous mutation. Before implementation, its policy scope, eligible action classes, authorization model, rollback/verification requirements and production activation boundaries must be reviewed explicitly.

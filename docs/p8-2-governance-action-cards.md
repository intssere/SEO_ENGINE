# P8.2 — Read-only governance action cards v1

## Scope

P8.2 adds deterministic/read-only evidence, risk, preview, verification-availability, and rollback-plan action cards to the existing P8.1 `/governance` workspace.

Issue: #288.

This milestone is frontend/read-model engineering only. It adds no backend route, OpenAPI change, database binding, provider request, mutation hook, authorization path, execution path, rollback path, scheduler/worker behavior, deployment, or publication.

## Source boundary

P8.2 reuses only the existing read-only P8.1 sources:

- `GET /api/opportunities`
- `GET /api/actions`
- `GET /api/approvals`

P8.1 remains responsible for exact proposal/opportunity reconciliation. P8.2 consumes only reconciled proposal rows; opportunity-only rows do not fabricate action cards.

The P8.1 scalar projection is extended with existing `ProposalRecord` fields required for truthful display:

- `quality_score`
- `evidence_sufficient`
- `url`
- `path`
- `rationale`
- `expected_benefit`
- `rollback`
- `bounded_pilot`
- `whole_site_coverage`

These fields participate in P8.1 projected-field conflict detection. A disagreement between the Actions and Approvals copies of the same proposal fails closed instead of choosing a hidden source winner.

## Action-card semantics

Each proposal card contains five descriptive blocks.

### Evidence

The card shows exact source values for:

- declared `evidence_count`;
- `evidence_sufficient`;
- quality status;
- quality score;
- quality approval eligibility.

P8.2 does not synthesize missing evidence IDs or infer P3 freshness, support tier, history, conflict, or corroboration state.

### Risk

The card preserves these domains independently:

- opportunity risk;
- evaluator risk;
- plan-control risk;
- effective execution risk.

It also displays `execution_authorized` and `public_site_writes` only as persisted descriptive source flags. They are not controls on the card.

### Preview

The card shows exact `before_value` and `after_value` data together with the source field/action type, rationale and expected benefit.

Null and empty string are displayed distinctly. The preview does not imply recommendation, approval, apply authorization, execution priority, or execution.

### Verification

The current governance proposal GET contract does not expose a per-action verification result/evidence record.

Therefore every P8.2 card reports:

- **VERIFICATION DETAIL UNAVAILABLE**;
- the exact recorded proposal lifecycle as descriptive context only.

A lifecycle such as `verified_result` is not reinterpreted as verification proof. P8.2 intentionally does not infer verification outcome, evidence, success, regression, or readiness.

### Rollback

`ProposalRecord.rollback` is treated strictly as a rollback **plan string**.

The card reports:

- **ROLLBACK PLAN ONLY** when plan text is exposed;
- **ROLLBACK STATUS UNAVAILABLE** for execution/status/result.

A plan does not mean rollback is authorized, executed, completed, or successful.

## Determinism and validation

`buildGovernanceActionCardModel`:

- accepts reconciled P8.1 rows;
- creates cards only for proposal rows;
- preserves exact source scalar values;
- rejects missing proposal-required display facts;
- rejects invalid negative/non-integer evidence counts;
- rejects quality scores outside 0–100;
- sorts by opportunity ID then proposal ID for stable serialization;
- emits a deterministic model fingerprint;
- does not mutate its input;
- explicitly records non-authority semantics.

Canonical ordering is serialization only and is not recommendation, priority, approval, or execution order.

## UX and accessibility

The Governance workspace renders one semantic read-only article per proposal with:

- Evidence;
- Risk;
- Preview;
- Verification;
- Rollback.

There are no P8.2 buttons or handlers for approval, authorization, execution, verification, rollback, persistence, or provider/site writes.

The existing closed-network Governance browser test verifies the action cards and their safety labels, and the existing Governance axe route continues to gate serious/critical accessibility violations.

## Safety boundary

P8.2 does not authorize or perform:

- proposal editing or generation;
- approval/rejection;
- authorization creation or renewal;
- execution;
- verification mutation;
- rollback mutation;
- provider/public-site request or write;
- persistence or Production DB activity;
- scheduler/worker/retry activation;
- secret/config mutation;
- deployment or publication.

The published production application remains unchanged until a separately governed publication step is explicitly authorized.

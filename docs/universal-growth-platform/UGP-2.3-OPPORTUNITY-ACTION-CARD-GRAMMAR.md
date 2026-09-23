# UGP-2.3 — Opportunity / Action Card Grammar

Status: implementation candidate on `initiative-universal-growth-platform`.

## Goal

SEO ENGINE should present recommendations and proposed changes using one customer decision grammar instead of switching terminology between Opportunities, Actions and Approvals.

The standard grammar is:

1. **Problem** — what needs attention.
2. **Impact** — why the change matters, when the source exposes an expected benefit.
3. **Risk** — the source-backed customer risk classification.
4. **Current state** — the exact observed value when available.
5. **Recommended state** — the recommendation or proposed value.
6. **Why** — concise source rationale, with evidence available through UGP-2.2.
7. **Preview** — before → recommended comparison only when a concrete proposal exposes it.
8. **Review / apply state** — truthful workflow state; never an implied execution permission.
9. **Measurement state** — measured, pending or unavailable only when supported by real outcome data.

## Source semantics

### Opportunity records

The current `OpportunityRecord` exposes:

- title/type;
- score/confidence;
- risk;
- rationale / why it qualifies;
- recommendation;
- status;
- execution-authorization flag.

It does **not** expose:

- an exact current value;
- a proposal before/after preview;
- an expected-benefit field;
- a verified outcome measurement.

The customer card therefore states those dimensions as unavailable rather than deriving them from score, status or lifecycle.

### Proposal records

The current `ProposalRecord` exposes:

- exact before and proposed values;
- expected benefit;
- rationale;
- effective execution risk;
- review decision/lifecycle;
- execution-authorization state;
- evidence/quality;
- rollback plan.

Proposal cards may therefore show an exact preview.

However:

- an approved review decision is not execution authorization;
- execution authorization does not mean a provider write occurred;
- proposal lifecycle is not verification proof;
- rollback plan text is not rollback execution state;
- proposal records still do not expose verified outcome measurement.

## Customer surfaces

### Opportunities

Active opportunities use cards instead of the previous dense default table.

The card shows:

- problem;
- impact state;
- priority;
- risk;
- current state;
- recommended state;
- why;
- evidence access;
- review/apply state;
- measurement state;
- preview availability.

Invalidated/superseded history remains tabular because it is audit history rather than an active decision surface.

### Actions

The persisted-proposal table uses the same grammar:

- Problem / impact;
- Current → recommended;
- Risk;
- Why;
- Review / measurement.

The existing authorization and renewal controls are unchanged.

### Approvals

The existing editable review card keeps its current safeguards and mutation hooks, but customer labels align to the grammar:

- Current state;
- Generated recommendation;
- Recommended state;
- Problem / why / impact;
- Risk / safeguards;
- explicit measurement-unavailable state.

## Evidence and advanced state

UGP-2.3 does not duplicate evidence or provenance into the default card.

UGP-2.2 remains responsible for:

- traceable evidence;
- quality;
- provenance;
- authorization detail;
- unavailable technical dimensions.

The advanced Governance action card remains unchanged as the source-of-truth inspection surface for exact control, verification-unavailable and rollback-plan semantics.

## Performance

The implementation reuses the existing certified approval-card and status-badge styles. It adds no new card CSS framework and no new UI dependency.

P11.1 asset budgets remain unchanged.

## Out of scope

No backend/API/database/schema/provider change.
No approval or execution semantic change.
No new mutation control.
No inferred measurement.
No deployment/publication.
No UGP-2.4 connection wizard work.

# Task #26 — Dry-Run Autonomous SEO v1

## Objective

Convert real, evidence-backed Diamond Shelf opportunities into proposed SEO action plans without performing any public-site mutation.

This stage proves that SEO ENGINE can reason from opportunity → proposed change → expected state → safety disposition → rollback intent while keeping execution disabled.

## Safety contract

- Public-site writes remain disabled.
- `buildDryRunPlan` always returns `executionEnabled: false`.
- No Shopify mutation client is called by this package.
- Every proposal must preserve the opportunity's primary evidence reference.
- Every proposal must define an expected verification state.
- Every proposal must define rollback intent before it can be considered production-eligible.
- URL, redirect, destructive, navigation and architecture changes retain approval requirements from the existing Safety Engine.
- Weak policy confidence tiers D–G remain blocked for executable planning.
- A dry-run `auto` classification means low-risk eligibility only; it is not authorization to execute.

## Inputs

Each dry-run proposal contains:

- site/opportunity/page identity
- opportunity source, score and confidence
- primary and supporting evidence references
- proposed action type and target
- proposed change
- expected post-change state
- rollback intent
- risk context such as reversibility or URL/navigation impact
- optional search-policy confidence tier

## Outputs

The package returns:

- `ready` or `blocked`
- blockers when proposal provenance is incomplete
- the existing Action Planner plan with safety disposition
- evidence references
- rollback intent
- hard-coded `executionEnabled: false`

The summary separates ready, blocked, auto-eligible, approval-required and policy-blocked plans while still reporting execution disabled.

## Production boundary

Task #26 does not authorize production changes and does not enable `PUBLIC_SITE_WRITES_ENABLED`.

Task #27 must use a separate explicit production-write authorization for one bounded Diamond Shelf action. Before that action is executed, the system must capture the exact before-state, preserve rollback data, validate the connector scope, execute only the authorized mutation, and verify both the Shopify state and public page.

## CI exit criteria

Merge only when the exact Task #26 PR head passes:

1. existing repository safety and engine tests,
2. dry-run evidence/verification/rollback gates,
3. workspace typecheck,
4. workspace build.

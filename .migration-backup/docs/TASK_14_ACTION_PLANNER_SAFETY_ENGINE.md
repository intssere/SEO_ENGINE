# Task #14 — Action Planner + Safety Engine v1

## Purpose
Convert prioritized SEO opportunities into deterministic proposed action plans and classify every proposed action as `auto`, `approval`, or `blocked` before any deployment connector can act.

## Safety boundary
Task #14 does **not** execute changes. `PUBLIC_SITE_WRITES_ENABLED=false` remains the system default. All generated plans and actions persist as `pending`. Task #15 introduces a write connector, but it must honor this safety classification and the global write kill switch.

## V1 disposition policy

### AUTO-eligible low-risk actions
- title metadata
- meta description
- image alt text
- broken internal-link repair
- schema patch
- sitemap maintenance

AUTO means *eligible for autonomous execution later*, not executed by Task #14. If reversibility is explicitly false, the action is downgraded to `approval`.

### APPROVAL-required actions
- new internal links
- major content rewrites
- URL changes
- redirects
- page deletion
- navigation / architecture changes

### BLOCKED
- unknown/unrecognized action types
- policy-driven executable actions based only on confidence tiers D–G
- actions outside the explicit safety policy

## Algorithm Update Mode
When Search Intelligence activates Algorithm Update Mode, non-low-risk autonomous changes are frozen and require approval. Low-risk allowlisted actions may still be classified as AUTO, but remain non-executable while public writes are disabled.

## Plan-level risk
A plan inherits the strictest child action disposition:
`blocked > approval > auto`.

## Persistence contract
The package maps cleanly to the existing `action_plans` and `actions` schema:
- action plan status: `pending`
- action status: `pending`
- plan risk level: `auto | approval | blocked`
- target, proposed change, expected state and safety rationale are retained
- deterministic SHA-256 dedupe keys are embedded for idempotent persistence

## Non-goals
- no Shopify mutation
- no CMS mutation
- no approval UI
- no deployment
- no rollback execution
- no ranking guarantees

## Next task
Task #15 — Shopify Write Connector v1 will implement mutation primitives behind both the global write kill switch and Task #14 safety gates.

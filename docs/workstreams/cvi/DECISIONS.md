# Architecture decision record index

## ADR-CVI-001 — separate branch, shared runtime
Status: proposed baseline
Decision: independent documentation and implementation workstream within SEO_ENGINE, not a new repository or autonomous deployment.
Reason: avoid duplicating UGP/P12.2 security, scheduler, CMS and evidence infrastructure.

## ADR-CVI-002 — utility over AI-detector evasion
Status: proposed baseline
Decision: evaluate truthful, useful, source-grounded content; do not optimize for AI-detector scores.

## ADR-CVI-003 — fail-closed publishing
Status: proposed baseline
Decision: publication is an independently authorized side effect requiring revision protection, receipts and readback verification.

## ADR-CVI-004 — no universal quality score
Status: proposed baseline
Decision: hard gates, multidimensional rubrics and expert-calibrated outcomes; advisory aggregate scores cannot override critical failures.

## ADR-CVI-005 — audit before implementation
Status: proposed baseline
Decision: existing code and tests determine implementation status, not conceptual roadmap descriptions.

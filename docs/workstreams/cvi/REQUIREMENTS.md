# CVI requirements and traceability
Status labels: NOT_AUDITED, PRESENT, PARTIAL, MISSING, VERIFIED. All initial implementation statuses are NOT_AUDITED.

| ID | Requirement | Acceptance evidence | Status |
|---|---|---|---|
| CVI-R01 | Demand and intent model | Fixture tests on distinct intents | NOT_AUDITED |
| CVI-R02 | Site knowledge inventory | Existing URL intent and canonical reconciliation tests | NOT_AUDITED |
| CVI-R03 | SERP knowledge-gap analysis | Source-grounded comparative evaluation | NOT_AUDITED |
| CVI-R04 | Necessity and content format selection | NO_ACTION/PRESERVE/UPDATE/CREATE fixtures | NOT_AUDITED |
| CVI-R05 | Evidence provenance and freshness | Source-to-claim lineage and invalidation tests | NOT_AUDITED |
| CVI-R06 | Original contribution manifest | Unsupported novelty claims rejected | NOT_AUDITED |
| CVI-R07 | Business truth registry | Contradictory pricing/policy fixture blocked | NOT_AUDITED |
| CVI-R08 | Content blueprint and generation | Reproducible, cited draft fixtures | NOT_AUDITED |
| CVI-R09 | Independent factual evaluation | Contradiction/unsupported claim benchmark | NOT_AUDITED |
| CVI-R10 | Editorial refinement | No factual drift regression | NOT_AUDITED |
| CVI-R11 | Reader utility and accessibility | Expert rubric and WCAG-oriented tests | NOT_AUDITED |
| CVI-R12 | Scaled-content risk and duplicate intent | Programmatic doorway/templating fixtures | NOT_AUDITED |
| CVI-R13 | YMYL and editorial approvals | Approval required for protected categories | NOT_AUDITED |
| CVI-R14 | CMS adapter governance | Draft/readback/idempotency/conflict/rollback tests | NOT_AUDITED |
| CVI-R15 | Content DNA and lifecycle | Versioned evidence and refresh dependency tests | NOT_AUDITED |
| CVI-R16 | Outcome evaluation | Baselines, controls, uncertainty and attribution | NOT_AUDITED |
| CVI-R17 | Cost/portfolio optimization | Budgeted action selection and stop decisions | NOT_AUDITED |
| CVI-R18 | Multilingual and regional accuracy | Locale-specific expert fixtures | NOT_AUDITED |
| CVI-R19 | Licensing/privacy/source usage | Disallowed reuse and PII fixtures | NOT_AUDITED |
| CVI-R20 | Recovery/observability | Failure injection, unknown-outcome reconciliation | NOT_AUDITED |

## Audit protocol
For every requirement record code path, existing tests, current behavior, missing behavior, dependencies, risk, owner, proposed increment, and verification command. Never mark PRESENT from a roadmap or narrative alone. Use evidence from current canonical main; preserve commit SHA in each audit.

## Gate semantics
Hard failures: fabricated or unsupported consequential claim, unauthorized source use, protected content mutation, unresolved publication conflict, missing mandatory YMYL review, invalid tenant/site authority, disallowed external write, or unknown provider outcome.
Soft failures: verbosity, incomplete examples, presentation weaknesses; may return for revision.

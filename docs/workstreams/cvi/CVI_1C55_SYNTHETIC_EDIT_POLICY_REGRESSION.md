# CVI-1C.55 — Synthetic Draft-Edit Policy Regression

## Parent
CVI-1C.54 draft PR #1104, commit `f1efa7ed43ebdbf1463b76b5f417e84a082b6bc8`. Its exact-head CI https://github.com/intssere/SEO_ENGINE/actions/runs/38148418656 was pending when work began.

## Implementation
Added pure, in-memory assertions to the existing disposable authenticated-session regression module. The synthetic admission predicate requires global operator/admin, editor/owner organization membership, active membership, active grant, explicit **synthetic_edit_draft** permission, matching subject and site, and unexpired policy state. Positive operator/editor and admin/owner cases, and each negative dimension, are checked.

The policy is deliberately local test code. `synthetic_edit_draft` is not an existing schema permission: `0012_cvi_tenant_site_acl_draft.sql` only defines read-evidence, review-content and connection-management grants. No runtime function or actual ACL grant has been created, no database migration applied, and no production handler altered.

## Limitations and admission gates
This is a preliminary policy truth-table, not a database locking test, tenant authorization implementation, or deployed enforcement. The boolean policy inputs are synthetic rather than authoritative rows; concurrent revocation and site mapping require separate approved disposable tests. Owner approval is still required for mutation-specific grants, auth-disabled production behavior, and cross-workflow lock order. Full CI pending.

# CVI-1C.60 — Authorization Review Sign-off Checklist (No Approval Presumed)

## Certified baseline
CVI-1C.59 draft PR #1114 at HEAD `dc43b48ba0b4e64d5aedd610643a0f81ca3241c3`, GitHub Actions https://github.com/intssere/SEO_ENGINE/actions/runs/38231977036 (36 steps, success). This checklist carries forward design and testing evidence only; CI success does not constitute review or release authorization.

## Source-backed boundaries
- `artifacts/api-server/src/routes/operational.ts` implements `PATCH /approvals/:id/draft` and passes the verified actor to `editProposalDraft`.
- `artifacts/api-server/src/lib/auth-foundation.ts` requires global `operator` role for this path when authentication enforcement is enabled.
- `artifacts/api-server/src/lib/operational-data.ts` updates draft `action_plans.expected_outcome` inside `sql.begin`; the current path is not protected by a complete session + tenant membership + site mutation-grant transaction fence.
- Dormant `0012_cvi_tenant_site_acl_draft.sql` supports site `read_evidence`, `review_content`, and `manage_connection` grants only. `edit_draft` is a proposal, not an implemented permission.
- CVI-1C.55/56/58 proofs exercise synthetic policy, disposable session fencing and read-grant separation, not a production editing capability.

## Independent review gates
| Gate | Evidence required | Decision |
|---|---|---|
| SEC-1 Scope | Named authorization for draft edit only; no approval, execution, publishing or external calls | Pending |
| SEC-2 Identity | Authoritative persisted session identity and subject-to-organization membership policy | Pending |
| SEC-3 Site grant | Exact `edit_draft` semantics and permission-schema proposal; prohibit `review_content` escalation | Pending |
| SEC-4 Disabled auth | Fail-closed deployable-environment policy with explicit backwards-compatibility and rollout assessment | Pending |
| DB-1 Lock ordering | Evidence for common site/session/membership/grant/action-plan order compatible with acquisition and approval paths | Pending |
| DB-2 Revocation | Disposable two-connection tests for revocation-first and operation-first serialization | Pending |
| DB-3 Migration | Explicit production activation/backfill/rollback plan; no auto-application of draft ACL migrations | Pending |
| QA-1 Route matrix | Disposable HTTP tests for IDOR, cross-site, stale fingerprint, CSRF, expired/revoked sessions and zero-write denials | Pending |
| AUD-1 Audit | Denial/audit record semantics without cross-tenant leakage or sensitive-data exposure | Pending |
| REL-1 Release | Independent security, database and accountable product approvals for a separately authorized deployment | Pending |

## Reviewer packet requirements
For each gate, record a named reviewer, dated decision, exact code/contract revision, pass/fail evidence and any residual risk. Blank entries remain pending. Do not treat assistant-authored checklists or GitHub CI as a human sign-off. All production schema, auth defaults and handler changes require a separate explicit change authorization.

## Permitted next work
Read-only source review and further isolated disposable *read-only* authorization tests may proceed. No production migration, creation of an `edit_draft` grant, global auth flip, handler integration, live provider call, CMS publishing, merge or deployment is authorized by this document.

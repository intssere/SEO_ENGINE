# CVI-1C.81 — Proposed Real-Handler Authorization Acceptance Matrix

## Baseline
CVI-1C.80 parent draft PR #1142 HEAD `65398ac11e5ca40ff724e681727c7f4b9376485e`; proof CI #38274881385 passed all 36 steps. Review issue #1143 remains OPEN. This is a **proposed test specification**, not approved permission semantics or implemented handler tests.

## Preconditions (must be approved first)
Security/product must define independent `edit_draft` and `decide_review` permissions, a role-to-permission mapping, active-site behavior, session idle/absolute expiry policy, and mutation audit outcomes. Database/security must define the global lock order and the exact transaction-scoped session/membership/site/grant validation. QA must use disposable loopback HTTP plus isolated PostgreSQL with synthetic tenants, never real customer data.

## Acceptance cases
| ID | Controlled setup | Expected outcome subject to policy approval |
|---|---|---|
| A01 | Valid session + active site + current tenant membership + matching `edit_draft` grant | Exactly one draft revision, durable audit event, no publication |
| A02 | Valid `review_content` or `read_evidence` grant but no `edit_draft` | Reject edit; no plan revision or unauthorized audit success |
| A03 | Auth enforcement disabled/misconfigured | Fail closed for protected draft and decision routes, regardless of same-origin header |
| A04 | Session revoked before request | Deny and leave plan/audit success absent |
| A05 | Session revoked after initial middleware check, before row lock acquisition | Deny in transaction; no stale-principal mutation |
| A06 | Mutation acquires approved locks before revocation | Serializable, policy-defined operation-first outcome; revocation effective afterward |
| A07 | Membership suspension or site grant revocation precedes transaction authorization | Deny despite earlier valid session snapshot |
| A08 | Grant expires while waiting for plan/site/ACL row lock | Re-evaluate database time after lock wait; deny expired permission |
| A09 | Actor valid for tenant A but action plan belongs to tenant B, including guessed UUID | Deny without cross-tenant details, mutation or audit success |
| A10 | Wrong site within same tenant | Deny without changing action plan |
| A11 | Revision fingerprint mismatch, invalid content or quality gate failure | Roll back all plan and approval changes; log safe denial |
| A12 | Two concurrent edits of same action plan | Exactly approved revision wins, other conflict/denial; no lost update |
| A13 | Concurrent edit versus decision | Approved lifecycle ordering, no post-decision edit bypass |
| A14 | Site disabled by controlled admin action during mutation | Serialize by approved global lock order and fail closed after revocation |
| A15 | Explicit bootstrap attempts to reactivate disabled site | Rejected or subject to a separately approved audited recovery control |
| A16 | OAuth connection state changes during a protected CVI operation | Deterministic reviewed authorization/connection policy; no invalid refresh of revoked permission |

## Test harness requirements
- Two or more independent Postgres connections; bounded lock waits; explicit transaction barriers; test-only inserted IDs and guaranteed database teardown.
- Use the **actual mounted** `/api/approvals/:id/draft` and `/api/approvals/:id/decision` handlers, not pure policy snapshots or synthetic plan rows alone.
- Assert HTTP status, database row state and revision, pending/committed audit records, and absence of publication/provider traffic.
- Observe denial from source-backed error categories; redact raw tokens, secrets and personal data in evidence.
- Verify migrations and schema only in explicitly disposable database; production ACL migrations 0012–0016 remain dormant.
- Provide tests at exact reviewed commit and independent security/database signoff; no CI result by itself grants release authority.

## Status
All 16 cases are **specified only**, not asserted to pass or implemented. Preconditions in issue #1143 remain open. No production grant or handler changes are authorized.

## Boundary
Documentation-only increment. No production DB, migration activation, provider call, CMS write, merge or deployment.

# CVI-1C.83 — Existing Handler Test Coverage Baseline

## Verified baseline
CVI-1C.82 parent PR #1145 HEAD `60af8e7f670379e8295d41b4f29032cd1793b389` and exact-head CI #38277421757 passed 36 steps. Decision issue #1143 remains open without comments. This is a source audit and test-design gap report, not real-handler authorization implementation.

## Inspected tests
- `artifacts/api-server/src/lib/operational-data.test.ts` (95 lines) exercises selected operational-data decisions, including a rejected `decideProposalReview` confirmation mismatch near line 75. It does not establish tenant/site membership or site grant authorization at transaction time.
- `artifacts/api-server/src/middlewares/auth-security.test.ts` (206 lines) configures `AUTH_ENFORCEMENT_ENABLED: "true"` in its main test fixture and includes role tests for approval-decision paths around lines 111–151. This establishes global middleware role-related coverage, not persistence-backed `edit_draft` grants or a concurrent revocation fence.
- CVI-1C.81 specifies A01–A16 as **unimplemented acceptance scenarios**. It explicitly requires mounted `/api/approvals/:id/draft` and `/api/approvals/:id/decision` handlers with real disposable transaction-scoped identities.

## Unproven behaviors — do not mark green
A01/A02 edit-grant distinction; A03 disabled/misconfigured auth fail-closed protected mutation; A05 post-middleware session revocation; A07 membership/grant revocation; A08 expiry after lock wait; A09/A10 cross-tenant/site IDOR; A12/A13 competing edit/decision; A14 site disable race; A15 bootstrap reactivation control; A16 OAuth connection state race. The inspected two tests cannot certify these. Other repository tests were not exhaustively mapped in this increment.

## Safe execution boundary
Until reviewer decisions in #1143, permitted next steps are non-mutating source coverage mapping and disposable synthetic tests that do not claim production authorization. Do not introduce a runtime grant, activate ACL 0012–0016 outside disposable tests, change production middleware/handlers, merge, or deploy.

## Reviewer follow-up
Attach accountable decisions to #1143, then implement approved real-handler tests and transaction design on a new isolated branch. CI-green documentation and synthetic proofs are necessary but not sufficient for release.

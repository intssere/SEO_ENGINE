# CVI-1C.82 — Reviewer Decision Worksheet and Approval Boundary

## Evidence baseline
CVI-1C.81 parent draft PR #1144 HEAD `e193934dae29f50b0bfd925e641ae354b243e8f4`; exact-head CI #38276058489 passed 36 steps. [Decision issue #1143](https://github.com/intssere/SEO_ENGINE/issues/1143) is open without review comments at authoring. **No approval is implied by silence.**

## Decision worksheet
Each reviewer should record **Approve / Reject / Request Changes**, their accountable role, date, approved design revision, rationale, and evidence links. A generic PR approval does not authorize a production rollout.

| Gate | Required decision | Reviewer roles | Default until resolved |
|---|---|---|---|
| SEC-01 | Distinct `edit_draft` and `decide_review` scopes, roles, tenant/site binding, expiry and revocation | Product + Security | DENY |
| SEC-02 | Fail-closed mutation policy when authentication enforcement is disabled/misconfigured; identity, CSRF and IDOR contract | Platform + Security | DENY |
| DB-01 | Global lock ordering including action plan, site, connection, session, membership, grant, bootstrap/admin lifecycle | Database + Security | NO RUNTIME CHANGE |
| DB-02 | Additive schema/migration and rollback plan for tenant/site ACL permission contract | Database owner | DORMANT |
| QA-01 | Disposably exercised mounted-handler race/expiry/IDOR cases A01–A16, with exact-head proof | QA + Security | NOT CERTIFIED |
| OPS-01 | Controlled explicit bootstrap invocation, disabled-site recovery, Railway command and deployment attestation | Operations + Security | NO INVOCATION |
| REL-01 | Staging-only rehearsal criteria and independent production release authority | Release owner | NO MERGE/DEPLOY |

## Required artifacts
1. Product permission specification with `edit_draft` distinct from `read_evidence`, `review_content` and `manage_connection`.
2. Database transaction sequence diagram covering operation-first and revocation-first outcomes, deadlock prevention and lock-wait clock semantics.
3. Adversarial test results for *actual* API handlers and persisted session/membership/grant rows, per CVI-1C.81.
4. Audit and incident-recovery specification for disabled sites and deliberate bootstrap reactivation.
5. Read-only attestation of actual deployed Railway command/image/schema state (not inferred from Dockerfile).
6. Signed or recorded decision in GitHub issue #1143, including remaining conditions and separation of staging versus production authorization.

## Status / safe next step
All gates are **pending accountable review**. The next safe engineering action is to classify remaining unreviewed static source writers or prepare purely disposable test fixtures that do not create production permissions. Do not implement a runtime `edit_draft` grant, alter handler auth, activate 0012–0016 in real environments, or interpret this worksheet as release permission.

Documentation-only. No production database use, migrations, providers, crawling, publishing, merges, or deployments.

# CVI-1C.54 — Disposable Proposal-Draft Authorization Test Plan

## Dependency and status
Stacked on CVI-1C.53 draft PR #1103, HEAD `437a522e9fc23d96acfab75fb25392292a2a39d9`. Parent CI https://github.com/intssere/SEO_ENGINE/actions/runs/38148118485 was pending when this plan was written. This is a **design/test-plan increment**, not runtime authorization implementation.

## Test harness boundary
Use the already isolated disposable PostgreSQL authentication harness `artifacts/api-server/src/lib/cvi-gsc-disposable-authenticated-session.ephemeral.test.ts`, with localhost test-only database and synthetic organization/site/plan/session records. Any future ACL-migration tests must explicitly apply dormant CVI migration `0012` (and prerequisite migrations) only to a separate disposable database; the inspected runtime bootstrap does not apply it. Never seed a real site or use real credentials, providers, CMS, crawling or production services.

## Preconditions / blockers
The draft ACL only defines `read_evidence`, `review_content`, `manage_connection`; it **does not** provide a canonical `edit_draft` permission. No test should fake an existing production capability or rename `review_content` to edit authority. An authorized schema/policy decision and independent security review are prerequisites for implementing a real mutation guard. `AUTH_ENFORCEMENT_ENABLED` behavior must be separately approved, with fail-closed deployable environments.

## Proposed bounded test sequence
1. **Synthetic policy contract only**: exercise independently authored in-memory `canEditDraft` predicates for global operator/admin status, editor/owner membership, site identity, explicit synthetic edit grant, and active/effective/unexpired state. Clearly label the grant synthetic and not present in the current draft schema.
2. **Session serialization**: reuse disposable PostgreSQL `auth_sessions` and `SELECT ... FOR UPDATE` to demonstrate demotion/revocation-before-check denial, operation-first commit, idle and absolute expiry, with no real `action_plans` mutation.
3. **Disposable ACL serialization (only following explicit approval)**: apply dormant `0012` to an ephemeral database; lock site, session, membership and grant in a reviewed global order and verify revocation interactions. Do not invent a mutation grant inside schema without approval.
4. **Representative isolated handler testing (separately approved)**: stage an instrumented draft-edit adapter or existing handler against disposable DB with authorizing schema, ensuring request-derived session, tenant/site matching, stale fingerprint rollback, and no public write. Only after this stage may an actual production handler integration be proposed.

## Acceptance criteria
- Every denied request leaves zero synthetic mutation rows.
- Authorized operation commits at most one intended record; concurrent revocation ordering has deterministic outcomes.
- Expired, revoked, cross-site, missing membership, insufficient role, and stale draft cases fail closed.
- No side-effecting provider calls or public CMS operations occur.
- No false claims of deployment, migration activation, or general production endpoint protection.

## Rollout decisions still required
Formal owner approval for: global role-to-site policy; operation-specific `edit_draft` capability; auth-disabled production fail-closed policy; unified lock ordering; and any draft ACL schema amendments. A CI-green test plan does not resolve those decisions.

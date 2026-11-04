# PILOT-01 RT01-A4 — Disconnected trusted identity and site authorization

## Authorization and scope
Owner authorized GitHub as canonical engineering system and Railway as an **intended**, not certified or deployed, platform. Replit remains unchanged as a legacy fallback. Scope is GitHub source-only, mock-backed identity/tenant/site/issuer boundary; no Production SQL or migrations, runtime integration, provider operations, deployment, activation or public-site changes.

Baseline commit: `96ee76781173b7719015a78fcd56e0eee7849410` (PR #1293 merged; post-merge CI success).

## Concrete findings in existing code
- `auth-foundation.ts`: server-side session evidence includes sessionId, Google OIDC subject, allowlisted application role, expiry; `auth_sessions` is backed by PostgreSQL. Auth enforcement is **configurable** and disabled if `AUTH_ENFORCEMENT_ENABLED` is false. This does not establish tenant/site membership.
- `auth-security.ts`: middleware can check role and CSRF, but `verifiedActorId` returns `auth_enforcement_disabled` when auth is disabled. A runtime pilot must **not** use that fallback as identity.
- `0001_core.sql`: `sites.organization_id` links sites to organizations. There is no trusted per-user membership claim or issuer delegation in this source migration.
- `0002_auth.sql`: session records have subject, email and role but no organization membership, site grant, issuer lineage or pilot-specific scope.
- `pilot.ts`: existing short-lived pilot token is not an authenticated, tenant-bound, single-use database grant.

## Offline design
`pilot-01-trusted-site-context.ts` accepts **injected evidence ports**, not HTTP request objects:
- A server-verified session (subject, session, role, revocation status, expiry).
- A site registry record binding the selected site to one active organization.
- An independently stored active organization membership for the same subject.
- An independently stored active issuer grant delegating exactly one read-only operation for that organization/site/actor.
- An injected clock for deterministic tests.

Only a matching, non-expired, active chain produces immutable `VerifiedGrantContext`, with the role downgraded to the least privileged session/membership role. The only operations are `analyze` and `recommend`. Missing evidence and contradictory facts return `denied`; port errors and invalid clock return `unavailable`. No grant is issued or consumed, and success is never an execution permit.

`pilot-01-trusted-site-context.test.ts` uses synthetic injections for cross-tenant/site/actor, revoked/expired sessions, missing membership, role downgrades, issuer scope failures, unsupported write operations, exception fail-closed and no dispatch. No database or external network is touched.

## Release blockers
1. The injected evidence **does not establish** the authenticity of the caller or trustworthiness of the port implementation. A later server-owned request adapter must bind the request to a server-verified, enforcement-on session and reject any client-provided principal or organization.
2. There is no canonical organization membership / site role / issuer delegation persistence model or migration certified across actual UGP/CVI database history. This mock boundary must not be wired to Production.
3. Existing `AuthPrincipal` application roles are `viewer/operator/admin`; `VerifiedGrantContext` roles are `analyst/admin`. This prototype maps operator to analyst **only after** server-side active membership verification; this is a policy candidate requiring independent security review.
4. Issuer identifiers are arbitrary in the mock and are **not** cryptographic signatures, owner approvals or signed durable receipts. Issuance provenance, revocation, nonce and replay boundaries require separately certified design.
5. No job lease fencing, transactional outbox, read-only provider consent, schema/migration certification, lost-commit acknowledgement recovery, or runtime activation has been achieved.

This code must remain disconnected from `pilot-orchestration.ts`, `routes/pilot.ts`, startup, workers and `pilot-01-pg-grant-disposable.ts` until independently reviewed and separately authorized. Preserve `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`. No merger without owner exact-HEAD approval.

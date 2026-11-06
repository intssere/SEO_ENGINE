# PILOT-01 RT01-A12.7 — Trusted membership and issuer custody, disconnected design

**Authority:** owner-approved source-only design, mock-backed revocation and cross-tenant tests, dedicated branch and draft PR. There is **no** operational data access, SQL execution, migration, integration, worker startup, provider operation, deployment, public-site write or merge authority.

## Existing boundaries and new design

The current canonical `lib/db/migrations/0002_auth.sql` declares `auth_sessions` with subject, global role, expiry and revocation, but **no organization membership or issuer-custody tables**. `artifacts/api-server/src/lib/pilot-01-trusted-site-context.ts` and `pilot-01-rt01a11-trusted-runtime-boundary.ts` are already explicitly disconnected/mock-backed and cannot authenticate a live request. The A12.4 `ServerVerifiedPrincipal` marker does not authenticate itself. The A12.5 PostgreSQL test adapter accepts synthetic markers only and is NOT an authorized runtime path.

A12.7 introduces a **separate disconnected verifier** `lib/db/src/pilot-01-rt01a12-7-disconnected-custody.ts`, with only these independently injected evidence sources:

- **Session:** server-side resolved current session ID, subject, global role, expiry, revocation and active status. Intent cannot set subject or organization. A missing/revoked/expired/viewer session denies before other lookups.
- **Site:** exact requested site ID, active status and organization ownership. Organization ID must come from this independent site source.
- **Membership:** resolved by session subject and site-derived organization, independently confirming identity, organization, scoped role, active status, revocation, expiry and positive monotonic revision. Global role alone never grants organization access.
- **Issuer:** resolved from server-owned custody storage (future implementation), independently confirming issuer ID, organization, site, subject, read-only operation, active status, revocation, expiry, SHA-256 provenance and positive monotonic revision. Candidate fields from requests are only lookup keys.
- **Clock:** test-injected finite clock; no claim this can provide trusted database time or a consistent snapshot in real integrations.

All checks fail closed: explicit mismatches or revoked/expired evidence return `denied`; source errors and invalid clock return `unavailable`. A verified synthetic principal is frozen and carries exactly the resolved scope plus issuer provenance and revisions; it is **not transferable proof** or a production access token.

## Testing and limitations

The offline tests use only in-memory evidence adapters. Negative cases include subject mismatch, cross-organization membership, wrong site, wrong issuer, cross-tenant custody, changed operation, stale/expired session, revoked membership, revoked issuer, malformed hash, unsupported write operation, invalid revision and unavailable evidence sources.

**Important security limitations:** This is only a disconnected design. It cannot establish actual session enforcement, authenticated issuer ownership, revocation serializability, cryptographic provenance authenticity, real role custody, database/RLS authorization or a durable trust boundary. A SHA-256-shaped field is not a signature. Even if all four lookups pass, revocation may occur before a later transaction. A real admission adapter must re-check authorization and version/revocation inside the same transaction or enforce equivalent serializable version-fenced custody, with server-owned issuance and audited revocation. Must test race cases and least-privilege policies separately. **Do not treat this module as runtime authorization.**

Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`. Candidate SQL remains outside `lib/db/migrations`; no role grants, migration, runtime export, route or worker integration is included.

## Future acceptance and merge gates

Source-only gate: Standard CI and dedicated A12.7 offline CI must pass on exact HEAD, Tahseen must submit a formal GitHub `APPROVED` review, and the owner must separately authorize the exact PR+HEAD merge. Even after merging, authentic tenant membership persistence, issuer custody, and role policy still need separately authorized implementation/verification; no live or existing DB access is approved.

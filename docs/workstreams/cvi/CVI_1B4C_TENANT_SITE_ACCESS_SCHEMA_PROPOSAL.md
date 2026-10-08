# CVI-1B.4C — tenant/site authority persistence and trusted read-path proposal

Date: 2026-10-08
Status: SOURCE-INSPECTED PROPOSAL ONLY. NO SQL MIGRATION FILE, DDL EXECUTION, OR PRODUCTION AUTHORIZATION.
Repository: intssere/SEO_ENGINE

## Root cause: existing primitives do not establish multitenant membership

Source code inspected at CVI-1B.4B branch head `6b2438a22d030fc5874692b0214970d6e74126e4`:

| Source | Actual contract | Missing |
|---|---|---|
| `lib/db/migrations/0001_core.sql` | `organizations(id)`, `sites(id,organization_id,canonical_origin,is_active)`, `connections(id,site_id,provider,scopes,status)` | authenticated principal-to-organization/site membership; resource-specific read grant |
| `lib/db/migrations/0002_auth.sql` | `auth_sessions(subject,email,role,expires_at,revoked_at)` | tenant/site authorization; cross-session membership revocation |
| `artifacts/api-server/src/lib/auth-foundation.ts` | authenticated `AuthPrincipal` with subject, session and application-wide viewer/operator/admin role | site membership and connection ownership authority |
| `artifacts/api-server/src/lib/oauth.ts` | queries `sites`/ `connections` for `diamondshelf.us`, including provider credentials/status | general authorized scoped resolver for multiple organizations |
| `artifacts/api-server/src/lib/connection-broker-contract.ts` | connection and credential state; `grantsAuthorization=false` | signed ownership or tenant access grant |
| `artifacts/api-server/src/lib/site-ownership-evidence-contract.ts` | crawl/search observation of pages and query performance | authenticated legal or tenant ownership verification |

**Do not infer access from** admin role, domain string, connection status, canonical origin, matching digest, OAuth credential availability, or provider-discovered resource.

## Proposed separately governed additive migration (NOT APPROVED OR CREATED)

1. `organization_principal_memberships`
   - `id uuid primary key`
   - `organization_id uuid not null references organizations(id)`
   - `auth_subject text not null` (immutable OIDC subject, not mutable email)
   - `role text check in ('viewer','editor','owner')`
   - `status text check in ('active','suspended','revoked')`
   - `effective_at timestamptz not null`, `expires_at timestamptz null`, `revoked_at timestamptz null`
   - `granted_by_subject text`, `grant_reference text`, `created_at,updated_at`
   - unique logical key `(organization_id,auth_subject)` with explicit revocation history in separate append-only audit ledger rather than destructive update.
2. `site_principal_grants` (only if organization membership alone is insufficient)
   - `id uuid primary key`, `site_id uuid references sites(id)`
   - `organization_membership_id uuid references organization_principal_memberships(id)`
   - `permission text check in ('read_evidence','review_content','manage_connection')`
   - `status`, `effective_at`, `expires_at`, `revoked_at`, audit references.
   - unique active grant key across member/site/permission.
   - **Cross-org constraint:** a membership to organization A MUST NOT grant any site belonging to B. Require transaction-level query binding or an appropriately validated composite FK/trigger; ordinary independent FKs do not enforce this.
3. `site_connection_authority` (only with separately approved provider ownership/custody requirements)
   - Binding to `connections.id`, `sites.id`, resource URI/fingerprint, source status/confirmed-at.
   - Record allowed *read-only* capabilities and custody, but no provider mutation rights.
   - Verify connection.site_id matches selected authorized site; status `connected` alone is insufficient.
4. Append-only `tenant_authorization_audit` for issuer, principal, grant revision, revocation, request correlation and effective policy.
5. Default **no memberships / no grants / DENY** on deployment until explicit onboarding, migration proof and qualified membership bootstrap authorization.

## Trusted read-only resolver contract

Inputs **must originate inside server**:
- `req.auth` subject/session from authenticated middleware, never request JSON
- target site ID/resource identity selected and scoped by server, not trusted solely because supplied by requester
- explicit request timestamp and required operation `read_evidence`
- policy version and request correlation

One transaction/read snapshot should:
1. Recheck active auth session, exact subject, expiry and revoked_at.
2. Resolve site -> organization from first-party database, requiring site.is_active.
3. Resolve active organization membership for matching OIDC subject, effective/expiry interval, not revoked.
4. Resolve site-specific permission where required, validating organization linkage.
5. Resolve selected connection by connection.site_id plus active, nonrevoked read scopes, resource binding and freshness.
6. Cross-check authorized site with UGP universal site identity and source evidence lineage.
7. Return DENY/NOT_RESOLVED until complete; only issue VERIFIED_READ when **all** predicates pass.
8. Recheck before any future operation; no stale authorization receipts or implicit elevation to publication.

No independent provider request is authorized by this design. The resolver's read-only SQL and tenancy model must be separately implemented and tested. No new SQL has been executed.

## Key schema and integration safety tests

- Unknown subject, wrong org, wrong site, cross-org grant, revoked membership/site/connection, inactive site: deny.
- OAuth data present but no principal membership: deny.
- Global admin with no organization membership: deny.
- Membership active but site-specific grant missing: deny when required.
- Competing site names or identical domains in different orgs: never cross-access.
- Expired or changed auth session between request and resolver lookup: deny.
- Concurrent grant revocation or site transfer: ensure snapshot/read revision or revalidation semantics prevent stale approvals.
- Missing migration/schema: readiness=false/deny; no fallback to permissive role-based access.
- Verify scoped SQL queries and indexes; never concatenate unchecked identifiers.
- Test tenant onboarding/backfill explicitly in disposable non-production database; preserve all historical rows and existing connection credentials.
- No permission to publish or mutate provider is ever conveyed by READ grant.

## Engineering delivery gates

A. Review this additive schema and tenancy policy. Determine whether `site_principal_grants` is necessary or organization membership is adequate for v1.
B. Inspect actual application tenant/site lifecycle and identify any competing canonical identity or grant source before schema edits.
C. Author **migration file only**, tests and verified rollback strategy on new task branch, after approval of exact schema.
D. Run ephemeral PostgreSQL FK/index/tenant-isolation/race tests, typecheck and full repo CI at exact head.
E. Separately authorize disposable deployment/schema validation; production schema mutation and membership bootstrap require explicit bounded authorization.
F. Integrate trusted resolver only after schema proof and exact auth middleware boundary review. Keep CVI-1B.4B unresolved until then.
G. Human editor/legal/business source truth and publication authorization remain independent gates.

## Cross-workstream boundaries
- Do not edit UGP content-publishing or P12.2 runtime/persistence as part of tenancy schema planning.
- No merge, deployment, credential mutation, CMS publication or provider call has occurred.
- The source inspected is not a runtime snapshot; current production schema and auth flags remain unverified.

# CVI-1B.4B — server-session context adapter handoff
Date: 2026-10-08
Status: DRAFT STACKED PR; CI PENDING; NOT A TENANT RESOLVER

## Baseline and stack
- PR #923 CVI-1A, PR #928 CVI-1B.1, PR #931 CVI-1B.2, PR #932 CVI-1B.3, PR #935 CVI-1B.4: exact-head CI SUCCESS; all draft/unmerged.
- PR #935 HEAD 1e1addf82dcfb6c960ff7ee56da419c1af15c325 CI run 37817266472 SUCCESS.
- New PR #937 https://github.com/intssere/SEO_ENGINE/pull/937
- Branch: workstream/cvi-1b4b-session-context-pr935-dependent
- Base: workstream/cvi-1b4-authority-admission-pr932-dependent
- PR #937 exact HEAD at creation: 6b2438a22d030fc5874692b0214970d6e74126e4
- CI proof branch ugp-cvi-1b4b-ci-proof-20261008 created at identical head. Check exact-head CI outcome. Do not merge proof branch.

## Source-level findings
- artifacts/api-server/src/lib/auth-foundation.ts: AuthPrincipal contains authenticated session, subject, role, issued/lastSeen/expires timestamps but NOT tenant membership/site grants.
- artifacts/api-server/src/auth-types.d.ts makes req.auth available for authenticated requests.
- lib/db/migrations/0002_auth.sql defines auth_sessions and auth_audit_events, neither grants tenant/site membership.
- artifacts/api-server/src/lib/connection-broker-contract.ts defines connection handles and a broker policy with grantsAuthorization=false. A connected handle is not authenticated site access.
- artifacts/api-server/src/routes/connections.ts shows provider connections, but no independent per-tenant site authorization receipt suitable for CVI.
- UGP site-ownership-evidence-contract is observed crawl/query-page evidence, not legal/customer site ownership authorization.

## Implementation
- artifacts/api-server/src/lib/cvi-session-context-adapter.ts
- artifacts/api-server/src/lib/cvi-session-context-adapter.test.ts
- deriveUnresolvedCviAccessContext takes an already-authenticated server AuthPrincipal, explicit UTC reference time and target scope; requires valid non-expired session, well-formed scope and binding digest.
- ALWAYS emits access=NOT_RESOLVED, connectionAccess=NOT_RESOLVED, tenantMembershipSource=unresolved, accessSource=unresolved, even for admin role.
- No route or production caller added, and no DB/network/provider/publish operations.
- It is a pure function and cannot distinguish server-principal objects from forged JSON at runtime; invoking it with untrusted JSON is forbidden. All values remain unprivileged regardless.

## Remaining actual trust-resolver work
1. Confirm a real tenant/workspace/site membership model and durable server-side ACL/connection ownership record. If absent, design an explicitly separately authorized schema increment, rather than guessing that role=admin implies site ownership.
2. Bind principal, membership, connection status and canonical site identity in one authenticated server-side transaction/snapshot. Define revocation and bounded freshness.
3. Resolve source and user authority without external writes; verify read scopes and site ownership by independently trusted records.
4. Return access VERIFIED_READ only from a trusted backend service with tests for wrong tenant/site, revoked session, stale connection, replay, actor changes and privilege escalation. Still never return publishing authorization.
5. Introduce a protected API boundary only following review and permissions threat model; maintain complete dependency trace and exact-head CI.
6. All stacked PRs remain draft, no merge, no deployment until explicit authorization.

## Safety
No production changes, migrations, access upgrades, worker activations, provider calls, or CMS mutations have occurred.

## CVI-1B.4C schema source audit — 2026-10-08
- New committed design: `docs/workstreams/cvi/CVI_1B4C_TENANT_SITE_ACCESS_SCHEMA_PROPOSAL.md` (CVI docs branch), specifying additive membership/site read grants and their governance.
- Canonical core SQL `lib/db/migrations/0001_core.sql` already creates organizations, sites linked to organization_id, and connections linked to site_id. `0002_auth.sql` holds sessions/audit only. Neither defines principal membership to organization/site.
- `artifacts/api-server/src/lib/oauth.ts` includes DiamondShelf-specific site lookup/connection access; it is NOT a tenant-scoped resolver.
- No schema migration, membership backfill, persisted grant, trusted authorization resolver or production change was implemented. Before any access promotion to VERIFIED_READ, require separately governed migration, verified ACL and immutable audit/proof.
- PR #937 exact HEAD `6b2438a22d030fc5874692b0214970d6e74126e4`: GitHub validate run 37822656300 still IN_PROGRESS at last observation. Check terminal status before accepting the increment.

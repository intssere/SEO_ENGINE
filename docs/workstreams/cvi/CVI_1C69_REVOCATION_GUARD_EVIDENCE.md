# CVI-1C.69 — Membership and Grant Revocation Guard Evidence

## Source baseline
Stacks on draft PR #1126 at `8818aec5b69ae9acc9f573554a3cff71be42a4c2`. This is a read-only code/schema audit, not operational proof or permission approval.

## Dormant membership and grant schema
`lib/db/migrations/0012_cvi_tenant_site_acl_draft.sql` defines membership states `active`, `suspended`, `revoked` and a revocation-status/timestamp consistency constraint (lines 11–18). Site read-grant rows have `active`/`revoked` status and their own revocation consistency constraint (lines 34–47). The event vocabulary includes `membership_revoked` and `site_grant_revoked` (lines 64–65). These are schema-level states, **not proof that live revocation APIs exist or use a particular lock order**.

## Acquisition revocation serialization
`lib/db/migrations/0016_cvi_acquisition_revocation_serialization_draft.sql` uses `FOR SHARE` with site row (line 17), provider connection (28), live auth session (35–36), active organization membership (42–45), and active read grant (54–56), in that order. Those shared locks conflict with updates to the protected rows and protect the dormant acquisition nonce admission boundary. This trigger checks a read-related grant, not a site-scoped draft-edit capability.

## Live proposal paths
`artifacts/api-server/src/lib/operational-data.ts` calls `sql.begin` to process proposal draft edits (295) and review decisions (221). The selected plan is locked `FOR UPDATE OF ap` (308 and 231 respectively). The actual proposal transactions do not re-lock the caller's session, organization membership, or site grant. The session loader independently updates `auth_sessions.last_seen_at` in `auth-foundation.ts:336–342`; revocation independently updates `revoked_at` at :382.

## Outstanding evidence and design decisions
- Inventory runtime API routes that modify `cvi_organization_memberships`, `cvi_site_read_grants`, the site status and connection status. Do not assume the presence of a route from the draft SQL event enum.
- Choose a **single globally reviewed lock order** across plan, site, connection, session, membership and grant, including reversal and rollback flows.
- Define `edit_draft` authorization separately from `review_content` or `read_evidence`; no such grant is currently certified.
- Confirm fail-closed behavior when auth enforcement is disabled, cross-tenant IDOR resistance and session expiry after transaction lock waits.
- Require explicit product, security, database and release-owner approval before implementing any production handler change or migration.

## Restrictions
No production database operations, handler code changes, new grants, ACL migration activation, provider calls, crawl/publication, merge or deployment. CI green is only test/build evidence, not approval.

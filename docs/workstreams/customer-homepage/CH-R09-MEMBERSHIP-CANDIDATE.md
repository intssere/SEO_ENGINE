# CH-R09 — Customer membership persistence candidate

Status: **proposed schema only, unexecuted**. This is not an authorized database migration, membership provisioning or multi-tenant enablement.

## Exact source
`lib/db/migrations/0015_customer_memberships_candidate.sql` contains two default-inactive tables and a composite site/organization foreign key. It is deliberately not registered with bootstrap, tests that count canonical tables, production deploy scripts or runtime routes.

## Model
- `customer_organization_memberships`: one server-established subject-to-organization grant, default inactive.
- `customer_site_memberships`: explicit subject-to-site grant under the same organization, default inactive.
- The composite reference `(site_id, organization_id)` prevents a site grant being attached to a different organization.
- Site access MUST require `organizations`'s linked site `is_active`, organization membership `active`, site membership `active` and equality to authenticated `AuthPrincipal.subject`.
- An application-wide `admin`/`operator` role does NOT imply customer site access.
- A missing or ambiguous selection, unavailable membership DB, mismatched organization, or unauthorized site must fail closed.
- No grants are auto-seeded, including for Diamond Shelf.

## Required independent review before enabling
1. Resolve migration number and dependency against all current main and integration-branch migrations; rename candidate to a conflict-free ordinal.
2. Check SQL migration in an ephemeral PostgreSQL database, including FK rejection, inactive defaults, revocation, cascading deletes and wrong-org rejection. Preserve existing canonical table-count assertions by scheduling explicit migration adoption, not silent bootstrap.
3. Implement parameterized, read-only server-side grant reader joining both membership tables and `sites` with active filters, plus negative tenant-isolation tests.
4. Ensure user bootstrap/provisioning has deliberate audited authority and does not grant memberships merely from email allowlist, role or provider OAuth.
5. Only then wire an authenticated `/api/ui/capabilities` endpoint. Keep all legacy fixed-Diamond-Shelf operators isolated; never assume runtime multi-site safety.

No merge, deployment, production queries or writes, provider activity or crawling permitted by this document.

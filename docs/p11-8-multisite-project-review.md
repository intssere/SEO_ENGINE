# P11.8 — multi-site/project abstraction review

## Decision

For v1 commercial scope:

> **Organization is the tenant/account boundary. Site is the SEO workspace/project boundary. Do not add a separate first-class `projects` table or domain entity.**

The current data model already has the correct hierarchy for a multi-site commercial product:

```
organization
└── site
    ├── connections
    ├── crawl_runs
    ├── pages
    ├── search_queries / search_metrics
    ├── evidence / findings / opportunities
    ├── action_plans → actions / approvals / deployments / rollbacks / verifications
    ├── experiments / outcomes
    ├── ai_queries → ai_responses / ai_citations
    ├── learning_signals
    └── jobs
```

A third `project` level would duplicate `sites` unless a future commercial requirement introduces a real grouping concept between organization and site.

Examples that could justify a future Project entity:
- a client/campaign containing multiple sites with its own lifecycle;
- a portfolio-level policy/budget distinct from the organization;
- a project that owns multiple domains/locales as one independently managed unit;
- independent project membership that is not identical to site access.

None of those requirements is currently established.

## Evidence reviewed

### Core schema

`lib/db/migrations/0001_core.sql` already defines:

- `organizations(id, name, slug, ...)`;
- `sites(id, organization_id, name, domain, canonical_origin, platform, locale, timezone, is_active, ...)`;
- uniqueness of `(organization_id, domain)`;
- direct `site_id` ownership for most SEO-domain tables;
- transitive site ownership for actions, approvals, deployments, rollbacks, verifications and related records.

This gives the repository a durable account → site hierarchy without a project table.

### Runtime loaders

The current runtime does **not** expose that hierarchy as a selectable context.

Examples:

- `loadDashboardData()` queries the active site where `lower(domain) = 'diamondshelf.us'`;
- `getRuntimeReadiness()` selects `diamondshelf.us` directly;
- operational loaders derive one `siteId` from that fixed domain and use it for performance, opportunities, actions and approvals;
- current API routes such as `/dashboard`, `/performance`, `/opportunities`, `/actions` and `/approvals` have no explicit site identifier.

Therefore the schema is multi-site-capable, but the current runtime contract is intentionally single-site.

### Connections/OAuth

The connection persistence schema is site-scoped, but current helpers are single-site:

- `save()` resolves `diamondshelf.us` before inserting/updating a connection;
- `list()` returns connections joined to the site whose domain is `diamondshelf.us`;
- Google property selection resolves the same fixed site before updating the stored connection;
- current UI wording and Task #53 checks contain Diamond Shelf-specific behavior.

A future multi-site implementation must make the selected site explicit before any OAuth state is created or credential is persisted.

### Authentication

Current `AuthPrincipal` contains:

- session ID;
- subject;
- email;
- display name;
- global role;
- CSRF/session timestamps.

It contains no:
- organization membership;
- site membership;
- site authorization set;
- selected organization/site context.

Current allowlist roles are global application roles, not tenant/site roles.

This is the most important missing isolation boundary for true multi-site commercial use.

### Frontend shell

The current application shell:
- has no organization selector;
- has no site/workspace selector;
- calls the dashboard without site context;
- uses global routes such as `/performance`, `/technical-seo`, `/connections`;
- exposes no selected-site state in the URL.

The product therefore cannot presently prove which site a user is operating on other than the backend's fixed Diamond Shelf binding.

## Canonical terminology for v1

### Organization

Meaning:
- customer account / tenant;
- parent security and billing boundary;
- owns one or more sites.

Do not use Organization as an SEO campaign object.

### Site

Meaning:
- one SEO workspace;
- one canonical website/domain context;
- the unit that owns provider connections, observations, crawl state, recommendations, governance and measurement.

For product copy, `Site` or `Workspace` is preferred.

If commercial copy wants to say "Project", it may be a **presentation alias for Site only**. It must not create a second persisted identity or ambiguous hierarchy.

## V1 scope decision

A separate Project abstraction is **not required** for the current v1 architecture.

Adding a project table now would create:
- duplicate ownership questions;
- ambiguous routing;
- redundant foreign keys;
- unnecessary migration and authorization complexity;
- risk of records disagreeing about project vs site ownership.

The correct next multi-site work, if commercial scope requires it, is not "add projects"; it is "make existing site scope explicit and authorized end-to-end."

## True multi-site activation prerequisites

Multi-site support must remain blocked until all of the following exist.

### 1. Membership model

There must be a server-authoritative mapping from authenticated principal to allowed organization/site scope.

Required semantics:
- one principal may belong to one or more organizations;
- site access is derived from organization membership or explicit site membership;
- role must be evaluated inside the selected tenant/site scope;
- the browser must never be able to grant itself access by supplying an arbitrary site ID.

A future implementation may require new membership persistence, but P11.8 does not authorize that migration.

### 2. Explicit request scope

Every site-owned API request must resolve one selected site before data access.

Preferred future shape:

```
/api/sites/:siteId/dashboard
/api/sites/:siteId/performance
/api/sites/:siteId/opportunities
/api/sites/:siteId/actions
/api/sites/:siteId/approvals
/api/sites/:siteId/connections/status
```

Equivalent explicit request-scoping mechanisms may be used, but hidden global state is not sufficient.

The server must:
1. parse the site identity;
2. resolve the site's organization;
3. verify principal access;
4. reject unauthorized or unknown site scope;
5. pass one immutable scoped identity to all downstream loaders.

### 3. No ambiguous default site

Fail closed when:
- the user can access more than one site and no site was specified;
- a supplied site ID is unknown;
- a site belongs to an organization the principal cannot access;
- request state and record ownership disagree.

A transitional implicit site may exist only when the principal has exactly one authorized active site and the behavior is explicitly documented/tested.

No runtime may silently fall back to Diamond Shelf once multi-site mode is enabled.

### 4. Loader scoping

All site-owned loaders must accept an explicit scoped site identity.

Forbidden future pattern:

```ts
SELECT id FROM sites WHERE lower(domain) = 'diamondshelf.us'
```

Required pattern conceptually:

```ts
loadDashboardData(scopedSite)
loadOperationalList(scopedSite, kind)
loadPerformance(scopedSite, filters)
```

The loader must not independently choose a tenant/site.

### 5. Connection/OAuth binding

OAuth state must bind:
- organization ID;
- site ID;
- provider;
- return target/purpose;
- existing anti-CSRF/state values.

At callback time the server must:
- revalidate the signed site identity;
- verify the principal still has access;
- verify the returned provider resource belongs to the intended site;
- persist the credential only to that exact `site_id`.

Connection listing and mutation must never query by fixed domain or "latest connection" across sites.

### 6. Execution/governance isolation

ID-based routes are not enough by themselves.

For actions, approvals, executions and rollbacks, the server must verify that:
- the record belongs to the selected site;
- the selected site is authorized for the principal;
- any referenced opportunity/page/action plan belongs to the same site;
- preflight, authorization, idempotency and rollback identities include the site boundary.

A valid record ID from another site must return a fail-closed authorization/not-found response and must never expose cross-site data.

### 7. Background work

Site-owned jobs already support `site_id`, but future multi-site execution must require non-null site identity for all site-specific work.

Idempotency/lease/work identities must include site identity so work for two sites cannot collide.

Global maintenance jobs may remain site-null only when their global semantics are explicit.

### 8. Frontend workspace context

A future multi-site UI needs:
- visible current organization/site;
- accessible site switcher;
- selected site encoded in a durable/bookmarkable route or equivalent explicit context;
- safe navigation when changing site;
- cache/query keys including site identity;
- no stale data from the previous site after switching;
- Connections/Settings/reporting clearly scoped to the selected site.

Recommended route concept:

```
/sites/:siteId/
/sites/:siteId/performance
/sites/:siteId/technical-seo
...
```

This is an architecture recommendation only, not implementation authorization.

### 9. Isolation testing

Before multi-site can be certified, deterministic tests must prove:
- user A cannot read user B's organization/site;
- site A cannot load site B's rows by guessed IDs;
- OAuth callback cannot rebind to a different site;
- cache/query state cannot leak across site switches;
- background jobs remain site-isolated;
- approvals/execution cannot cross site boundaries;
- audit records carry enough site context to investigate an action.

## What can remain single-site in v1

If final commercial scope is one organization with one active site:
- current global routes may remain unchanged;
- current Diamond Shelf binding may remain an explicitly documented single-site deployment behavior;
- no membership/schema migration is required for P11.8;
- no site switcher is required;
- the existing `organizations` and `sites` schema should still be preserved because it avoids future destructive remodeling.

This is acceptable only if product claims do not imply multi-site or multi-client tenant isolation.

## What must not be claimed today

The current application must not be described as:
- multi-tenant;
- multi-site ready at runtime;
- agency/client-isolated;
- site-switchable;
- cross-tenant authorization certified.

The schema can represent multiple sites, but end-to-end identity and request authorization are not yet implemented.

## Architecture status matrix

| Layer | Existing state | Multi-site readiness |
|---|---|---|
| Organization schema | First-class | Suitable |
| Site schema | First-class child of organization | Suitable |
| SEO domain data | Mostly site-scoped | Suitable foundation |
| Jobs | Optional site scope | Requires site-required semantics for site work |
| Auth session | Global role only | Not ready |
| Membership | No organization/site membership model | Missing |
| API routing | Global paths | Not ready |
| Loaders | Hard-bound to Diamond Shelf | Not ready |
| Connections/OAuth | Schema site-scoped, runtime hard-bound | Not ready |
| Frontend site context | None | Missing |
| Cross-site isolation tests | None certified | Missing |
| Separate Project entity | None | **Not required for v1** |

## P11.8 outcome

**Architecture decision: REVIEW COMPLETE when merged.**

- Keep `organizations`.
- Keep `sites`.
- Treat Site as the commercial SEO workspace/project identity.
- Do not introduce a separate project table for v1.
- Keep runtime multi-site activation blocked.
- If multi-site becomes a commercial v1 requirement, open a new implementation sequence for membership + scoped API/context + connection isolation + UI switching + cross-site tests before any production activation.

## Safety boundary

This review performs no:
- schema migration;
- Production DB/storage read/write/DDL/DML;
- tenant/site provisioning;
- auth/session change;
- API/runtime implementation;
- frontend site switching;
- provider/OAuth request;
- background-worker activation;
- public-site mutation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

## Next boundary

After this review is certified and closed, the next roadmap stage is:

**P11.9 — retention/privacy/provider terms and compliance review.**

# P11.8 — multi-site/project abstraction review closeout

## Milestone

Roadmap P11.8 — multi-site/project abstraction if required for v1 commercial scope.

- issue: #364
- review PR: #365
- review base SHA/tree: `b3cdad0f1b7c2853e3f80b1624072e2be65fbdae` / `2bb00656cac0685f43a07ffe2cbcbff280832fb0`
- exact reviewed head/tree: `893ff51157cfbc9db05ff89cc569e3d1024078e5` / `009a4225e9825c763b01f64d5aa5ef14a09007a9`
- exact-head PR CI: #646 / run `35615799086` — success
- review merge/tree: `7a47acfeede05b3e9a4ab7a1dd1f6ce670245bc7` / `009a4225e9825c763b01f64d5aa5ef14a09007a9`
- post-merge main CI: #647 / run `35616390237` — success
- canonical GitHub Chromium: **110/110 PASS**
- full typecheck/build/P11.1 budget gate: PASS

## Architecture decision

For v1 commercial scope:

- **Organization = tenant/account boundary.**
- **Site = SEO workspace/project boundary.**
- **Do not introduce a separate first-class Project entity/table.**

The existing `organizations → sites` hierarchy already provides the durable account/workspace relationship. Adding a Project object now would duplicate Site ownership without an established commercial requirement.

A future Project entity would need a genuine purpose between organization and site, such as a multi-site campaign/client portfolio with its own lifecycle, policy, membership or billing boundary.

## Evidence

The review confirmed:

- `lib/db/migrations/0001_core.sql` already defines organizations and child sites;
- most durable SEO state is directly or transitively scoped to `site_id`;
- dashboard/runtime readiness currently resolves `diamondshelf.us` directly;
- operational loaders derive one site from that fixed domain;
- OAuth connection save/list/property selection also resolves the fixed Diamond Shelf site;
- API routes are global and do not carry explicit site identity;
- current `AuthPrincipal` has subject/email/global role but no organization/site membership;
- frontend shell has no site/workspace selector or durable site route context.

Therefore the schema is multi-site-capable, but the application is **not** certified as multi-site or multi-tenant at runtime.

## Multi-site activation prerequisites

True multi-site support remains blocked until a separately governed implementation provides:

1. server-authoritative organization/site membership;
2. role evaluation inside the authorized tenant/site scope;
3. explicit fail-closed site scope on site-owned API requests;
4. no ambiguous implicit/default site once a principal can access more than one site;
5. site-scoped loaders that never independently choose a tenant/site;
6. OAuth state/callback/connection persistence bound to the exact organization/site;
7. execution, approval, rollback and record-ID ownership checks against the selected site;
8. site-aware job, idempotency and lease identities;
9. visible frontend organization/site context and safe switching;
10. cache/query isolation across site switches;
11. deterministic cross-site isolation tests.

## Replit

Replit was Git-only reconciled to the exact review merge/tree:

- branch `main`;
- HEAD `7a47acfeede05b3e9a4ab7a1dd1f6ce670245bc7`;
- tree `009a4225e9825c763b01f64d5aa5ef14a09007a9`;
- origin/main exact;
- ahead/behind `0/0`;
- tracked 0;
- untracked 0;
- clean;
- Git locks 0;
- no active repository writer.

A follow-up Replit non-browser validation request was not queued because the Agent channel became busy. No additional Replit test-run result is claimed.

## Boundaries preserved

P11.8 is review/documentation only and unpublished.

It performed no:

- new table or migration;
- Production DB/storage read/write/DDL/DML;
- tenant/site provisioning;
- data migration;
- authentication/session schema change;
- API/runtime implementation;
- frontend site switching;
- OAuth/provider request;
- public-site mutation;
- worker/scheduler activation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

## Next safe boundary

P11.9 — retention/privacy/provider terms and compliance review.

Generic continuation may inventory data classes, retention/deletion semantics, privacy exposure, credential/token handling, logs/audit/evidence retention, and current provider-policy/terms obligations using repository evidence and current official documentation where needed.

It does not authorize production data deletion/migration, retention-job activation, secret/token rotation or revocation, provider-account mutation, new external data collection, Production DB/storage mutation, runtime/deployment changes, workers/schedulers, Task #51/#53/#54 execution, P9.8 implementation/activation, deployment or publication.

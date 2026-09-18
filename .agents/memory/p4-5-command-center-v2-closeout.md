# P4.5 — Command Center v2 Closeout

P4.5 is a frontend/read-only product-system engineering milestone under issue #208 / PR #209.

## Canonical implementation

- `artifacts/seo-engine/src/lib/command-center-model.ts`
- `artifacts/seo-engine/src/pages/dashboard.tsx`
- Command Center styles in `artifacts/seo-engine/src/index.css`
- source contract: `artifacts/seo-engine/src/command-center-contract.test.mjs`

## Read-only Command Center contract

The root `/` route remains the Command Center and consumes the existing generated `DashboardSnapshot` through the existing GET hook only.

The presentation model derives:
- data health;
- crawl/certification coverage;
- decision/approval workload;
- verification state;
- measured impact;
- AI/learning availability.

Honesty rules:
- unavailable data is danger;
- live stale data is warning;
- whole-site certification is the only successful coverage state;
- bounded pilot coverage remains warning/bounded;
- pending approvals remain human-review warnings;
- verification/impact regressions are danger;
- zero or unavailable AI/learning observations remain neutral rather than success;
- descriptive counts do not grant or imply execution authorization.

## Capability reduction on Command Center

P4.5 deliberately removes actionful controls from the dashboard surface:
- no `getPilotAuthorization`;
- no `startPilotRun`;
- no Run Baseline / Refresh Data button;
- no Command Center Ask action;
- no mutation hooks;
- no direct network/database/runtime execution primitive.

Command Center interactions are limited to:
- URL/reporting filters;
- existing GET-only dashboard refetch;
- route navigation to governed workspaces such as Connections, Technical SEO, Opportunities, Approvals, Deployments and Impact.

This does not delete underlying historical pilot APIs or change their authorization policy; it only keeps the Command Center itself read-only.

## Validation

Initial Replit validation identified one task-local TypeScript integration requirement: when custom TanStack query refetch options are supplied, the generated hook requires an explicit `getGetDashboardQueryKey(dashboardParams)`.

Corrected implementation head:
- SHA `c964ab92201bebf6cec6dcd505feb7e33989b184`
- tree `a4e522d3a36e5f044a85b676fc37e05d2d9ce542`

Replit validation on that exact head:
- SEO Engine tests: 51 passed
- recursive workspace tests: passed
- SEO Engine/full typecheck: passed
- SEO Engine/full build: passed
- `git diff --check`: passed

Exact-head GitHub CI run `35327459615`: success.

Final merge still requires green CI on the exact docs-complete PR head.

## Safety boundary

P4.5 does not authorize or perform publication/deployment, provider/public-site requests or mutation, Production DDL/DML, observation/evidence Production persistence/reads, first-party full-site live network execution, scheduler/worker activation, Task #53/#54 execution, secret/config changes, or autonomous capability activation.

Default next safe milestone after certified P4.5 closeout: **P4.6 — Full-Site Audit / Crawl Explorer UI**. Real P1 live-provider activation remains a separately authorized alternative.

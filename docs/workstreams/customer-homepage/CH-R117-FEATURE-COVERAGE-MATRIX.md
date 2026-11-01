# CH-R117 — SEO ENGINE customer design feature coverage and backlog

**Scope:** source-only design audit of `intssere/SEO_ENGINE` Customer Home PR #1150, checkpoint 2026-11-01. Not a certification that all repository modules have been exhaustively inspected. No live customer APIs, provider operations, migrations, deployment or merge authorized.

## Source baseline
- `MASTER_COMPLETION_ROADMAP.md`: six target domains (Command Center, Discover, Audit, Execute, Measure, System), feature-level quality criteria, authorization/observability.
- `artifacts/seo-engine/src/App.tsx`: nine isolated customer routes plus separate legacy/operator/informational routes.
- `artifacts/seo-engine/src/components/customer-preview-layout.tsx`: standalone `/home`, light customer workspace sidebar on eight other routes.
- `artifacts/seo-engine/src/navigation.json`: six domains in the existing operational shell, with only a subset of planned destinations shown.
- `artifacts/api-server/src/routes/index.ts`: existing protected operational, connection and execution routers; customer candidate handler is not registered.
- Customer routes in `artifacts/seo-engine/src/pages/customer-*.tsx` are predominantly safe preview/empty states. `customer-home.tsx` currently passes `capability={null}`.

## Status legend
- **Preview:** customer route exists but does not implement a connected customer workflow.
- **Other UI:** corresponding surface exists in the separate operational/informational shell; this does not imply it is customer authorized or complete.
- **Missing CH:** no corresponding customer surface identified in the inspected customer router.
- **Target:** roadmap requirement; operational backend readiness and safety certification must be separately established.

| Domain | Feature / workflow | Current customer coverage | Existing related route or source | Design follow-up | Data/security gate |
|---|---|---|---|---|---|
| Entry | Standalone welcome | Preview `/home` | `customer-home.tsx` | Keep no-sidebar; add verified customer state | Customer capability API disabled |
| System | Website onboarding | Preview `/onboarding` | `customer-onboarding.tsx`, `/connections` | Connection and property-selection states | OAuth, ownership and tenant authorization |
| Audit | Initial site analysis | Preview `/analysis` | `customer-analysis.tsx`, technical foundations | Job history, verifiable progress and failure states | Authorized crawl/job evidence |
| Command Center | Site overview / KPIs | Preview `/site-overview` | `/`, `/performance` | Verified KPI cards, periods, alerts, site selector | Provenance, freshness, site scope |
| Discover | Opportunity list and filters | Preview `/customer-opportunities` | `/opportunities` | Priority workbench, facets and pagination | Tenant-scoped evidence |
| Discover/Execute | Opportunity evidence and comparison | Preview `/opportunity-detail` | `/actions`, `/approvals` | Evidence drawer, before/after, impact/risk/approval states | Proposal lineage, RBAC, approval gates |
| System/Execute | Automation policy | Preview `/automation-settings` | `/governance`, `/settings` | Policy, pause, kill, scopes, audit and disabled-state design | Never activate without explicit grants |
| Measure | Results and impact | Preview `/results-impact` | `/impact`, `/performance`, `/reports` | Attribution, trends, period comparisons, exports | Verified measurement lineage |
| System | Multi-website portfolio | Preview `/customer-portfolio` | `/connections` | Site list, switching, status, permissions | Memberships, isolation, revocation |
| Discover | Keywords and rankings | Missing CH | `/rankings` | Ranking explorer, query/page segments | Verified GSC/source binding |
| Discover | Competitor intelligence | Missing CH | `/search-intelligence`, competitor API | Competitor sets, comparisons, provenance | Separate competitor access/scope |
| Discover | AI/GEO visibility | Missing CH | `/ai-visibility` | Citation/source visibility investigations | Verified observations |
| Discover | Content optimization | Missing CH | Roadmap opportunity/evidence model | Content queue, controlled proposals | Authorization before writes |
| Audit | Full-site crawl / URL explorer | Missing CH | `/technical-seo`, roadmap P2 | Crawl ledger, URL inspector, diagnostics | Bounded authorized crawl |
| Audit | Internal links, schema, CWV, metadata | Missing CH | `/internal-links`, `/technical-seo` | Specialist audit tabs and evidence details | Source quality and freshness |
| Execute | Approvals, actions, deployments | Missing CH | `/approvals`, `/actions`, `/deployments` | Customer-safe review history and decision states | Actor, site scope, change policy |
| Execute | Rollback and verification | Missing CH | Execution foundation and roadmap | Verification/rollback lifecycle and exception handling | Strictly isolated operator write control |
| Measure | Experiments and change timeline | Missing CH | `/experiments`, `/impact` | Holdouts, attribution, change history | Verified effects and methodology |
| System | Data connections / sources | Onboarding partial | `/connections` | GSC/GA4/Shopify credential status and permission states | OAuth/profile isolation |
| System | Users, roles, audit log | Missing CH | Auth/security and governance sources | Customer roles, invites, activity trail | Tenant-scoped RBAC |
| Command Center | Ask SEO ENGINE | Missing CH | `ask-modal` in other shell | Evidence-bound read-only assistant and proposals | No bypass of action gates |
| Cross-cutting | Responsive/accessibility/workbench | Partial tests | E2E tests and roadmap UX-01–05 | Accessible data grids, filter persistence, zero/error/stale states | WCAG 2.2 AA target |

## Prioritized design implementation backlog
1. **CH-IA-01 (P0)** — retain standalone `/home`; design customer-authenticated shell grouped by six domains with role-based visibility, no operator route leakage. Create screen inventory, breadcrumbs, navigation and mobile patterns. No links into operator controls without customer authorization.
2. **CH-CONTRACT-02 (P0)** — define read-only customer site context, trustworthy proof source, membership revocation, source freshness, error and no-access states. Review candidate authorization and migration designs independently; do not wire until separately approved.
3. **CH-DESIGN-03 (P1)** — high-fidelity light designs for Command Center, Discover and Audit workbenches; define tables, evidence drawers, side panels and verified-data/empty-state pairs.
4. **CH-DESIGN-04 (P1)** — Execute approval/proposal history (read-only until authorized), Measure impact/experiments, System connections/portfolio/permissions/automation status.
5. **CH-QUALITY-05 (P1)** — reference screenshot diff and responsive, keyboard, contrast and navigation tests; route-to-feature-to-API-to-RBAC traceability matrix.
6. **CH-RELEASE-06 (P0 gate)** — no feature-complete claim, merge recommendation or customer live activation until coverage, visual, security and schema reviewers sign off and owner explicitly authorizes the next boundary.

## Strict interpretation
A matching route name does not establish a connected workflow or production readiness. A backend module's existence does not authorize exposing its capabilities to customers. The nine-screen preview can remain a valid isolated milestone but cannot be described as complete product design coverage.

## Acceptance checklist for next phase
- [ ] Every roadmap product capability mapped to a customer/operator audience and design screen.
- [ ] Every customer screen has verified, empty, loading, stale, denied and error states.
- [ ] Role/site visibility matrix approved; customer candidate route remains disconnected until explicit authorization.
- [ ] Actual screenshots reviewed against supplied reference assets; gaps tracked.
- [ ] Full scope audit of backend packages, workers, flags and migrations completed separately from this focused architectural coverage.
- [ ] New source changes pass exact-HEAD CI; no production or main changes without authorization.

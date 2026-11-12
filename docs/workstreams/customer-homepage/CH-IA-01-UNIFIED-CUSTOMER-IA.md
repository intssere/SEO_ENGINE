# CH-IA-01 — Unified Customer Information Architecture (Design Contract)

Status: **source-only proposal**, 2026-11-01. PR #1150 remains a draft. No customer API activation, production rollout, provider write, migration or merge is implied.

## Objective and boundaries
Unify the existing nine-screen read-only customer preview with the six product domains in `MASTER_COMPLETION_ROADMAP.md`. Preserve the standalone light `/home` without a sidebar. Internal operators and protected execution systems remain separate. Every screen below is a **design destination**, not a promise of implemented functionality.

## Navigation rules
1. `/home` is the public/customer welcome and getting-started entry: **no sidebar** and no invented activity/metrics.
2. After verified customer identity and site membership are established, a light workspace shell shows site selector, site/account identity, breadcrumb, data freshness and six primary domains. If identity or membership is unavailable, show a safe setup/denied state rather than operator fallback.
3. Domain tabs are **Command Center**, **Discover**, **Audit**, **Execute**, **Measure**, **System**; on mobile use a keyboard-accessible drawer rather than squeezing desktop navigation.
4. Never expose existing operator URLs (`/`, `/actions`, `/approvals`, `/deployments`, `/governance`) directly as customer shortcuts. They are separate components with different security requirements.
5. Every proposed customer route requires an explicit scope-aware capability contract before real data is connected. In the meantime, do not create fake records or enable controls for mutations.

## Proposed route inventory (not routes implemented in App.tsx)
| Domain | Destination | Proposed customer route | State and priority |
|---|---|---|---|
| Entry | Welcome | `/home` | Existing standalone preview — retain |
| Entry/System | Website setup | `/onboarding` | Existing preview — retain |
| Command Center | Site dashboard | `/workspace/overview` | P0 design; verified KPI/alerts/jobs/priority feed |
| Command Center | Site activity | `/workspace/activity` | P1; evidence-linked timeline |
| Discover | Opportunities | `/discover/opportunities` | P0; migrate preview concepts, tenant-scoped table |
| Discover | Opportunity detail | `/discover/opportunities/:id` | P0; evidence, comparison, risk, confidence |
| Discover | Keywords and rankings | `/discover/keywords` | P1; query/page/country/device/period |
| Discover | Competitors | `/discover/competitors` | P1; comparison and provenance |
| Discover | Content optimization | `/discover/content` | P1; read-only evidence and proposal review |
| Discover | AI/GEO visibility | `/discover/ai-visibility` | P1; source attribution and uncertainty |
| Audit | Site audit overview | `/audit` | P0; crawl readiness and issue summary |
| Audit | Crawls | `/audit/crawls` | P0; bounded job status, inventory and history |
| Audit | URL explorer | `/audit/urls` | P0; indexed, canonical, page diagnostics |
| Audit | Technical issues | `/audit/issues` | P1; structured data, metadata, indexability |
| Audit | Internal links | `/audit/internal-links` | P1; graph, orphan pages, opportunities |
| Audit | Web performance | `/audit/performance` | P1; CWV with data provenance |
| Execute | Proposal review | `/execute/proposals` | P0; never imply writes are available |
| Execute | Approvals | `/execute/approvals` | P0; RBAC-bound decision UI only after authorization |
| Execute | Action history | `/execute/history` | P1; verification and rollback outcomes |
| Measure | Results and impact | `/measure/impact` | P0; attribution and verified historical measures |
| Measure | Search analytics | `/measure/search` | P1; source-bound trend analysis |
| Measure | Experiments | `/measure/experiments` | P1; holdouts and methodological caveats |
| Measure | Reports | `/measure/reports` | P1; export/status, no invented data |
| System | My websites | `/system/sites` | P0; membership and authorized site switching |
| System | Connections | `/system/connections` | P0; GSC, GA4, Shopify connection states |
| System | Automation policy | `/system/automation` | P0; read-only until policy activated by separate authorization |
| System | Users and roles | `/system/access` | P1; identity, roles, grants and revocation |
| System | Settings and audit log | `/system/settings`, `/system/audit-log` | P1; site scope and immutable history |

## Existing preview route disposition
- `/analysis` -> design concept for `/audit/crawls`, but no live execution.
- `/site-overview` -> `/workspace/overview`.
- `/customer-opportunities` -> `/discover/opportunities`.
- `/opportunity-detail` -> detail by stable ID, not global placeholder.
- `/automation-settings` -> `/system/automation`.
- `/results-impact` -> `/measure/impact`.
- `/customer-portfolio` -> `/system/sites`.
Do not redirect existing preview routes until source/URL contracts and acceptance tests are approved. No proposed routes are activated by this document.

## Four UI modes to design separately
**Welcome** (unconnected); **Read-only preview** (no connected capabilities); **Verified customer workspace** (read models, tenant/site-scoped); **Restricted/denied** (session expired, no grant, revoked, stale evidence). Operator workspace is a separate product/role boundary, not a fifth fallback mode.

## Design-state contract
Each view needs: loading, verified, empty (no records), stale, partial source failure, access denied/revoked, disconnected source, and fatal error. Present freshness and source attribution on metrics. Mutations must have explicit eligibility, human confirmation/policy authorization, audit and recovery states, and remain disabled until a separately approved operational integration.

## Navigation acceptance gates
- Welcome route has **zero sidebar elements**; authenticated customer workspace does not share operator navigation or data hooks.
- Every customer route is tied to a feature ID, tenant/site scope, proposed read contract, visibility role and test.
- Domain hierarchy is navigable by keyboard and mobile users; active location and breadcrumb always agree.
- No preview route accidentally calls an operator/provider endpoint; no sample number is presented as a real measure.
- Designs include page layouts at 320, 390, 768, 1024 and 1440px and compare to approved light-theme references.
- Independent auth/security/schema sign-off before introducing real customers or registering candidate API routes.

## Delivery sequence
**CH-IA-01A:** audit and approve domain/site/role navigation tree and screen inventory (this document).
**CH-IA-01B:** create light, reusable layout and high-fidelity static prototypes in isolated branch after approval of navigation; no data connection.
**CH-CONTRACT-02:** independently verify server trust and membership model; define customer-scoped read contracts.
**CH-DESIGN-03/04:** complete screen designs by workflow, prioritized by verified evidence availability.
**CH-QUALITY-05:** attach traceability, visual regression and accessibility evidence before claiming feature completeness.

Related matrix: `CH-R117-FEATURE-COVERAGE-MATRIX.md`. Source of product requirements: `MASTER_COMPLETION_ROADMAP.md`.

# Customer Homepage / Capability-Driven UI — UX-CH-01

Status: DESIGN CONTRACT ONLY / NO RUNTIME ACTIVATION  
Scope: `artifacts/seo-engine` customer Home (`/`) and future capability-discovery contract.  
This workstream is independent of UGP, CVI, P12.2 production certification, and Main+UGP integration work.

## 1. Intent

Customer-facing authenticated Home is a **site-first experience**, not a marketing landing page and not the internal operations console. New users see connection/setup steps; users with an authorized site see real operational evidence, opportunities, and outcomes.

A public marketing homepage is a separate unauthenticated route/application and must not replace the authenticated Command Center inadvertently.

## 2. Source-backed reuse

Existing canonical frontend:
- `artifacts/seo-engine/src/App.tsx`: Wouter routing and current primary workspaces.
- `artifacts/seo-engine/src/components/layout.tsx`: authenticated shell, grouped navigation, responsive drawer and existing session behavior.
- `artifacts/seo-engine/src/pages/dashboard.tsx`: DB-backed Command Center, filters, operational state, source-backed opportunities and coverage truth.
- `artifacts/seo-engine/src/lib/command-center-model.ts`: explicit unavailable/stale/coverage status grammar.
- `artifacts/api-server/src/routes/dashboard.ts`: current dashboard API.
- `lib/api-spec/openapi.yaml`: API contract authority. Clients/types generated downstream.

Keep all existing operational routes functional. No synthetic SEO metrics, fabricated run completion or automatically assumed feature availability.

## 3. Homepage modes

1. `no_site`: Welcome + "Add website". Explain platform compatibility but do not imply all platform OAuth/integration adapters are live. URL registration must have server-side validation, normalized ownership controls and explicit consent.
2. `setup_required`: checklist with independently reported states for site verification, first-party connections, source access and initial analysis. Optional Google connection must remain optional.
3. `analysis_pending`: real job ID, stage timestamps, completed/total counts only when backed by actual run records; blocked/stalled/retry-required states must be visible. No fake percent progress, polling promises or notifications without actual implementation.
4. `site_operational`: site selector; real data freshness; scoped technical health/coverage; actual opportunities; pending approvals; verified changes; impact with measured-vs-unavailable labeling. Do not convert bounded crawl coverage into whole-site certification.
5. `site_degraded`: explicit stale/unavailable source diagnosis and next safe step, never stale optimistic green cards.

## 4. Page information architecture (desktop)

Top: site switcher, reporting range, global search (only if indexed source available), help/profile.  
Welcome: contextual greeting, real site domain, last validated data timestamp, quick action **Analyze site** only if supported and explicitly authorized.  
Primary: one concise "Next recommended step" callout with provenance and actionability.  
Operational KPI row: Organic clicks / impressions / CTR / average position only from comparable genuine Google property-level aggregates; other KPIs available only with source proof.  
Core workspace: technical coverage and audit status, prioritized opportunities, site visibility trends, governed activity.  
Bottom: connected source health, product areas with capability state, learning/impact evidence, recent action chronology.

Mobile: bottom task navigation for Home / Audit / Opportunities / Impact / More; no sidebar squeezed to 320px. Respect reduced motion and 44px recommended touch targets.

## 5. Capability-state contract — future API, not introduced by this design PR

Propose GET `/api/ui/capabilities?siteId=...`, authenticated with server-side org/site RBAC. An OpenAPI contract change and separate API engineering review are mandatory before implementation.

Envelope:
- `schemaVersion`, `siteId`, `generatedAt`, `expiresAt`, `sourceRevision`, `capabilities[]`.
- Capability entry: stable `id`, `label`, `route`, `state`, `reasonCode`, `evidenceAsOf`, `scope`, `permissions`, `requiresHumanApproval`, `presentation`.
- States: `not_implemented`, `engineering_ready`, `requires_setup`, `certification_pending`, `operational`, `degraded`, `suspended`.
- Presentation: `hidden`, `preview`, `view_only`, `available`. No direct mapping from `engineering_ready` to `available`.

The server alone derives effective capability from: deployed binary/version, authenticated tenant authorization, provisioned provider, site-level connection, real evidence validity/freshness, required production certification, and safety controls. Never trust frontend flags or user-supplied activation state.

Capabilities are **discoverability only**. Every API endpoint must independently enforce actual authorization and write gates. A read-only module may be operational while its mutation sub-capability remains suspended. Approval, execution, verification and rollback are distinct capability IDs.

## 6. Auto-update behavior

The frontend refetches the capability snapshot on focus and on bounded refresh intervals or subscribes to a future authenticated revision event. It checks `sourceRevision`, strictly validates the schema, and refetches on version change. Old/stale/error manifest fails closed for sensitive actions; available read-only features may display a stale warning only when safe. An unknown capability remains hidden. Server rollback/kill-switch immediately disables routes/actions on next refresh; write endpoints always reject immediately even before the UI refreshes.

A new feature still requires reviewed code, CI, merge, pinned deployment and runtime certification. **Automatic UI availability does not mean automatic code deployment or autonomous activation.** Feature readiness reflects the release already in production.

## 7. Feature matrix for initial customer Home

| Surface | Default homepage state until certified | Activation source |
|---|---|---|
| Connected site and source health | Real DB state only | Site + provider readiness |
| Crawl coverage / URL explorer | Available when stored evidence exists; bounded label | Exact crawl ledger and status |
| Opportunities / explanations | Available for current valid persisted evidence | P6 source lineage |
| AI Visibility | Preview or view-only based on verified observations | P7 runtime evidence |
| CVI | Hidden/preview pending isolated integration | Explicit main integration and runtime proof |
| UGP | Hidden/preview pending integration and certification | Explicit main integration and runtime proof |
| Preview / approval | Available only with RBAC, valid proposal context | Governed proposal & approval policy |
| Provider execution | Disabled by default | Exact independent live authorization and backend gates |
| Autonomous mutation | Disabled by default | Separately certified policy/runtime authorization |
| Impact measurement | Empty state until credible real outcomes | P10 provenance and measured windows |
| Multi-site | Site switcher when authorized sites exist | Server org/site membership |

## 8. Engineering increments

- **CH-01** (this PR): design, states and capability contract specification only.
- **CH-02**: design tokens, responsive homepage composition and fixture-only UI tests on isolated branch. No placeholder synthetic "live" outcomes.
- **CH-03**: additive authenticated server capability read-model + OpenAPI/generated client + permission/negative tests; no production DB migrations unless separately authorized.
- **CH-04**: homepage capability integration, functional customer onboarding routes only for certified providers, and accessibility/visual/keyboard tests.
- **CH-05**: independent staging fixture certification followed by separately authorized digest-pinned production release. No auto-deploy on every GitHub merge.

## 9. Acceptance gates

- Source/test-backed capability inventory; operator and customer surfaces never conflated.
- Every displayed number has exact source, site ID, freshness and provenance.
- No fake "active automation"/"apply" option, no promotion of W03–W09 engineering-only artifacts to live capability.
- Site RBAC and default-off mutation controls cannot be overridden in the UI.
- No redirect of existing `/` until old/new audiences and auth redirects are reconciled.
- Responsive screenshots at 320/390/768/1024/1440; WCAG 2.2 AA keyboard/axe/reduced-motion.
- PR CI and main CI pass; user reviews homepage visuals before merge; release approval separate.
- No production provider reads/writes, DB DDL/DML, live crawls, deployment, publication or credential changes in this PR.

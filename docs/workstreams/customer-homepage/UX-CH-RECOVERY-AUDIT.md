# UX-CH Recovery — Customer Homepage Source-Backed Gap Audit

Status: recovery planning only. No deploy, merge, provider activity, database write, or feature activation.
Repository: intssere/SEO_ENGINE
Audited canonical source commit: `47ba001ce217e7742bf5121cf56f0f937e0515c9`
Deployed staging image: `ghcr.io/intssere/seo-engine@sha256:2c8d84fd78991fc8d07c1cdb8644878054df1a407ce2f5512d22ebe6082c0a44`.
Design source: open draft PR #1087 (`docs/workstreams/customer-homepage/UX-CH-01.md`).
Partially implemented UX source: merged PR #1089.

## Confirmed gaps

| Contract | Current source | Disposition |
|---|---|---|
| Authenticated customer Home with no_site / setup_required / analysis_pending / site_operational / site_degraded | `App.tsx` routes `/` directly to `pages/dashboard.tsx` | NOT IMPLEMENTED |
| Onboarding route | `/onboarding` lazy-renders `customer-onboarding.tsx` | PRESENT as UI; persistence/provider action not claimed |
| Customer-friendly navigation | `components/layout.tsx` has collapsible sidebar | PARTIAL |
| Capability read model and states | No independently verified route `/api/ui/capabilities` | NOT VERIFIED / must audit API contract before engineering |
| KPI provenance, empty and stale states | DB-backed `pages/dashboard.tsx` + `lib/dashboard-data.ts` | REUSE; never invent GSC/crawl evidence |
| Mobile Home/Audit/Opportunities/Impact/More navigation | Customer navigation shell requires separate visual test | NOT CERTIFIED |
| Visual/keyboard/accessibility acceptance | Current tests cover existing shell | NOT CERTIFIED for new Home |
| GSC, AI Visibility, CVI, UGP activation | Protected by separate policy/runtime gates | MUST REMAIN DEFAULT OFF |

## Safe implementation sequence

1. CH-R01: reconcile UX-CH-01 design (PR #1087) into an implementation-ready contract, avoiding conflict with current / route, auth and operator Command Center.
2. CH-R02: implement **additive** `/home` customer page with source-backed states, honest placeholders, safe links to existing `/onboarding` and `/` operational dashboard. Keep `/` unchanged until user reviews layouts. No new provider reads.
3. CH-R03: define additive authenticated capability API in OpenAPI, derive capability state from server-owned evidence with tenant/site RBAC, and implement default-off negative tests. Requires separate API contract review before binding UI.
4. CH-R04: integrate certified capability states into customer Home, maintain operator routes, implement desktop/mobile layouts, accessibility, keyboard, reduced-motion and error/empty-state tests.
5. CH-R05: run CI + Playwright at 320/390/768/1024/1440, get user visual acceptance; separately authorize image digest release and staging deployment. Production remains out of scope.

## CH-R02 acceptance contract

- No replacement of `/`, no login redirect change.
- Page uses existing authenticated shell; client route `/home` requires login under existing middleware/server guards.
- Does not present simulated account setup or collected metrics as real.
- Explicitly distinguishes onboarding preview/next step from persisted site registration.
- Existing backend safety flags, webhook/provider, SQL and production remain untouched.
- Accessibility checks for headings, labels, focus, keyboard and responsive widths.
- Include a genuine screenshot review before broad customer navigation rollout.

## Release restrictions

Draft PR only. Do not merge, publish images, connect external providers, change OAuth variables, enable crawls/AI/autonomous writes, or touch production.

# UX-CH-01 — Customer homepage source and release gates

## Verified baseline (2026-10-18)
- PR #1150 at `d5809f401223f1e9cd6997975f270e1ae5d03a44` is draft; CI run https://github.com/intssere/SEO_ENGINE/actions/runs/39046113864 passed.
- `/home` currently calls `useGetDashboard()`, which returns a typed `DashboardSnapshot`; it displays only site name and domain for available data. It does **not** have a customer-specific capability API or the requested five-state homepage.
- Existing `/api/dashboard` and `/` serve the operator Command Center. Do not relabel its site-wide aggregate metrics as customer-scoped measurements.
- The onboarding screen is an explicitly **non-persisting preview**. Do not represent its form as site registration or permission approval.
- The current cross-browser workflow has Firefox and WebKit test projects and a production-preview build. Actual outcomes of the separate push-triggered workflow remain unverified from the available PR-run interface.
- Last validated frontend emitted assets (CI run #38728314179): raw JS 619042/620000, raw CSS 189782/190000, gzip JS 178319/180000. This is too little growth allowance for the full experience.

## Required server contract before claiming five states
Build a separately reviewed, read-only, authenticated `GET /api/ui/capabilities?siteId=<verified-site-id>` (final endpoint and schema subject to API design review), with *server-derived* site membership, ownership, provider readiness, last observation freshness and analysis job status. No client-side authorization guesses. Define explicit `no_site`, `setup_required`, `analysis_pending`, `site_operational`, and `site_degraded` response states, each with a reason and provenance. Unknown means unknown, not zero and not connected.

## UI progression
1. Build bounded state components, backed by typed fixtures for all five states and explicit loading/error handling. Keep standalone `/home` and the existing operator `/` intact until visual acceptance. Site selector must restrict choices to API-authorized sites.
2. Add evidence-backed KPI cards, bounded crawl coverage, opportunity queue, approvals, governed actions, source readiness and activity; suppress any panel lacking authorized evidence. No invented SEO growth, provider status, action eligibility, or crawl completeness.
3. Provide accessible mobile Home/Audit/Opportunities/Impact/More information architecture and 320/390/768/1024/1440 layout acceptance, keyboard focus, reduced motion, WCAG A/AA.
4. Create sufficient **measured** JS/CSS headroom without increasing the caps. Route splitting alone cannot reduce total emitted bytes counted by the P11.1 gate. Rebuild and measure every frontend increment.
5. Run production-build Chromium plus Firefox and WebKit compatibility checks. Recheck ES2022 support and no-modulePreload-polyfill configuration before promotion. Production/staging provider data and credentials are out of scope.
6. Obtain user visual signoff and separate explicit merge/deploy authorization.

## No-go
No merge, deploy, production database reads or writes, live crawling of Diamond Shelf, external provider activation or public site writes. This document confers no runtime privileges.

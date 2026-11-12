# CH-R02G — Exact-HEAD CI triage (2026-10-15)

## Scope and provenance
- PR: https://github.com/intssere/SEO_ENGINE/pull/1150
- Inspected head: `003a4dd6f597ca1454b4a4daf7e844674571691b`
- GitHub Actions CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38701982847
- CI job: `validate`, ID `116312116115`
- State at inspection: open draft, not merged. No release/deployment authorized.

## Measured outcome
- Workspace tests, synthetic load, Chromium P4.10 critical paths and typecheck passed.
- Build was the failing step. The budget check reports:
  - JS: 2 assets; raw `620779`; gzip `178784`.
  - CSS: 2 assets; raw `189952`; gzip `32098`.
  - Only reported budget violation: `js:total_raw:620779>620000` (779 bytes).
- The ES2022 build target remains in `artifacts/seo-engine/vite.config.ts`. Browser baseline compatibility is not yet certified.
- Source-map reporting warnings for tooltip/sheet were emitted before successful Vite emission; not the measured gate failure.
- The earlier handoff's 779-byte deficit is **still** the current measured deficit at the inspected head; do not infer that a new optimization succeeded from later commits.
- Do not characterize the successful Chromium route checks as Firefox/WebKit or complete visual acceptance.

## Source-backed findings
- `artifacts/seo-engine/src/App.tsx` retains `/` as the operational dashboard and adds `/home`, with the existing onboarding page lazy-loaded.
- `artifacts/seo-engine/src/pages/customer-home.tsx` is still a minimal page using the existing read-only dashboard query and links. It is **not** the UX-CH-01 premium customer homepage.
- `artifacts/seo-engine/src/lib/utils.ts` deliberately applies `twMerge(clsx(inputs))`; deleting `twMerge` has unproven class-conflict semantic equivalence.
- `performance/performance-budget.mjs` collects all emitted JS and CSS assets recursively, so merely splitting chunks does not eliminate total-raw violations.

## Next bounded implementation increment
1. Preserve the exact P11.1 limits; do not remove planned UX, React/Radix accessibility behavior, authentication or class-merging semantics merely to pass.
2. Establish explicit browser-support expectations before adopting ES2022 as an accepted target.
3. Locally compare the emitted/minified bundles against the clean main baseline, selecting a behavior-preserving optimization that demonstrably saves **more than 779 raw bytes**, ideally leaving headroom.
4. Re-run the exact build-budget check, route tests, typecheck and CI on a new exact head; retain evidence of asset sizes and browser compatibility.
5. Only after a green asset gate resume full site-first UX-CH-01 composition and desktop/mobile visual/accessibility acceptance. PR remains draft pending explicit review and merge authorization.

No provider calls, production/staging changes, database actions, Shopify writes, crawls, merge or deployment were made during this triage.

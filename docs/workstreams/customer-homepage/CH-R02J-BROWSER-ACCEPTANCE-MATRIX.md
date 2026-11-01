# CH-R02J — Browser acceptance matrix and CI observation

## Exact checkpoint
- Inspected PR #1150 HEAD: `205583f6f3cf9d16c345013081c61ed23c0644e5` (draft).
- CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38709751512
- During the inspection, GitHub reported `validate` as **in_progress**, with Chromium P4.10 critical paths in progress and Typecheck/Build pending. No asset savings are claimed for `generatedCode.constBindings`.
- Request for the still-running job's logs failed with GitHub artifact storage `BlobNotFound`; this is an **observability limit**, not proof of test failure or success.
- Last completed Build from preceding experiment: total JS raw 620213 (cap 620000), gzip 178526 (cap 180000), CSS raw 189952 (cap 190000).

## Source-backed browser coverage gap
- `artifacts/seo-engine/playwright.config.mjs` currently declares only `chromium`.
- `docs/workstreams/customer-homepage/UX-CH-01.md` requires responsive 320/390/768/1024/1440px, WCAG 2.2 AA, keyboard, reduced-motion and visual review.
- ES2022 and disabled module-preload polyfill remain experiments until browsers in the agreed support baseline are verified. Adding test projects must not silently redefine which browsers the product supports.

## Proposed isolated certification sequence (not yet executed)
1. Confirm supported desktop/mobile browsers and minimum versions from approved product requirements. Do not assume any browser coverage merely because ES2022 is configured.
2. On an isolated test config, install and run Chromium, Firefox and WebKit engines across authenticated `/home` and retained `/`, including direct-route refresh and dynamic `/onboarding` import. Keep staging credentials and secrets out of test artifacts.
3. For the five specified viewport widths, verify navigation, no horizontal overflow, keyboard traversal, focus restoration, skip link, accessible names, contrast, reduced-motion preference and critical route transitions.
4. Cover pending, unavailable, degraded and truthful source-backed states through deterministic fixtures (no live provider or production database).
5. Retain failure traces and screenshots in CI artifacts; have a human visually review the 320/390/768/1024/1440px results.
6. Measure all emitted assets and run the unchanged P11.1 gate before proposing merge. If `constBindings` or module-preload changes fail compatibility, revert the offending optimization and rerun exact-head checks.

## Governance
This note does not enable browsers, providers, crawls, database access or production/staging changes; it does not authorize deployment or merge. Keep PR draft until full certification and user visual signoff.

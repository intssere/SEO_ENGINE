# CH-R02C — Structural asset-budget diagnosis

Status: evidence-backed read-only investigation. No production, provider, database, deployment, merge, or performance-budget changes.

## Exact baseline

- Main commit: `47ba001ce217e7742bf5121cf56f0f937e0515c9`.
- Successful main release Actions run: [38232847753](https://github.com/intssere/SEO_ENGINE/actions/runs/38232847753).
- Main build JS total **619,970 raw bytes**, **178,734 gzip bytes**, 2 JS files; CSS **189,952 raw bytes**. The hard JS raw cap is **620,000**, leaving **30 bytes** headroom.
- Current draft PR #1150 HEAD `712f83e218fb6c95d8a395b0f1f4883e9dae13f2`: [run 38398442196](https://github.com/intssere/SEO_ENGINE/actions/runs/38398442196) JS **621,489 raw** (3 files), **179,329 gzip**, CSS **189,952 raw** (2 files).
- Difference to identical-main baseline: **+1,519 raw JS**, **+595 gzip JS**, **0 raw CSS**. Branch is **1,489 bytes** over cap.
- The build emits an additional lazy customer-home JavaScript chunk. The P11.1 performance gate totals all emitted JavaScript files; code splitting alone does not decrease total bytes.
- Main cap utilization is already **99.995%**. This is a pre-existing capacity constraint, not evidence that the customer design is itself unusually large.

## Required optimization direction

1. Do not weaken performance budgets or blindly strip customer homepage copy/functionality to manufacture a pass.
2. Analyze full Vite asset/chunk output for main and draft PR at the same dependency lockfile; distinguish main-entry, lazy customer-home, and onboarding assets.
3. Find measured, behavior-preserving reductions in the existing main bundle (duplicate libraries, unused shared imports, output minification, dead code, or reusable feature modules).
4. Validate performance budget **and** startup/interactivity metrics. Dynamic import can improve initial page load but does not waive the total-asset cap.
5. Rebuild a premium, site-first customer homepage only after bundle headroom is created. Keep all source freshness, coverage and capability state claims factual.
6. Run workspace tests, build, axe + Playwright responsive browser tests and user visual review. Require separate merge/deploy authorization.

## Release disposition

PR #1150 remains draft and is not eligible for merge or staging deployment. CH-R02C is diagnostic only. No CI success is asserted for the draft branch. No provider integration or production operation was performed.

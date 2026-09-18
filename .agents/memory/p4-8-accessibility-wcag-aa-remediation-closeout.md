# P4.8 — Accessibility Baseline / WCAG 2.2 AA Remediation Closeout

P4.8 is a frontend accessibility engineering milestone under issue #214 / PR #215.

## Baseline boundary

P4.8 establishes deterministic source/unit/build accessibility contracts and remediates concrete WCAG 2.2 AA issues. It does **not** claim final browser-level WCAG certification.

Browser-driven Playwright/axe/visual critical-path coverage remains **P4.10**. Final accessibility certification remains **P11.5**.

## Canonical implementation areas

- `artifacts/seo-engine/src/components/layout.tsx`
- `artifacts/seo-engine/src/components/data-grid.tsx`
- `artifacts/seo-engine/src/components/ask-modal.tsx`
- `artifacts/seo-engine/src/components/ui/dialog.tsx`
- `artifacts/seo-engine/src/components/ui/sheet.tsx`
- remediated form/status pages under `artifacts/seo-engine/src/pages/`
- accessibility CSS baseline in `artifacts/seo-engine/src/index.css`
- deterministic contract: `artifacts/seo-engine/src/accessibility-contract.test.mjs`

## Landmarks and focus

- app shell exposes a visible-on-focus `Skip to main content` link;
- one app-level `main#main-content` landmark is focusable with `tabIndex=-1`;
- nested Command Center / Full-Site Audit main landmarks are removed;
- SPA route changes focus main content with `preventScroll: true`;
- mobile navigation Escape closes and returns focus to the menu toggle;
- navigation domains expose grouping semantics.

## Grid and dialog keyboard behavior

DataGrid:
- horizontal scroll container has `role=region`, `tabIndex=0`, and an explicit scroll label;
- pagination exposes group semantics;
- existing table label and `aria-sort` semantics remain.

Ask:
- uses existing Radix Dialog rather than a hand-built `role=dialog`;
- Radix provides focus trapping, Escape handling and focus restoration;
- explicit title/description/input label/help text are present;
- loading/answer state is polite and errors are assertive;
- shared Dialog/Sheet close controls are 44px and close icons are decorative.

## Forms and live state

Programmatic labels added to:
- Shopify domain;
- Performance reporting window/country/device;
- Approval editable draft.

Remediated connection/loading/error surfaces use `role=status`, `aria-live=polite`, or `role=alert` as appropriate. Updated decorative loader/error icons are hidden from assistive technology.

## Contrast, focus and motion

- audited low-contrast light-surface muted colors were replaced with AA-safe alternatives;
- light muted-foreground token was darkened;
- dark nav-domain label contrast was increased;
- deterministic contrast tests require >=4.5:1 for the covered normal-size text/status palette pairs;
- shared `:focus-visible` uses a high-visibility dual-ring treatment;
- `prefers-reduced-motion: reduce` collapses nonessential animation/transition durations;
- forced-colors mode restores explicit focus/status borders.

## Validation

Implementation head:
- SHA `4a9a01127b88b4b0aefcc1f2e424143db2c5e63e`
- tree `04ce58a5dc33031ef345f6802abeb224278068bd`

Replit validation on that exact head:
- SEO Engine tests: 81 passed
- recursive workspace tests: passed, including 570 API Server tests
- SEO Engine/full typecheck: passed
- SEO Engine/full build: passed
- `git diff --check`: passed

Exact-head GitHub CI run `35341367991`: success.

Final merge still requires green CI on the exact docs-complete PR head.

## Safety result

P4.8 does not authorize or perform publication/deployment, provider/public-site activity, live crawl/sitemap execution, Production observation/evidence reads or persistence, Production DDL/DML, scheduler/worker activation, Task #53/#54 execution, secret/config changes, or autonomous capability activation.

Default next safe milestone: **P4.10 — Playwright/axe/visual regression critical-path suite**.

**P4.9 — Storybook/component documentation** remains optional and should be started only if deliberately selected.

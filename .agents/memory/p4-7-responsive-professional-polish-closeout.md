# P4.7 — Responsive / Mobile / Tablet Professional Polish Closeout

P4.7 is a frontend presentation-only engineering milestone under issue #212 / PR #213.

## Canonical implementation

- responsive override layer in `artifacts/seo-engine/src/index.css`
- responsive source contract: `artifacts/seo-engine/src/responsive-polish-contract.test.mjs`

No API, backend, generated schema, route, page data hook, or execution-policy file is changed by the implementation.

## Responsive shell contract

- desktop/sidebar layout remains the large-screen default;
- compact tablets and phones switch to mobile navigation at `max-width: 820px`;
- mobile navigation remains sticky and scrollable with dynamic viewport sizing;
- per-page topbars become static under the compact mobile shell so there is no double-sticky overlap;
- workspace/content/card min-width and overflow rules keep page-level horizontal overflow contained.

## Data-grid/workbench contract

- tables have a deliberate `720px` internal minimum width when space is constrained;
- the containing workbench owns horizontal scrolling with touch momentum and inline overscroll containment;
- workbench toolbar/footer controls stack at tablet widths rather than waiting for phone-only widths;
- search/page-size/pagination controls become full-width or wrap-safe as space narrows;
- pagination remains usable at narrow-phone widths.

## Touch and wrap contract

Core shared controls covered by P4.7 use a minimum `44px` touch target:
- mobile navigation toggle and links;
- DataGrid search/page-size/pagination;
- evidence-drawer trigger;
- approval review buttons;
- draft editing buttons.

Shared title rows, section heads, status badges, action groups, long URLs and long text become wrap-safe.

## Drawer and page polish

EvidenceDrawer:
- tablet width: bounded by `min(96vw, 680px)`;
- phone width: `100vw`;
- dynamic viewport height and contained body scrolling.

Command Center / Full-Site Audit / generic operational surfaces:
- consistent compact padding and heading scale;
- responsive summary/metric/coverage grids;
- wrap-safe forms and action groups;
- compact-tablet/mobile navigation replaces the cramped sidebar layout.

## Validation

Implementation head:
- SHA `4b2b7af2b7919a9373f6514f3a7762ad96c08b8a`
- tree `f7d9396845073aaa9552b7f583c880c000e0f68d`

Replit validation on that exact head:
- SEO Engine tests: 72 passed
- recursive workspace tests: passed, including 570 API Server tests
- SEO Engine/full typecheck: passed
- SEO Engine/full build: passed
- `git diff --check`: passed

Exact-head GitHub CI run `35337414946`: success.

Final merge still requires green CI on the exact docs-complete PR head.

## Safety boundary

P4.7 does not authorize or perform publication/deployment, provider/public-site requests or mutation, live crawl/sitemap execution, Production observation/evidence reads or persistence, Production DDL/DML, scheduler/worker activation, Task #53/#54 execution, secret/config changes, or autonomous capability activation.

Default next safe milestone after certified P4.7 closeout: **P4.8 — accessibility test baseline and WCAG 2.2 AA remediation**. Real P1 live-provider activation remains separately authorized.

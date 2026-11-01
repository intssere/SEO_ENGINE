# CH-R02H native modulepreload experiment — measured result

Exact measured commit: `35dd790ca6a26fe15b3b64d851644d33490361dc`.

CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38704524104 — **FAIL (Build only)**.

| P11.1 metric | Prior `003a4dd6` | CH-R02H | Hard limit |
| --- | ---: | ---: | ---: |
| Total JS raw | 620779 | 620213 | 620000 |
| Total JS gzip | 178784 | 178526 | 180000 |
| Total CSS raw | 189952 | 189952 | 190000 |

Adding `modulePreload: { polyfill: false }` under Vite's `build` saved **566 raw JS bytes** and 258 gzip bytes in the measured build without modifying application UI source. Remaining raw JS overage: **213 bytes**. The polyfill removal is not yet certified for the product's browser baseline. Retention requires explicit cross-browser validation; static bundle measurement alone does not certify compatibility.

CI's validate job reached and failed the frontend performance-budget Build step. Upstream workspace tests, Chromium critical-path tests, and typecheck were successful. No release/merge/deploy authorization follows.

Next: investigate a further source- or bundler-level behavior-preserving optimization against emitted output. Do not weaken caps, remove capability/UI requirements, or replace class merge and accessible primitives. Run fresh exact-head CI and browser certification; keep PR draft.

No provider, database, crawl or deployment operation was performed.

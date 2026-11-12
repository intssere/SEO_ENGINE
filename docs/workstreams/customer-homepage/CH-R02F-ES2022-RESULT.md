# CH-R02F ES2022 experiment — measured outcome and acceptance boundary

Exact PR #1150 HEAD at measurement: `9bb3420a807c833013952bdf1a6c12c0b822f021`.
CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38425258380 — **FAIL**, Build.
Prior ES default (CI #38411792247): JS raw 621213, gzip 178967; CSS raw 189952.
ES2022 (CI #38425258380): JS raw 620779, gzip 178784; CSS raw 189952.
Actual improvement: 434 raw JS bytes; remaining 779 raw bytes above unchanged P11.1 hard cap 620000. No other performance budget failed in the cited result.

## Decision

The ES2022 experiment is **not release-certified**: it saves bytes but remains CI-red, and its supported browser/device baseline has not been independently certified. Retain only as an isolated experiment, with no merge/deployment approval. No claim that `target: es2022` is universally browser-compatible.

## Next work

1. Produce a production-browser support matrix from product requirements and existing Playwright device/browser contracts; validate whether ES2022 is allowed (otherwise revert target).
2. Isolate remaining 779-byte raw-JS deficit via actual minified output comparison, without replacing semantic `tailwind-merge` handling or removing ARIA primitives.
3. Restore and implement UX-CH-01 customer-facing homepage, which is currently reduced to a functional skeleton; preserve real evidence/empty states.
4. Validate strict unchanged asset caps, functional/negative tests, Chrome/Firefox/WebKit 320–1440px axe + keyboard, and user visual signoff.
5. PR remains draft; do not merge, deploy, alter providers or production or enable site writes.

No production or staging operations performed.

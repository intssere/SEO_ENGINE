# CH-R02N — Measured source-level optimization and remaining release blocker

Inspected PR #1150 HEAD: `d038cf90065e36bd02f8517f749b91099f4a164c` (draft).

CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38724291153 — **failed Build**.

Measured emitted bundle, against unchanged P11.1 budgets:

| Kind | Before CH-R02N | After CH-R02N | Limit |
| --- | ---: | ---: | ---: |
| JavaScript raw | 620160 | **620103** | **620000** |
| JavaScript gzip | 178512 | 178518 | 180000 |
| CSS raw | 189952 | 189952 | 190000 |

The `customer-home.tsx` workspace link mapping produced 57 bytes of raw-JS reduction. The residual raw overage is **103 bytes**; full CI is still **red**.

## Engineering decision
- Retain the source change subject to regression and UX review: same four labels, hrefs, same-site navigation semantics.
- Avoid further ungrounded Rollup flags and tiny UX-copy deletion merely to force a green budget.
- Obtain emitted-asset differential evidence across baseline and branch. Prefer substantive dependency/dead-code reduction with browser/keyboard/accessibility parity tests and real budget headroom for upcoming UX-CH-01 work.
- Independently confirm support policy for `build.target='es2022'`, disabled `modulePreload` polyfill, and generated-code settings before any release.
- Customer Home remains a functional skeleton. It still needs site-first states, trustworthy source/provenance, capability contracts, responsive design and visual acceptance. The 103-byte overage is not the sole product-readiness blocker.

## Safety / release
Do not relax budget caps, trim substantive customer UX, merge this draft, deploy, modify Production/staging databases, activate external providers, or crawl Diamond Shelf. A green asset gate cannot replace user visual acceptance or independent review.

# CH-R02M — Measured Rollup configuration disposition

Exact tested HEAD: `038ff2b2cce7278cbb0da5662f03d3c8c1b928b6`.
CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38713352310 — failed only Build.

P11.1 emitted total: JS raw **620160**, JS gzip **178512**, CSS raw **189952**. Limits: JS raw **620000**, gzip **180000**, CSS raw **190000**. Remaining raw JS deficit: **160 bytes**.

`generatedCode.reservedNamesAsProps: true` saved **zero measured bytes** relative to the previous `arrowFunctions` experiment. This ineffective setting was removed in follow-up commit `d1139694c99d5a78d20dca49ee28e5d4da3c9493`. The previously measured `constBindings`, `arrowFunctions` and modulePreload experiment settings remain in place for separate compatibility validation.

## Next source-backed step

Stop assuming unmeasured build flags will solve the remaining deficit. Compare emitted chunk attribution and actual minified output for the current branch and canonical main; identify a specific redundant or duplicate application expression that can be removed without changing behavior, UX copy, semantics, accessibility, authentication, authorization or available routes. Require build measurements and regression tests at a new exact HEAD. Do not weaken budgets, remove planned UI, swap out semantic class merging, or rely on lazy-route splitting to reduce total emitted bytes.

Browser support for ES2022 and disabled modulepreload polyfill has not been certified. The UX-CH-01 full customer homepage and visual signoff remain separate open gates. PR remains draft; no merge, deployment, production database, crawl or provider action authorized.

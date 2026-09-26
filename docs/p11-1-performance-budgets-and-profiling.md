# P11.1 — production performance budgets and offline profiling

## Scope

P11.1 adds deterministic/offline performance hardening to the engineering tree. It does not generate production load and does not change deployment/runtime configuration.

The milestone has two separate evidence layers:

1. **build-asset budgets** — deterministic byte/gzip limits over emitted frontend JavaScript and CSS;
2. **synthetic local browser profiles** — normalized Navigation/Paint/main-content timing observations collected only from the existing local Playwright server with the existing synthetic network boundary.

Neither layer is a production RUM result, a production load test, a user-experience score, or a deployment authorization.

## Certified input baseline

At the P10.7 closeout baseline:

- JavaScript: **589,405 bytes raw / 169,949 bytes gzip**;
- CSS: **179,974 bytes raw / 30,188 bytes gzip**;
- Vite emitted its existing advisory because the generated JavaScript chunk exceeded the default 500 kB advisory threshold.

P11.1 deliberately does **not** raise or suppress that Vite advisory threshold.

## Build budgets

`artifacts/seo-engine/performance-budgets.json` defines the reviewed P11.1 v1 ceilings.

| Asset class | Max asset raw | Max asset gzip | Max total raw | Max total gzip |
|---|---:|---:|---:|---:|
| JavaScript | 620,000 | 180,000 | 620,000 | 180,000 |
| CSS | 190,000 | 33,000 | 190,000 | 33,000 |

Each class must contain at least one emitted asset.

These ceilings intentionally provide only bounded headroom over the measured P10.7 baseline. If code splitting is introduced later, the total limits continue to prevent a regression from being hidden by splitting one asset into several files.

The post-build checker:

- recursively scans `dist/public`;
- considers emitted `.js` and `.css` files only;
- sorts paths deterministically;
- measures exact raw bytes;
- computes gzip bytes with Node's built-in zlib at level 9;
- emits stable diagnostics;
- exits non-zero on any budget violation or missing required asset class.

The frontend `build` script runs this checker after Vite, so CI build is a hard bundle-size regression gate.

## Synthetic profile contract

A normalized P11.1 synthetic profile has:

- version `p11.1.v1`;
- source exactly `synthetic_local`;
- an absolute application route;
- `domContentLoadedMs`;
- `loadEventMs`;
- `firstContentfulPaintMs`;
- `mainContentReadyMs`;
- `resourceCount`.

Timing values are non-negative finite numbers or `null`. Missing/unavailable observations stay `null`; they are never replaced with zero.

The browser suite profiles:

- `/`;
- `/technical-seo`;
- `/search-intelligence`;
- `/ai-visibility`;
- `/governance`;
- `/impact`;
- `/connections`.

The Playwright fixture continues to block all external origins and fail on unmocked API requests. P11.1 therefore cannot contact a live provider or production application through this test path.

## Regression semantics

Synthetic profile regression comparison is deterministic supplied-evidence logic, not a production timing gate.

For each configured timing metric:

- if baseline or candidate is unavailable, comparison state is `unavailable`;
- otherwise the candidate is a regression only when it exceeds the larger of:
  - baseline × **1.25**;
  - baseline + **100 ms**.

This combines a relative threshold with an absolute noise floor. It prevents tiny baseline changes from being labeled regressions while still identifying large supplied-fixture regressions.

Metrics remain independent. P11.1 does not aggregate them into a performance score, grade, confidence estimate, percentile, or user-experience verdict.

## Explicit limitations

P11.1 does not:

- send traffic to production;
- perform Lighthouse/PageSpeed requests;
- create production RUM;
- infer Core Web Vitals from synthetic local timing;
- contact a provider or public site;
- read/write Production DB;
- change schema;
- change runtime/deployment configuration;
- activate scheduler/worker/retry/autonomous mutation;
- execute Task #51/#53/#54;
- deploy or publish.

A later separately scoped task may add production-safe observability or load/scale certification, but this milestone does not authorize it.

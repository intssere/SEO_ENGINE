# CH-R02F — Measured Vite bundle attribution checkpoint

Status: diagnostic only / draft PR #1150. No production, OAuth, provider, database, merge or deployment change.

## Measured evidence

- Exact HEAD `de70c4a3ed30a4ec3c78d6417279013d0d9a950b` CI [38413792387](https://github.com/intssere/SEO_ENGINE/actions/runs/38413792387) — build fails P11.1 raw JS cap.
- Emitted JS total: **621,213 bytes raw**, **178,967 gzip**; CSS **189,952 raw**. Hard limits: 620,000 raw JS / 180,000 gzip JS / 190,000 raw CSS.
- Build-only diagnostic `UX_CH_BUNDLE_REPORT=1` captures Rollup `chunk.modules[].renderedLength` top 25. This is module pre-minification attribution, not additive output-size proof.
- Largest reported: React DOM client 531161, `tailwind-merge` 102185, Radix toast 27525, floating-ui/core 27058, floating-ui/dom 26088, actions.tsx 25765, dashboard.tsx 25427, approvals.tsx 24683.
- Shared `src/lib/utils.ts` imports full `twMerge` from `tailwind-merge` and `clsx` for `cn()`; e.g. `components/ui/button.tsx` uses `cn()`. Removing `twMerge` without a utility-class conflict inventory could silently regress styles; not authorized by evidence yet.

## CH-R02F decision

1. Preserve app semantics and existing bundle budgets. Do not remove React DOM, Radix ARIA primitives or class-conflict semantics without dedicated tests.
2. Measure actual *minified* marginal impact of `tailwind-merge` with an isolated build comparison using a behavior-compatible restricted class-group config or replaceable helper, not raw rendered-length guesses. Verify `cn()` class semantics and all existing pages.
3. If such targeted change does not save >1213 bytes with safety margin, investigate unused UI primitives / unused imports and Vite minifier optimization under controlled comparative CI.
4. Restore planned customer Home richness only after sufficient headroom is proven. Re-run CI, Playwright mobile/desktop visual + keyboard/axe and user review before any merge/staging release.

Current PR #1150 remains draft and ineligible for merge/deploy.

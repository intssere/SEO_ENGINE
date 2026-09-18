# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree and CI before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the durable long-term completion plan, and GitHub `main` remains canonical.

## Published production

The currently published and production-certified application release remains **Task #73 — GSC First-Live-Read Pilot Readiness v1**.

Published application source:
- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Tasks #74, #75, roadmap P2 engineering foundations, P3.1–P3.6 and P4.1–P4.8/P4.10 have **not** been published as application releases. P3.6 changed only the separately authorized Production schema; P4.1–P4.8/P4.10 change engineering-source product navigation/design-system/workbench/evidence-inspection/Command-Center/audit-explorer/responsive/accessibility/browser-regression code only. P4.9 remains optional and unselected. Git synchronization, engineering merges and database DDL do not change the separately attested published application source.

## Current engineering state — P4.10 complete

Roadmap **P4.10 — Playwright/axe/visual regression critical-path suite** is complete under issue #216 / PR #217. P4.1–P4.8 remain the completed product/accessibility foundations; P4.9 Storybook/component documentation remains optional and unselected.

P4.10 adds a deterministic browser-level regression harness without activating any live application/provider/runtime capability:
- Chromium-only Playwright runs against a standalone local Vite frontend server;
- fixed `en-US` locale, UTC timezone, light color scheme, reduced motion, one worker and deterministic synthetic fixture time/data;
- every browser `/api/**` request is intercepted with synthetic non-PII fixtures;
- unknown API requests fail closed and are recorded;
- non-local/external origins are aborted and recorded, so browser tests cannot reach providers, public sites or Production;
- no API server, database, provider, OAuth, crawler, scheduler or worker is started for the browser suite;
- critical browser paths cover Command Center navigation and SPA focus handoff, compact mobile navigation Escape/focus return, Technical SEO DataGrid keyboard/search/sort behavior, and Ask dialog focus trapping/fixture answer/Escape/focus restoration;
- representative Command Center, Technical SEO and Connections routes run axe WCAG scans with serious/critical violations required to be zero;
- browser console errors and page errors fail covered tests;
- visual regression covers Command Center desktop/tablet/mobile and Audit desktop with committed text-only 512-bit directional perceptual hashes;
- visual comparison uses bounded Hamming tolerance `32/512` bits (6.25%); baseline capture mode is not used by normal CI;
- Playwright trace/screenshot/report artifacts are retained/uploaded on failures only;
- the first browser/axe capture exposed a real Command Center contrast regression; P4.10 corrected the affected muted metric/engine colors and the subsequent axe scans pass;
- browser interaction exposed the need for explicit focus restoration when opening Ask via the global keyboard shortcut; P4.10 adds that restoration path;
- P4.10 browser packages are pinned in `package.json` and now also committed in `pnpm-lock.yaml`, with a unit contract preventing browser dependency lock drift.

Canonical browser certification is GitHub Actions Ubuntu/Chromium. Replit cannot launch Playwright Chromium on this host because its loader lacks `libglib-2.0.so.0`; Replit remains the non-browser validation/sync target.

A repository-wide frozen-lock probe still fails on a **pre-existing unrelated** omission: `artifacts/api-server/package.json` declares `tsx@^4.23.4` but that importer entry is absent from the inherited lockfile. P4.10 does not widen into unrelated lockfile normalization; its own browser dependency entries are present and contract-enforced.

P4.10 is engineering/test/CI only and remains **unpublished**. It did not authorize or perform real API-server startup, provider/public-site activity, OAuth/credential use, live crawl/sitemap execution, Production observation/evidence reads or persistence, Production DDL/DML, scheduler/worker activation, Task #53/#54 execution, secret/config changes, autonomous mutation or publication.

Detailed record:
- `.agents/memory/p4-10-playwright-axe-visual-regression-closeout.md`

## Current database state — P3.6 complete

Roadmap **P3.6 — Production migration/DDL** is complete. The canonical migration was exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified, then executed once against the explicitly authorized Production Neon branch after the P3.6B recovery/identity gate. Independent read-only Production catalog verification found zero mismatches.

Authoritative task:
- issue #188 — P3.6 Production Migration / DDL
- implementation PR #192

Certification lineage:
- canonical migration: `lib/db/migrations/0003_observation_evidence_schema.sql`
- migration blob: `ea13df6e9e0e0307e349f1502a4548b9e4de11ed`
- implementation merge: `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc`
- implementation tree: `2733b8d3ab781834a10dcfbd2b833e786d3f2e1b`
- exact-head CI #328: success
- post-merge main CI #329: success

Production recovery and identity gate:
- Neon project: `late-sunset-42762033`
- Neon branch: `br-super-frost-b341k9ms`
- database: `neondb`
- timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`
- PITR: ON, last 7 days
- the migration was executed once through an authorized Shell `psql` session only after project, branch, database and timeline identity matched Production; endpoint identity was treated as connection-specific rather than sufficient branch identity
- execution used `ON_ERROR_STOP` and the canonical transaction-wrapped migration; no application code, runtime configuration, deployment or publication was used to apply it

Independent post-migration Production verification confirmed:
- public base-table count moved from 31 to 34
- `public.seo_observation`, `public.seo_evidence` and `public.seo_observation_evidence` all exist with zero rows
- 21 CHECK constraints, 3 primary keys, 2 foreign keys with `ON DELETE RESTRICT`, and 15 indexes including exact column order match migration `0003`
- catalog mismatches: zero

Detailed record:
- `.agents/memory/p3-6-production-schema-migration-closeout.md`

## Replit engineering workspace

P4.10 branch `p4-10-playwright-axe-visual-regression` was created from the P4.8-certified canonical `main`:
- base SHA: `754d721df41522beade646451a298e35a01f2410`
- base tree: `f8cd7b9be2ceee7fd956af05e516301f3621fe64`

Replit exact branch validation on corrected implementation head `187f17e8e816bc97dc9e987f2e8dfd1ba7e38ef7` / tree `a577a6e6a66c9596baaaa8f8c63999cd65cd71af` passed SEO Engine tests, recursive workspace tests, SEO Engine/full typecheck, SEO Engine/full build and `git diff --check`. Browser execution is not certified on Replit because the host cannot launch Chromium due missing `libglib-2.0.so.0`; GitHub Actions is the canonical browser runner.

GitHub exact-head CI run `35355521841` passed the full schema/task/workspace matrix, Playwright Chromium installation, the P4.10 browser critical-path/axe/visual suite, typecheck and build.

A frozen lockfile probe on Replit still fails because of the inherited unrelated API Server `tsx` importer omission noted above. P4.10-specific browser dependencies are committed in the lockfile and unit-contract-enforced.

After PR #217 merges and post-merge CI is green, exact-sync the merged GitHub `main` to Replit Git-only. Do not publish P4.10 without separate explicit authorization.

## Completed engineering foundations

Completed non-published engineering foundations include:

- **P1.1 / P1.2 — Task #75 GSC profile isolation:** dedicated GSC-purpose state/config/scope/discovery/identity isolation; live GSC transport remains intentionally unbound/default-off.
- **P2.1–P2.8 — Crawl and technical evidence foundations:** bounded baseline/full-site planning, sitemap inventory, batch execution control, completion certification, crawl history, incremental recrawl planning, URL Explorer and technical issue/evidence modeling. These remain engineering contracts and do not activate a new production crawler.
- **P3.1 — Observation/evidence persistence design:** storage-agnostic normalized observation identity, provenance, freshness, evidence references, duplicate/supersession/conflict/corroboration semantics, history integrity and bounded read/query contracts.
- **P3.2 — Persistence planning:** deterministic storage-neutral persistence keys, index intent, replay/idempotency, provenance-aware insert/supersede/conflict/corroboration plans, exact snapshot binding and immutable in-memory test application.
- **P3.3 — Retention/history/supersession model:** explicit-time deterministic retention decisions, replay-safe history relations, protected lineage, bounded archive/prune planning only and storage-neutral lookup/index intent.
- **P3.4 — Retention/history read models:** deterministic current-head and retained-history projections, supersession-chain/conflict/corroboration views, descriptive retention state, bounded filters/sorting/cursors, explicit unavailable evidence semantics and storage-neutral read/index intent.
- **P3.5 — Evidence quality/conflict handling:** deterministic evidence availability, caller-time freshness, bounded support levels, provenance-aware corroboration, complete/partial conflict coverage and advisory-only resolution states over validated P3.1–P3.4 artifacts.
- **P3.6 — Production migration/DDL:** canonical observation/evidence schema now exists in Production with three empty tables, exact constraints/keys/indexes and independently verified zero catalog mismatches.
- **P4.1 — Information Architecture / Navigation v2:** six-domain product navigation, preserved 16-route surface, honest planned Learning placement, active-route accessibility and usable mobile navigation with deterministic contract coverage.
- **P4.2 — Design tokens / components / status grammar:** typed semantic status tokens, reusable StatusBadge, shared status grammar, semantic color variables and deterministic anti-regression contracts across product surfaces.
- **P4.3 — Enterprise data-grid / workbench primitives:** typed read-only data grid, deterministic search/sort/page model, stable row identity, accessible workbench controls, OperationalTable compatibility adapter and explicit no-bulk/no-execution boundary.
- **P4.4 — Evidence drawer:** typed read-only evidence presentation model, accessible Sheet-based drawer, proposal/opportunity adapters, explicit unavailable P3 detail states, count/ID honesty and zero data-fetch/mutation capability.
- **P4.5 — Command Center v2:** read-only root operational cockpit over the existing dashboard snapshot, conservative health/coverage/decision/verification/measurement/intelligence states, bounded-certification honesty, and no baseline/mutation controls.
- **P4.6 — Full-Site Audit / Crawl Explorer UI:** read-only Technical SEO workspace over current GET data, defensive finding normalization, bounded-certification truth, production-shaped P2.7 URL Explorer with zero synthetic rows, and explicit unavailable history/recrawl bindings.
- **P4.7 — Responsive/mobile/tablet professional polish:** unified compact-tablet/mobile shell behavior, internal table scrolling, earlier workbench stacking, 44px shared touch targets, wrap-safe headers/status/text, viewport-safe evidence drawer sizing and consistent compact layouts across P4.1–P4.6.
- **P4.8 — Accessibility baseline / WCAG 2.2 AA remediation:** single main landmark + skip link/route focus, keyboard-scrollable grids, Radix-managed Ask dialog, labeled forms/live regions, AA-safe muted palette, visible focus, reduced motion and deterministic contrast/source contracts; final browser/final certification remains later.
- **P4.10 — Playwright/axe/visual regression:** isolated synthetic-fixture Chromium critical paths, axe serious/critical gates, browser error/network escape gates, desktop/tablet/mobile perceptual visual hashes, failure artifacts, and browser dependency lock contracts. P4.9 remains optional/unselected.

The completed P3.6 schema migration does not activate application persistence or reads. None of these foundations activates new production crawling, provider reads, application database persistence/reads, archival/pruning/deletion, autonomous operation or publication.

## P3.5 contract completed

P3.5 canonical modules:
- `artifacts/api-server/src/lib/observation-evidence-quality-model.ts`
- `artifacts/api-server/src/lib/observation-evidence-quality-conflict-model.ts`

P3.5 canonical tests:
- `artifacts/api-server/src/lib/observation-evidence-quality-model.test.ts`
- `artifacts/api-server/src/lib/observation-evidence-quality-model.hardening.test.ts`

P3.5 defines and tests:
- explicit evidence availability rather than invented missing facts;
- freshness only from caller-provided validated reference time, with `fresh` / `stale` state;
- support tiers `insufficient`, `limited`, `supported`, `strong`, `corroborated`;
- independent provenance/corroboration tracking;
- conflict coverage `complete` and `partial_page`;
- advisory-only resolutions `retain_unresolved`, `prefer_supported`, `require_review`, `insufficient_evidence`;
- conservative `prefer_supported` only for uniquely stronger independent support;
- provenance preservation and no mutation of source observations;
- deterministic fingerprints and group identities;
- exact P3.4 read-model integrity reconstruction;
- bounded filters/projections and storage-neutral query/index intent;
- exact result-integrity rebuilding and tamper rejection;
- source hardening against network transport, DB/ORM clients, SQL read/DDL/DML, filesystem writes, environment-secret binding, scheduler/worker/process primitives and ambient clock reads;
- hard-coded false authorization for production quality/runtime execution, production read runtime, DB reads, persistence, archive/prune/delete execution, DDL/DML, provider/network execution, scheduler/worker execution, public writes and publication.

### P3.5 honesty rule

P3.5 models evidence support quality and conflict state; it does **not** determine objective truth, persist a resolution, mutate source observations, make a live database-backed service real, or authorize any provider/network/runtime action. `prefer_supported` is advisory only. Storage-neutral index/query intent is not a migration. In-memory reconstruction is deterministic modeling/testing only. Partial-page conflict coverage fails closed rather than inventing unseen participant quality.

Production observation/evidence application binding, durable storage/read execution and DML remain closed. P3.6 completed the specifically authorized schema DDL only; any future production DDL requires new explicit authorization.

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2/P3 engineering foundations do not activate a new runtime.

Published production/pilot behavior remains approximately:
- 30-page bound;
- depth 2;
- GET-only;
- sequential breadth-first crawl;
- robots-aware;
- no retries;
- 10-second request timeout;
- maximum HTML response around 750,000 bytes;
- same-site normalization;
- query stripping;
- existing runtime redirect handling.

The 30-page behavior remains **baseline** mode. It is not the intended whole-site production ceiling.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. First-party P2/P3 foundations do not grant or widen competitor permissions.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence is authorized by P3.5.

## Current safety boundary

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- first-party `full_site` live network execution=false
- first-party sitemap network fetching=false
- first-party full-site persistence=false
- first-party batch executor=false
- first-party retry loop=false
- competitor execution/collection/evidence persistence=false
- provider/public writes=false
- observation/evidence production persistence=false
- observation/evidence production read runtime=false
- production DB client/read binding=false
- production DB reads=false
- further production DDL/schema migration=false unless separately and explicitly authorized
- production DML=false
- production archive execution=false
- production prune execution=false
- destructive delete execution=false
- filesystem writer=false
- scheduler/autonomous-worker execution=false
- autonomous mutation=false
- publication authorization=false.

If any of these unexpectedly appears open, stop and diagnose read-only rather than widening the task.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Certified engineering foundations through this checkpoint include P1.1/P1.2, P2.1–P2.8, P3.1–P3.6 and P4.1–P4.8/P4.10. P4.9 remains optional/unselected. P1 live-provider activation remains separately authorized. P3.6 establishes schema only; P4.1–P4.8/P4.10 establish product navigation/design-system/workbench/evidence-inspection/Command-Center/audit-explorer/responsive/accessibility/browser-regression foundations only. None implies live full-site crawl execution, sitemap fetching, application observation/evidence Production reads or persistence, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable long-term plan. Its mutable P2/P3/P4 status tables must reflect these completed foundations; historical task/release evidence elsewhere must not be rewritten.

## Next boundary — P5.1 safe by default; P1 live-provider only if deliberately authorized; P4.9 optional

With the selected P4 product/browser foundation complete, the next default safe engineering boundary is **P5.1 — provider selection/cost/reliability review for SERP + keyword data**. P5.1 is research/adapter-planning only and must not make provider calls, bind credentials, collect evidence, or activate runtime execution.

A separately authorized **P1.4–P1.8 live GSC path** may be chosen instead only with explicit bounded authorization for the exact credential/consent/property/read step.

**P4.9 — Storybook/component documentation** remains optional/unselected and may be taken deliberately later; it is not required before P5.1.

A separately authorized **P1 live-provider** task may be chosen deliberately instead, but a generic `continue` does not authorize real OAuth credentials, consent, provider calls, property binding, evidence persistence, scheduler/worker execution or publication.

P3.6 completion does not authorize production observation/evidence application reads, persistence, backfill/DML, archive/prune/delete execution, provider activity, scheduling, autonomous mutation, publication, or further production DDL. Each remains a separate explicit gate.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus the latest task closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before any sync/publish decision.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.

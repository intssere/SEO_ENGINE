# SEO ENGINE — Master Completion Roadmap

**Program tracker:** GitHub issue #139 — `PROGRAM — SEO ENGINE industry-grade completion roadmap`  
**Purpose:** provide one durable, repository-resident plan that lets any future ChatGPT session, coding agent, Replit session, IDE assistant, or human engineer continue from the current checkpoint through a complete industry-grade SEO/GEO operating system without rediscovering scope or weakening safety boundaries.

This document is **planning and continuity**, not execution authorization.

---

## 0. Source-of-truth hierarchy

Every agent must use this precedence:

1. `AGENTS.md` — normative workflow, safety and authorization contract.
2. `CURRENT_STATE.md` — current mutable engineering/release checkpoint and exact next boundary.
3. `MASTER_COMPLETION_ROADMAP.md` — full remaining path to application completion and durable program status.
4. `ARCHITECTURE.md` — system architecture and trust boundaries.
5. `PROJECT_HANDOFF.md` — narrative continuation context and historical operational details.
6. `.agents/skills/seo-engine-project/SKILL.md` — procedural execution skill.
7. `.agents/memory/MEMORY.md` plus linked notes — durable lessons and task closeouts.
8. Active GitHub issue/PR for the current task — task-specific scope and acceptance criteria.

If any mutable SHA, deployment state, gate state or task status differs between documents, independently verify GitHub/Replit/runtime state and update `CURRENT_STATE.md`; do not guess.

---

## 1. Current program checkpoint

Current engineering checkpoint at the P2.6 implementation merge:

- repository: `intssere/SEO_ENGINE`
- GitHub `main` implementation merge: `cdc272ea33b5e937662f85543fde9928175777bf`
- tree: `227da28f22bc0047a71227f4fd01925a2011f717`
- Replit app: `SEO_ENGINE`
- Replit replId: `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`
- production URL: `https://dsseoengine.replit.app`

`CURRENT_STATE.md` owns the exact mutable `main` checkpoint after later docs-only merges; always independently resolve it before acting.

Current published production application source remains:

- Task #73 source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- deployment status: success

Task #74 is architecture/planning only. Task #75 and P2.1–P2.6 are engineering-complete but have not been published as application releases.

Completed high-level foundations include authentication/RBAC, guarded proposal/execution primitives, bounded competitor acquisition, market/category intelligence architecture, source registry/normalization/job authorization, controlled signal execution, GSC read-runner foundation, GSC OAuth/property readiness, first-live-read readiness, OAuth client/config binding architecture, GSC profile-isolated runtime binding, first-party `baseline` vs `full_site` crawl-controller planning, network-free sitemap inventory/canonical dedupe, bounded crawl execution controls/checkpoint-resume, deterministic completion-ledger/whole-site completeness certification, deterministic crawl-history/change comparison, and bounded incremental recrawl planning.

**Next safe engineering milestone:** P2.7 — URL Explorer API/query model.

---

## 2. Product north star

SEO ENGINE is not intended to become another collection of disconnected SEO utilities. The target product is an **autonomous search-optimization operating system with verifiable control**.

Target lifecycle:

`Observe → Normalize → Understand → Detect → Prioritize → Propose → Validate → Approve/Policy-Authorize → Execute → Verify → Measure → Learn → Repeat`

The product should combine:

- Ahrefs-level clarity and investigation ergonomics;
- Sitebulb/Screaming Frog-level technical crawl depth;
- Semrush-level breadth and thematic organization;
- Search Atlas/OTTO-like agentic execution experience;
- Surfer-like detect/optimize/measure content workflows;
- BrightLocal-like specialized visualization where local/search geography matters;
- SEO ENGINE-specific evidence lineage, deterministic authorization, replay protection, read-after-write verification, rollback, audit history and impact learning.

The competitive advantage should be **safe closed-loop optimization**, not merely data volume.

---

## 3. What “complete” means

SEO ENGINE v1 is complete only when all of the following are true in production:

### Data and crawling
- Full-site crawl mode can discover and process 100% of the approved canonical/crawlable inventory within configured safety ceilings.
- The current 30-page crawl remains available as `baseline`/quick-certification mode; it is not the production full-site ceiling.
- Full-site crawling is resumable, checkpointed, deduplicated, sitemap-aware, rate-limited and trap-resistant.
- Incremental recrawls operate from change/freshness/value signals after the first complete crawl.
- GSC read-only data is connected through a profile-isolated OAuth path and verified property binding.
- First-party catalog/commerce and analytics signals required by the product are live and normalized.
- External competitor/SERP/keyword/trend/backlink signal sources required by the initial product are operational through reviewed adapters.

### Intelligence
- All normalized observations can be represented with provenance, freshness and confidence.
- Evidence persistence is durable, deduplicated and queryable.
- Technical, content, keyword, competitor, internal-link, AI/GEO and performance opportunities are generated from real evidence.
- Opportunity scoring incorporates impact, confidence, risk, freshness and effort.
- Recommendations expose why they exist, which evidence supports them, what changed, expected effect and verification method.

### Execution
- Existing proposal → approval → action → provider mutation → verification → rollback foundations are integrated into the product workflow.
- High-risk or ambiguous actions remain approval-bound and fail closed.
- Low-risk action classes may become policy-authorized only after separate engineering, certification and explicit authorization.
- No autonomous worker may bypass RBAC, evidence, replay, scope, target, freshness, verification or rollback rules.

### Product experience
- No primary navigation destination is a placeholder or engineering-only screen.
- Product IA is organized around user workflows, not backend task numbers.
- Command Center, Discover, Audit, Execute, Measure and System workspaces are complete.
- URL/crawl explorers, evidence drawers, change history, impact attribution, saved filters/views and exports are production quality.
- Responsive behavior is professional across desktop/tablet/mobile.
- Accessibility meets WCAG 2.2 AA for supported workflows.
- Large tables use server-side filtering/pagination and/or virtualization appropriate to dataset size.

### Operations and quality
- Unit, integration, contract, E2E, accessibility and critical visual-regression coverage exists for production workflows.
- Runtime health, job health, provider failures, stale data, queue depth, crawl progress and mutation outcomes are observable.
- Secrets/tokens never leak into browser payloads, logs, issues, docs or authorization strings.
- Backup/recovery, replay/idempotency, rate limits and provider-failure recovery are documented and certified.
- Production performance budgets and error handling are defined and met.
- Final end-to-end production certification demonstrates the closed loop without uncontrolled mutation.

---

## 4. Permanent governance rules

This roadmap does not override `AGENTS.md`.

A roadmap item marked `READY`, `NEXT` or `PLANNED` does **not** authorize:

- real Google OAuth client creation/change;
- client-secret creation/view/storage/use;
- OAuth consent or delegated token acquisition;
- `sites.list` or Search Analytics provider requests;
- production DDL;
- provider/public-site writes;
- Task #53/#54/#64 execution;
- enabling mutation gates;
- enabling an autonomous scheduler/worker that can mutate provider/public state;
- destructive credential, provider or data recovery actions.

Generic `continue` may advance safe/default-off engineering explicitly allowed by the active issue and `AGENTS.md`, but live-provider and mutation stages require their exact bounded authorization.

For every implementation task use the mandatory GitHub-first branch → tests → PR → exact-head CI → merge → postmerge CI → exact Replit sync workflow.

---

## 5. Product information architecture target

Replace the current flat navigation with six product domains.

### A. Command Center
Primary questions: What changed? What is broken? What matters now? What is running? What needs approval? What improved?

Required surfaces:
- executive KPI strip;
- technical/search/AI health summary;
- priority feed;
- active jobs/crawls;
- pending approvals;
- fresh regressions;
- top opportunities;
- recent verified impact;
- global time/site/device/country filters;
- `Ask SEO ENGINE` command interface.

### B. Discover
Subareas:
- Opportunities;
- Keywords & Rankings;
- Competitors;
- Search Intelligence;
- Content Opportunities;
- AI/GEO Visibility.

### C. Audit
Subareas:
- Site Health;
- Full-Site Crawl;
- URL Explorer;
- Crawlability/Indexability;
- Canonicals;
- Metadata;
- Structured Data;
- Internal Links;
- Performance/Core Web Vitals;
- Images;
- Content Quality;
- AI-bot/accessibility checks;
- crawl comparison/history.

### D. Execute
Subareas:
- Recommended Actions;
- Approvals;
- Deployments/Executions;
- Experiments;
- Rollbacks/Manual Intervention.

### E. Measure
Subareas:
- Search Performance;
- Rankings;
- Impact;
- Change Timeline;
- Reports/Exports;
- experiment/holdout results.

### F. System
Subareas:
- Connections;
- Data Sources;
- Engine Activity;
- Audit Log;
- Automation Policies;
- Users/RBAC where appropriate;
- Settings.

Remove `Learning` from primary product navigation; contextual education/help belongs inside workflows or documentation.

---

## 6. UX/UI quality program

Do not patch isolated screens indefinitely. Build a coherent product system.

### UX-01 — Design system foundation
- semantic color tokens for critical/warning/verified/info/AI/running states;
- typography scale and dense enterprise spacing;
- light theme as primary; dark theme optional after parity;
- cards, panels, drawers, dialogs, tabs, filters, chips, badges, empty states, skeletons and toasts;
- standard chart grammar;
- standard status/progress grammar;
- keyboard/focus patterns;
- responsive breakpoints;
- accessibility tokens and contrast checks.

### UX-02 — Data workbench primitives
- virtualized/server-backed data grid;
- sortable/resizable/reorderable columns;
- compound filters;
- saved views;
- CSV/export controls;
- row detail drawer;
- bulk selection where safe;
- deep links preserving filters;
- loading/error/stale states;
- URL/entity inspection patterns.

### UX-03 — Evidence drawer
Every opportunity/action should expose:
- why it exists;
- evidence sources;
- evidence freshness;
- confidence;
- affected entities/URLs;
- current vs proposed state;
- expected impact;
- risk;
- verification plan;
- rollback plan;
- advanced lineage/fingerprint metadata behind an expert tab.

### UX-04 — Professional command experience
`Ask SEO ENGINE` should eventually answer questions against the governed evidence graph and may prepare plans, but must route any state-changing action through the same authorization/execution controls as the standard UI.

### UX-05 — Accessibility and testability
- WCAG 2.2 AA target;
- keyboard-complete primary workflows;
- meaningful focus state;
- screen-reader labels/live regions;
- charts with textual/table alternatives where needed;
- automated axe checks;
- E2E interaction tests;
- visual regression for high-value pages.

Current React/Vite/Tailwind/Radix/TanStack/Recharts/Framer/cmdk foundation is retained unless a task proves replacement is necessary.

---

## 7. Full-site crawling program

The 30-page limit must become a **baseline mode**, not be deleted blindly.

### Crawl modes

`baseline`
- fast read-only certification;
- bounded around the existing 30-page behavior;
- suitable for smoke checks and provider/crawler validation.

`full_site`
- inventory-driven rather than unlimited;
- sitemap index/root sitemap discovery first;
- internal-link discovery may supplement sitemap inventory;
- canonical normalization and dedupe;
- robots/noindex/canonical/exclusion accounting;
- query/filter/trap controls;
- bounded concurrency and per-origin request rate;
- safe retry policy;
- batch checkpoints and resumability;
- explicit hard safety fuse for unexpectedly large inventories;
- deterministic completion ledger.

### Full-site completion ledger
Must report at minimum:
- discovered;
- eligible;
- fetched successful;
- redirects;
- canonicalized/deduplicated;
- robots/excluded;
- noindex;
- failed;
- pending;
- coverage percent;
- hard-limit state;
- whole-site-certified boolean/reason.

P2.4 defines whole-site certification as a completeness/accounting assertion over the approved canonical inventory, not a zero-issues health claim. Known redirects, robots exclusions and noindex pages may be fully classified terminal states; terminal crawl failures still block certification.

### Post-baseline operating mode
After a successful initial full crawl, schedule incremental recrawls from:
- new URLs;
- changed sitemap timestamps/content fingerprints;
- high-value pages;
- stale pages;
- pages with unresolved issues;
- pages implicated by new GSC opportunities;
- pages affected by recent executions;
- periodic full reconciliation.

Competitor crawling remains separately bounded and must never inherit first-party whole-site permissions automatically.

---

## 8. Program phases and durable work-item IDs

Use the stable roadmap IDs below even if GitHub Task numbers change. Every future implementation issue should include its roadmap ID.

### Phase P0 — Continuity and program control

| ID | Work item | Status |
|---|---|---|
| P0.1 | Durable master roadmap + program issue + agent read-order | DONE — issue #139 / PR #141 / merge `f7fa31c6d3ad619cebaa26caa46e236b10d22a43` |
| P0.2 | Maintain roadmap status after every material task | CONTINUOUS |
| P0.3 | Final program closure only after production completion certification | OPEN |

### Phase P1 — Provider isolation and first-party readiness

| ID | Work item | Status / dependency |
|---|---|---|
| P1.1 | Task #75 GSC OAuth Profile-Isolated Runtime Binding Foundation | DONE — issue #142 / PR #143 / merge `b6ae18db99baf022cdb7368f3e17c4bb1fa1a687` |
| P1.2 | GSC-specific config slots, sealed purpose dispatch, no legacy GA4 fallback | DONE in Task #75 |
| P1.3 | Static no-network GSC readiness surface | PLANNED; live-provider/publication boundary remains separate |
| P1.4 | Real Google OAuth client creation/config binding | explicit authorization required |
| P1.5 | Real client-secret placement and readiness check | explicit authorization required |
| P1.6 | Admin Google consent and encrypted delegated token persistence | explicit authorization required |
| P1.7 | GSC `sites.list`, exact property selection/binding | explicit authorization required |
| P1.8 | First bounded Search Analytics read through Task #70/#71 lineage | explicit authorization required |
| P1.9 | Separate GA4 read-only profile/runtime isolation and activation | PLANNED; must not reuse broad legacy path implicitly |
| P1.10 | Shopify/catalog first-party completeness and refresh contract | PLANNED |

### Phase P2 — Full-site crawl and technical intelligence

| ID | Work item | Status |
|---|---|---|
| P2.1 | Crawl controller architecture: baseline vs full_site | DONE — issue #145 / PR #146 / merge `aa564d68b1b92fc673ff1a5fa8113aa0321a1a6d` |
| P2.2 | Sitemap inventory/discovery + canonical dedupe | DONE — issue #151 / PR #152 / merge `7822504b1d5cf6bbd9f1a5f797320526830978b4` |
| P2.3 | Batched crawler, rate limits, trap guards, checkpoints/resume | DONE — issue #154 / PR #155 / merge `60cd0b60ce20fffac5d33ddb19aae50d6514deab` |
| P2.4 | Crawl completion ledger and whole-site certification | DONE — issue #157 / PR #158 / merge `977ea26dc823bc21e8371ddac0d35e3b702907f0` |
| P2.5 | Crawl history/comparison and change detection | DONE — issue #160 / PR #161 / merge `a177c4590273da29113af75b431d6ae20c7e3b4c` |
| P2.6 | Incremental recrawl planner | DONE — issue #162 / PR #163 / merge `cdc272ea33b5e937662f85543fde9928175777bf` |
| P2.7 | URL Explorer API/query model | DONE |
| P2.8 | Technical issue taxonomy and evidence model expansion | DONE |

### Phase P3 — Durable evidence and unified search data model

| ID | Work item | Status |
|---|---|---|
| P3.1 | Observation/evidence persistence design | DONE |
| P3.2 | Dedupe/fingerprint/freshness/provenance persistence | DONE |
| P3.3 | Retention/history/supersession model | DONE |
| P3.4 | Read models for page/query/category/competitor/entity evidence | DONE |
| P3.5 | Evidence quality/conflict handling | DONE — issue #185 / PR #186 / merge `73e5c1fab4d76d931f5308c7e197f09a36deb5ef` |
| P3.6 | Production migration/DDL | DONE — issue #188 / PR #192 / merge `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc` |

P3.6 Production checkpoint:

- Production has **34 public base tables**.
- P3.6 added `seo_observation`, `seo_evidence`, and `seo_observation_evidence`.
- All three P3.6 tables were independently verified empty immediately after migration; catalog verification reported zero mismatches.
- Application observation/evidence persistence and Production reads remain disabled.
- P3.6 did not authorize provider/competitor requests, observation/evidence persistence, scheduler/worker activation, public-site mutation, publication, or any further Production DDL.

### Phase P4 — Product experience foundation

| ID | Work item | Status |
|---|---|---|
| P4.1 | Information architecture/navigation v2 | DONE — issue #200 / PR #201 |
| P4.2 | Design tokens/components/status grammar | DONE — issue #202 / PR #203 |
| P4.3 | Enterprise data-grid/workbench primitives | DONE — issue #204 / PR #205 |
| P4.4 | Evidence drawer | DONE — issue #206 / PR #207 |
| P4.5 | Command Center v2 | DONE — issue #208 / PR #209 |
| P4.6 | Full-Site Audit/Crawl Explorer UI | DONE — issue #210 / PR #211 |
| P4.7 | responsive/mobile/tablet professional polish | DONE — issue #212 / PR #213 |
| P4.8 | accessibility test baseline and WCAG 2.2 AA remediation | DONE — issue #214 / PR #215 |
| P4.9 | Storybook/component documentation if selected | PLANNED — optional; not auto-selected |
| P4.10 | Playwright/axe/visual regression critical-path suite | DONE — issue #216 / PR #217 |

### Phase P5 — External market/search intelligence

| ID | Work item | Status |
|---|---|---|
| P5.1 | Provider selection/cost/reliability review for SERP + keyword data | DONE — issue #218 / PR #219 / merge `1d1ee1b5284b62fe9cb446a7ad6d79a35db53259` |
| P5.2 | SERP/ranking adapter(s) | DONE — issue #221 / PR #222 / merge `873aebeae798e61b2c313dfbe5e618c09c6a7f75` |
| P5.3 | keyword volume/difficulty/opportunity adapter(s) | DONE — issue #224 / PR #225 / merge `2c8dc3c8d46fbe0563a8083548b6b2bbf87e1e76` |
| P5.4 | trends/source adapter(s) | DONE — issue #227 / PR #228 / merge `1680969b64f767552262494f1586fac26b77475b` |
| P5.5 | backlink authority/link-gap adapter(s) | DONE — issue #231 / PR #232 / merge `605cf9133da8a26ddf9989cab005ec91161c033f` |
| P5.6 | competitor visibility/page/topic-gap operational pipeline | DONE — issue #234 / PR #235 / merge `e0cf3758be1dff24f443a0a42fa19d2a4110b82b` |
| P5.7 | category/market competitor intelligence UI | DONE — issue #237 / PR #238 / merge `64947e7662af1fadb389d9dd94f98a2e803d8911` |
| P5.8 | source quality/cost/rate-limit telemetry | DONE — issue #240 / PR #241 / merge `56b2f8e9dd4e6cc4934c2ab55c549ea6284d59d3` |

### Phase P6 — Opportunity and recommendation engine

| ID | Work item | Status |
|---|---|---|
| P6.1 | Unified opportunity types across technical/content/query/competitor/link/AI | DONE — issue #243 / PR #244 / merge `6d979eba38a56b629c9fe96d7921eac4449b8f60` |
| P6.2 | impact × confidence × risk × effort × freshness scoring | DONE — issue #246 / PR #247 / merge `0bc3745e978fd57b944123283d3f54dd7e1dd3fb` |
| P6.3 | conflict/dedupe/suppression/prioritization | DONE — issue #249 / PR #250 / merge `06739367624018c501a11459881462e2be480657` |
| P6.4 | explanation/evidence generation | DONE — issue #252 / PR #253 / merge `b3b83e36ba6bb0c5461396eb2a2b1aa33e62762f` |
| P6.5 | actionability classifier: informational / recommend / approval / blocked | DONE — issue #255 / PR #256 / merge `0a306365d8f0e23f203e4dc9c59afed0c04c586f` |
| P6.6 | current-vs-proposed preview/diff generation | DONE — issue #258 / PR #259 / merge `6f650c985dfd7e8097d2f030704c1841126b587a` |
| P6.7 | opportunity lifecycle/history | DONE — issue #261 / PR #262 / merge `d587a1cc7737c87e09b5bdb827b1cc80170c8a8b` |

### Phase P7 — AI/GEO visibility

| ID | Work item | Status |
|---|---|---|
| P7.1 | AI crawler/bot accessibility audit | DONE — issue #264 / PR #265 / merge `74e5de6518359f9f92b2e73edd5d44f02eecffa2` |
| P7.2 | prompt/topic set model | DONE — issue #267 / PR #268 / merge `ecee3e9796c04c25f3c800e73e621c2cef299666` |
| P7.3 | AI answer/brand/citation visibility collection strategy | DONE — issue #270 / PR #271 / merge `399a6b946b213b2e8aff9416ca5287896476fe48` |
| P7.4 | citation/domain/competitor comparison | DONE — issue #273 / PR #274 / merge `3e34b7e151a0e5669b986e377dded16c53f86073` |
| P7.5 | AI visibility scoring/history | DONE — issue #276 / PR #277 / merge `5a378eb72471aa7697011c814a7703213f5ed8ed` |
| P7.6 | AI/GEO opportunity integration | DONE — issue #279 / PR #280 / merge `2a375966f943f67c5dc606c9e9257585b3e4824f` |
| P7.7 | replace current AI Visibility placeholder with production workspace | DONE — issue #282 / PR #283 / merge `c70118053ac8e86c284c9e5a151b6f26f52d05dc` |

### Phase P8 — Governed execution and implementation

Existing Tasks #51–#54 remain the safety foundation.

| ID | Work item | Status |
|---|---|---|
| P8.1 | Unify opportunity → proposal → approval UI around existing control primitives | DONE — issue #285 / PR #286 / merge `6dd42a2850713a4692039bb76900731129422061` |
| P8.2 | Evidence/risk/preview/verification/rollback action cards | DONE — issue #288 / PR #289 / merge `964e940d82f93dece9fbaaf56eca21782318e357` |
| P8.3 | Expand bounded Shopify/site mutation action classes only after individual review | REVIEW COMPLETE / IMPLEMENTATION BLOCKED — issue #291 selects product media alt text as the preferred future class; current Shopify `fileUpdate` requires a separately authorized isolated `write_files` scope/credential architecture, so no implementation or live mutation is authorized |
| P8.4 | Add verification adapters per mutation class | PLANNED |
| P8.5 | Add deterministic rollback/manual-intervention workflows | PLANNED |
| P8.6 | Action history and audit ledger | PLANNED |
| P8.7 | First persistent live low-risk action pilot | explicit authorization required |
| P8.8 | Progressive policy-authorized low-risk execution | late-stage; separate architecture/certification required |

### Phase P9 — Scheduler, workers and safe autonomy

| ID | Work item | Status |
|---|---|---|
| P9.1 | Read-only scheduler/queue architecture | DONE — issue #293 / PR #294 / merge `e348aed49b3d787d237096a2bde24b23930e3223` |
| P9.2 | scheduled GSC/analytics/catalog refresh | DONE — issue #296 / PR #297 / merge `6f7b1dec70d99e6797980e08b10f072c6869d18a`; GSC runner foundation recognized only as architecture availability; GA4/catalog runner foundations remain explicit gaps; no runtime scheduling/provider execution |
| P9.3 | scheduled full/incremental crawl policy | DONE — issue #299 / PR #300 / merge `023df71e35376a774c11494d8c17b03a65e7c7b6`; exact P2.1–P2.6 + P9.1 lineage, periodic full reconciliation, P2.6 fallback preservation, bounded incremental/no-work review; no live timer/crawl/network/durable queue/worker/persistence/publication |
| P9.4 | bounded external intelligence refresh | DONE — issue #304 / PR #305 / merge `5031d9a4d10f68fbe7a82ccc3acb562e31506a9b`; exact Task #66/#67/#68 + P5.2–P5.5/P5.8 + P9.1 lineage, supplied-result/live-runtime separation and bounded telemetry review; no live provider/runtime/persistence/publication |
| P9.5 | failure/retry/dead-letter/idempotency controls | DONE — issue #307 / PR #308 / merge `83334cf68900bf779851f92056dc351811822533`; exact P9.1–P9.4 artifact binding, deterministic idempotency, supplied attempt-history dedupe/conflict detection, conservative failure taxonomy, bounded retry-review and dead-letter-review semantics; no live retry loop, durable queue/DLQ, worker, provider/crawl request, persistence or publication |
| P9.6 | worker observability and pause/kill controls | DONE — issue #310 / PR #311 / merge `6886c518cad989d14ea8f61ff02d20fbf2f771ab`; deterministic pause/drain/kill/resume transitions, P9.5 claim-time eligibility, heartbeat health, kill reconciliation/manual-intervention recovery, terminal dead-letter/no-work preservation; no live worker/scheduler/retry loop, durable control/queue/DLQ, provider/crawl request, persistence or publication |
| P9.7 | recommendation generation worker | DONE — issue #313 / PR #314 / merge `b7a64e860f7fbd7b15e9e87a5812e0cef442c104`; exact P6.1–P6.7 lineage rebuild, P9.6 running-control gate, deterministic advisory/proposal-review templates, changed-preview requirement for approval class, stable idempotency, P8 governance handoff projection; no live worker/AI/provider/persistence/execution/mutation/publication |
| P9.8 | autonomous mutation policy engine | REVIEW COMPLETE / IMPLEMENTATION BLOCKED — issue #316 / PR #317 / merge `84944e49cdc2e8dee0dde3b2abb723daf7c5a535`; selects product SEO `meta_description` as first future autonomous canary class; defines external immutable policy grants, separate policy-vs-human authorization provenance, policy-aware execution namespace, strict evidence/quality/risk/idempotency/quota/cooldown/kill safety and named implementation prerequisites; no autonomous code/runtime/provider/database/publication activation |

### Phase P10 — Measure, experiments and learning loop

| ID | Work item | Status |
|---|---|---|
| P10.1 | unified change timeline | DONE — issue #319 / PR #320 / merge `779b5a655dd04f60744d24ee373071a6a03dca23`; deterministic/read-only direct-source chronology/lineage normalization, exact P6.7 transition adapter, replay dedupe/conflict fail-closed semantics, descriptive execution/measurement state and explicit non-causal guards; no live DB/provider/runtime/mutation/publication activation |
| P10.2 | action-to-page/query/category attribution | DONE — issue #322 / PR #323 / merge `34eb263c48b2c01920cb23df1b854d7df95b3bea`; exact P10.1 integrity verification, explicit-action-ID-only page/query/category association, provenance retention, unavailable-state preservation, fail-closed lineage/page conflicts and explicit non-causal guards; no live DB/provider/runtime/mutation/publication activation |
| P10.3 | before/after windows and confounder flags | DONE — issue #325 / PR #326 / merge `7337cefde56bfecc11664f81fbba8adcc6130393`; exact P10.1→P10.2 integrity, retained-live-only anchor, caller-supplied canonical windows, exact direct-scope observation membership, direct-evidence confounder flags, deterministic replay guards and explicit non-causal semantics; no live DB/provider/runtime/mutation/publication activation |
| P10.4 | experiment/holdout framework where practical | DONE — issue #328 / PR #329 / merge `50ef9fda7b9e0bdee2d48e1d2ba1400b8d9a5b7e`; exact P10.1→P10.3 integrity, one bounded treatment action, exact shared P10.3 windows, caller-supplied holdouts/assignment provenance, exact-scope observations and descriptive structural contamination/coverage flags; no live assignment, statistics/causal calculation, DB/provider/runtime/mutation/publication activation |
| P10.5 | expected-vs-actual outcome tracking | DONE — issue #331 / PR #332 / merge `d038fbb1b8cccc67366dec7eb79961e10e947507`; exact P10.4 rebuild/integrity, supplied metric/expectation/actual provenance, canonical-decimal BigInt subtraction, descriptive above/equal/below relation, unavailable-state/replay guards and explicit non-causal/non-statistical semantics; no live outcome/DB/provider/runtime/mutation/publication activation |
| P10.6 | recommendation calibration/learning signals | DONE — issue #334 / PR #335 / merge `255ec1058a01bf20f0db0e04f45d1c981b7c2ac6`; exact P10.5 rebuild/integrity, exact same-action recommendation lineage, caller-supplied treatment calibration definitions, independent per-actual directional signals and explicit non-reward/non-quality semantics; no model/ranking/policy/live DB/provider/runtime/mutation/publication activation |
| P10.7 | Impact workspace v2 | DONE — issue #337 / PR #338 / merge `72cf75fb9248c750b485d212a8a0f9245d785809`; synthetic/read-only six-layer P10.1–P10.6 lineage projection, exact outcome/calibration binding validation, responsive Impact workspace and explicit non-causal/non-reward/no-execution semantics; no live API/provider/DB/model/ranking/policy/runtime/mutation/publication activation |

### Phase P11 — Enterprise hardening

| ID | Work item | Status |
|---|---|---|
| P11.1 | production performance budgets and profiling | DONE — issue #341 / PR #342 / merge `b43d10f5662862cb6467edd056b1e8adf96c2aa5`; explicit JS/CSS raw+gzip budgets, hard post-build gate, normalized synthetic-local profile contracts and supplied-profile regression semantics; canonical GitHub browser/budget CI and Replit non-browser/build certification; no production load/provider/DB/runtime/deployment/publication activation |
| P11.2 | security review: auth, CSRF, SSRF, CSP, headers, secret handling, supply chain | DONE / CONTINUOUS + final pass — issue #345 / PR #346 / merge `cdf1ca8d9c1138dc8dd9fed4d41c1d6e31f5b7cb`; trusted-proxy/auth-return/header/supply-chain hardening plus network-free posture contracts while preserving existing SSRF transport; exact-head/post-merge CI + Replit certification; no live scan/credential/provider/DB/runtime/deployment/publication activation; final security pass still required before P12 |
| P11.3 | observability: metrics/logs/traces/alerts/job health | DONE — issue #348 / PR #349 / merge `e2cd22ae0e8e072be04bb6d31369e27e9f8ee040`; deterministic structured events/logs, descriptive metric rollups, exact trace/correlation integrity, exact P9.1/P9.6 job-health evidence and non-delivering alert candidates; exact-head/post-merge CI + Replit certification; no production telemetry sink/ingestion/alert/runtime/deployment/publication activation |
| P11.4 | backup/recovery and disaster-runbook certification | DONE — issue #351 / PR #352 / merge `41329684f56f16e6da1645cd6c29339e038cf1c7`; deterministic recovery inventory/RPO-RTO/synthetic backup manifest/restore-stage/runbook certification with exact migration/P3.6 schema lineage and external-dependency preservation; exact-head/post-merge CI + Replit certification; no production backup/restore/DB/storage/secret/provider/runtime/deployment/publication activation |
| P11.5 | accessibility WCAG 2.2 AA certification | DONE — issue #355 / PR #356 / merge `11d4d0d363bac9e1d6da8d5f4ee21c49eb1c0ed0`; all routed surfaces, all-impact WCAG 2.2 A/AA axe gate, 320px reflow, target-size/spacing, focus and reduced-motion certification; GitHub canonical Chromium 81/81 green; no production scan/runtime/deployment/publication activation |
| P11.6 | responsive/product polish | DONE — issue #358 / PR #359 / merge `93ccd007c9fb152f60e88daefe6c727afed3fb71`; all routed surfaces + not-found across 1440/1024/768/390 viewports with overflow/geometry/clipping/overlap/internal-scroll/compact-shell/touch certification; canonical GitHub Chromium 100/100 green; P11.5 preserved; no production/runtime/deployment/publication activation |
| P11.7 | reporting/export/shareable executive views | DONE — issue #361 / PR #362 / merge `83ea7efde2e78f5ccf59ee5bec7ecf7ba791c9d4`; deterministic synthetic/read-only `/reports` workspace, stable report fingerprinting, local CSV/JSON/print, bounded URL share-state, inherited P11.5/P11.6 gates; canonical GitHub Chromium 110/110 green; no production export/external delivery/runtime/deployment/publication activation |
| P11.8 | multi-site/project abstraction if required for v1 commercial scope | DONE — issue #364 / PR #365 / merge `7a47acfeede05b3e9a4ab7a1dd1f6ce670245bc7`; review selects Organization=tenant/account and Site=workspace/project, rejects a duplicate v1 Project entity, and keeps true multi-site runtime blocked behind membership/request/OAuth/UI/isolation prerequisites; no schema/runtime/data/provider/deployment/publication change |
| P11.9 | retention/privacy/provider terms and compliance review | DONE — issue #367 / PR #368 / merge `9ed6377963d052a4beccd9a43c102dcddbd798c7`; engineering/provider-policy review inventories data/retention/deletion/credential/provider obligations and records ten fail-closed pre-production blockers; exact-head/post-merge CI + canonical Chromium 110/110; no legal-compliance claim, production deletion/revocation/provider/runtime/deployment/publication action |
| P11.10 | load/scale testing for target URL/query volumes | DONE — issue #371 / PR #372 / merge `fbf1abd2e1f04de649b9c54b29b74873098ccdb9`; exact-head CI #658 + post-merge CI #659; synthetic pure-function certification at 25k URLs, 100k query signals, 25k candidates and 100 schedules, 739.787 ms combined / 96.42 MiB max observed heap on the final canonical run; 1,250 workspace tests + 110/110 Chromium; no production/provider/DB load, runtime activation, deployment or publication |

### Phase P12 — Final production completion certification

**P11 enterprise hardening is complete. P12 is now the active program phase. Generic continuation starts with a criterion-by-criterion readiness/gap review; live proofs remain separately authorized.**

| ID | Work item | Status |
|---|---|---|
| P12.1 | no primary placeholder screens | NOT READY |
| P12.2 | full-site crawl complete and repeatable | NOT READY |
| P12.3 | live first-party data integrations certified | NOT READY |
| P12.4 | live external intelligence certified | NOT READY |
| P12.5 | opportunity engine certified against real evidence | NOT READY |
| P12.6 | governed execution/rollback certified | PARTIAL FOUNDATION ONLY |
| P12.7 | read automation certified | NOT READY |
| P12.8 | measurement/impact learning loop certified | NOT READY |
| P12.9 | UX/accessibility/performance/security acceptance passes | NOT READY |
| P12.10 | final release publication + runtime certification + program issue #139 closeout | NOT READY |

---

## 9. Critical path and parallel-safe work

### Critical path

`P1.1 GSC isolation [DONE]`
→ `P1 real first-party read activation`
→ `P3 durable evidence`
→ `P6 opportunity engine`
→ `P8 governed execution`
→ `P10 measurement/learning`
→ `P12 final certification`

P2 full-site crawl work is a parallel-safe engineering lane while live-provider authorization remains pending, and is required before whole-site production certification.

### Safe engineering lane while live-provider authorization is pending

The project may continue, one governed task at a time, with default-off/network-fake engineering such as:

- P2 sitemap inventory, crawl-controller and bounded-crawler engineering;
- P4 design system/IA/data-grid/evidence-drawer work;
- P3 persistence design before DDL;
- P5 provider research/adapter contracts using fake transports;
- P6 deterministic scoring/explanation foundations;
- P7 AI/GEO architecture;
- P9 scheduler design with execution disabled;
- tests/docs/observability foundations.

Never use “safe parallel lane” to bypass the repository rule that each active task must be completed/certified before the next task is started unless the operating contract is deliberately revised.

---

## 10. Immediate task sequence from today

Unless a newly discovered dependency forces a reviewed change, the recommended next sequence is:

1. **DONE — Task #75 / P1.1–P1.2:** GSC OAuth Profile-Isolated Runtime Binding Foundation v1.
2. **DONE — P2.1:** Full-Site Crawl Controller Architecture + baseline/full_site mode contract.
3. **DONE — P2.2:** Sitemap inventory/discovery + canonical dedupe foundation.
4. **DONE — P2.3:** bounded crawl execution-control, rate limits, trap guards and checkpoint/resume foundation.
5. **DONE — P2.4:** deterministic completion ledger and whole-site completeness certification foundation.
6. **DONE — P2.5:** deterministic crawl history/comparison and change detection over retained inventory/certification artifacts.
7. **DONE — P2.6:** bounded incremental recrawl planning with explicit full-reconciliation fallback where per-URL evidence is unavailable.
8. **DONE — P2.7:** URL Explorer API/query model.
9. **DONE — P2.8:** technical issue taxonomy/evidence expansion.
10. **DONE — P3.1–P3.6:** durable observation/evidence model through the explicitly authorized Production migration; application persistence/reads remain disabled.
11. **DONE — P4.1:** Information Architecture / Navigation v2.
12. **DONE — P4.2:** Design tokens/components/status grammar.
13. **DONE — P4.3:** Enterprise data-grid/workbench primitives.
14. **DONE — P4.4:** Evidence drawer.
15. **DONE — P4.5:** Command Center v2.
16. **DONE — P4.6:** Full-Site Audit / Crawl Explorer UI with explicit unbound P2 read-model states and no runtime activation.
17. **DONE — P4.7:** responsive/mobile/tablet professional polish across completed P4.1–P4.6 surfaces.
18. **DONE — P4.8:** accessibility source/unit/build baseline and WCAG 2.2 AA remediation across P4.1–P4.7.
19. **DONE — P4.10:** isolated Playwright/axe/visual regression critical-path suite; GitHub Ubuntu/Chromium is the canonical browser runner.
20. **P4.9 — optional:** Storybook/component documentation only if deliberately selected.
21. **P1.4–P1.8 — separately authorized:** real GSC client/secret/consent/property/first-read sequence when explicitly approved.
22. **P1.9/P1.10 — separately authorized as applicable:** isolated GA4 and catalog completeness/refresh.
23. **DONE — P5.1:** provider selection/cost/reliability review for SERP + keyword data under issue #218 / PR #219; DataForSEO selected as the initial dual-purpose engineering target, SerpApi as the SERP benchmark/fallback, Google Ads Keyword Planning as the official keyword-reference candidate, and Ahrefs/Semrush deferred as broad-suite candidates; no live provider calls or enrollment.
24. **DONE — P5.2:** DataForSEO Google Organic SERP/ranking adapter foundation under issue #221 / PR #222; deterministic standard-task contract, bounded supplied-result ranking projection and Task #68 compatibility; no provider enrollment, credentials, network calls, source admission, Task #70 execution, persistence or publication.
25. **DONE — P5.3:** provider-neutral keyword measurement semantics + DataForSEO Keyword Overview supplied-result adapter, issue #224 / PR #225 / merge `2c8dc3c8d46fbe0563a8083548b6b2bbf87e1e76`; no provider enrollment, credentials, source admission, Task #70 execution, persistence, or publication.
26. **DONE — P5.4:** provider-neutral request-frame trend semantics + DataForSEO Google Trends Explore Standard supplied-result adapter, issue #227 / PR #228 / merge `1680969b64f767552262494f1586fac26b77475b`; no provider enrollment, credentials, source admission, Task #70 execution, persistence, or publication.
27. **DONE — P5.5:** deterministic provider-neutral backlink authority/link-gap supplied-fixture adapter, issue #231 / PR #232 / merge `605cf9133da8a26ddf9989cab005ec91161c033f`; dedicated backlink signal, canonical domain/URL/time/authority/anchor/freshness/gap semantics, no provider enrollment, credentials, source admission, Task #70 execution, persistence, or publication.
28. **DONE — P5.6:** deterministic competitor visibility/page/topic-gap operational pipeline, issue #234 / PR #235 / merge `e0cf3758be1dff24f443a0a42fa19d2a4110b82b`; descriptive supplied-artifact composition only, no live provider/runtime/persistence/publication activation.
29. **DONE — P5.7:** read-only/default-off category/market competitor intelligence UI, issue #237 / PR #238 / merge `64947e7662af1fadb389d9dd94f98a2e803d8911`; deterministic synthetic P5.6-shaped frontend fixture, DataGrid workbenches, responsive/accessibility/browser certification, no runtime API/provider/database/publication binding.
30. **DONE — P5.8:** deterministic source quality/cost/rate-limit telemetry, issue #240 / PR #241 / merge `56b2f8e9dd4e6cc4934c2ab55c549ea6284d59d3`; supplied telemetry + P5.1 metadata only, no live provider/runtime/persistence/publication activation.
31. **DONE — P6.1/P6.2/P6.3/P6.4/P6.5/P6.6/P6.7:** the complete deterministic opportunity/recommendation-engine foundation is complete through explicit lifecycle/history; P6.7 issue #261 / PR #262 / merge `d587a1cc7737c87e09b5bdb827b1cc80170c8a8b`.
32. **DONE — Phase P6:** unified opportunity classification, scoring, prioritization, explanation, actionability, preview/diff and lifecycle/history foundation.
33. **DONE — P7.1:** deterministic/default-off supplied-evidence AI crawler/bot accessibility audit, issue #264 / PR #265 / merge `74e5de6518359f9f92b2e73edd5d44f02eecffa2`; no live crawl/provider/runtime/persistence/publication activation.
34. **DONE — P7.2:** deterministic/default-off supplied-definition prompt/topic-set model, issue #267 / PR #268 / merge `ecee3e9796c04c25f3c800e73e621c2cef299666`; explicit acyclic topic hierarchy, exact prompt text, no generation/provider/persistence activation.
35. **DONE — P7.3:** deterministic/default-off provider-neutral supplied-observation answer/brand/citation normalization, issue #270 / PR #271 / merge `399a6b946b213b2e8aff9416ca5287896476fe48`; exact P7.2 lineage, explicit mention/citation evidence, no live provider/persistence/scoring activation.
36. **DONE — P7.4:** deterministic/default-off citation/domain/competitor comparison over exact P7.3 records, issue #273 / PR #274 / merge `3e34b7e151a0e5669b986e377dded16c53f86073`; explicit competitor groups, positive mention-evidence overlap, descriptive citation-domain co-occurrence, no winner/rank/scoring activation.
37. **DONE — P7.5:** deterministic/default-off evidence-bound AI visibility scoring/history over exact P7.4/P7.3 lineage, issue #276 / PR #277 / merge `5a378eb72471aa7697011c814a7703213f5ed8ed`; transparent weighted components, null-vs-zero, exact-scope history and no cross-provider normalization/runtime/persistence activation.
38. **DONE — P7.6:** deterministic/default-off exact-lineage P7→P6 AI/GEO opportunity integration, issue #279 / PR #280 / merge `2a375966f943f67c5dc606c9e9257585b3e4824f`; explicit request only, exact P7.5/P7.4/P7.3 evidence, no P6 scoring/prioritization/runtime/persistence/publication activation.
39. **DONE — P7.7:** deterministic/read-only AI Visibility production workspace, issue #282 / PR #283 / merge `c70118053ac8e86c284c9e5a151b6f26f52d05dc`; synthetic P7.1–P7.6-shaped workbench, DataGrid/browser/axe certification, no live provider/runtime/persistence/execution/publication activation.
40. **DONE — Phase P7:** AI/GEO accessibility, prompt modeling, supplied answer/citation evidence, competitor comparison, visibility scoring/history, P6 opportunity lineage and production read-only workspace.
41. **DONE — P8.1:** deterministic/read-only unified opportunity → proposal → approval governance workspace, issue #285 / PR #286 / merge `6dd42a2850713a4692039bb76900731129422061`; no approval grant, execution, persistence or publication.
42. **DONE — P8.2:** deterministic/read-only evidence/risk/preview/verification-availability/rollback-plan action cards, issue #288 / PR #289 / merge `964e940d82f93dece9fbaaf56eca21782318e357`; no mutation, execution, persistence or publication.
43. **P8.3 REVIEW COMPLETE / IMPLEMENTATION BLOCKED:** issue #291 selects product media alt text as the preferred future bounded class and defines its exact safety/verification/rollback contract; implementation requires separate explicit authorization for a new isolated `write_files` scope/credential architecture. Current executable classes remain product/collection SEO `title` and `meta_description` only.
44. **P8.4–P8.8 — BLOCKED/PLANNED:** do not proceed automatically from the P8.3 review; mutation-class implementation/verification/rollback/live-pilot work requires its own reviewed authorization boundary.
45. **DONE — P9.1:** deterministic/default-off read-work scheduler/queue architecture, issue #293 / PR #294 / merge `e348aed49b3d787d237096a2bde24b23930e3223`; no runtime scheduling, queue persistence, Task #70 execution or provider/crawl activity.
46. **DONE — P9.2:** deterministic/default-off first-party refresh materialization review, issue #296 / PR #297 / merge `6f7b1dec70d99e6797980e08b10f072c6869d18a`; exact Task #67/#68/P9.1 lineage, GSC runner-foundation recognition only, explicit GA4/catalog runner gaps, zero runtime scheduling/provider/persistence activation.
47. **DONE — P9.3:** deterministic/default-off scheduled full/incremental crawl-policy review, issue #299 / PR #300 / merge `023df71e35376a774c11494d8c17b03a65e7c7b6`; exact P2.1–P2.6 + P9.1 lineage, bounded periodic full reconciliation, exact P2.6 fallback preservation, incremental/no-work selection, zero live crawl/runtime/persistence/publication activation.
48. **DONE — P9.4:** deterministic/default-off bounded external-intelligence refresh review, issue #304 / PR #305 / merge `5031d9a4d10f68fbe7a82ccc3acb562e31506a9b`; exact Task #66/#67/#68 + P5.2–P5.5/P5.8 + P9.1 lineage, supplied-result/live-runtime separation, bounded telemetry review and zero live provider/runtime/persistence/publication activation.
49. **DONE — P9.5:** deterministic failure/retry/dead-letter/idempotency control-plane architecture; no live retry/queue/DLQ/provider/runtime activation.
50. **DONE — P9.6:** deterministic worker observability plus pause/drain/kill/resume control-plane architecture; no live worker activation.
51. **DONE — P9.7:** deterministic recommendation-generation review worker over exact P6/P9.6 lineage; no AI/provider/proposal/approval/execution authority.
52. **REVIEW COMPLETE / IMPLEMENTATION BLOCKED — P9.8:** autonomous mutation policy architecture only; separate implementation and later live activation remain explicitly gated.
53. **DONE — P10.1:** unified deterministic/read-only change timeline, issue #319 / PR #320 / merge `779b5a655dd04f60744d24ee373071a6a03dca23`; chronology/lineage only, no causal attribution or runtime activation.
54. **DONE — P10.2:** direct action-to-page/query/category attribution, issue #322 / PR #323 / merge `34eb263c48b2c01920cb23df1b854d7df95b3bea`; exact action-ID-only association, provenance retention, unavailable-state preservation, fail-closed direct identity conflicts and no causal/runtime activation.
55. **DONE — P10.3:** before/after windows and confounder flags, issue #325 / PR #326 / merge `7337cefde56bfecc11664f81fbba8adcc6130393`; exact retained-live anchoring, supplied windows, exact direct-scope membership and descriptive confounder evidence with no causal/runtime activation.
56. **DONE — P10.4:** supplied experiment/holdout framework, issue #328 / PR #329 / merge `50ef9fda7b9e0bdee2d48e1d2ba1400b8d9a5b7e`; exact treatment lineage, supplied holdouts/assignment provenance, exact shared-window observations and descriptive contamination/coverage flags with no live assignment/statistical/causal/runtime activation.
57. **DONE — P10.5:** expected-vs-actual outcome tracking, issue #331 / PR #332 / merge `d038fbb1b8cccc67366dec7eb79961e10e947507`; exact P10.4 lineage verification, supplied metric/expectation/actual provenance, canonical-decimal exact arithmetic and descriptive relations with no causal/statistical/runtime activation.
58. **DONE — P10.6:** recommendation calibration/learning signals, issue #334 / PR #335 / merge `255ec1058a01bf20f0db0e04f45d1c981b7c2ac6`; exact P10.5 integrity, exact treatment recommendation lineage, supplied calibration definitions and independent directional signals with no reward/scoring/model/ranking/policy/runtime activation.
59. **DONE — P10.7:** Impact workspace v2, issue #337 / PR #338 / merge `72cf75fb9248c750b485d212a8a0f9245d785809`; deterministic synthetic/read-only P10.1–P10.6 projection with exact lineage validation, expected-vs-actual and directional-calibration presentation, and no causal/reward/runtime authority.
60. **DONE — P11.1:** production performance budgets and offline profiling, issue #341 / PR #342 / merge `b43d10f5662862cb6467edd056b1e8adf96c2aa5`; hard raw/gzip build budgets plus synthetic-local profiling contracts with no production load/runtime activation.
61. **DONE — P11.2:** offline security review and bounded source hardening, issue #345 / PR #346 / merge `cdf1ca8d9c1138dc8dd9fed4d41c1d6e31f5b7cb`; trusted-proxy/auth-return/header/supply-chain hardening and network-free posture regression contracts with no live scan/provider/DB/runtime/deployment activation.
62. **DONE — P11.3:** offline observability contracts, correlation and job-health projection, issue #348 / PR #349 / merge `e2cd22ae0e8e072be04bb6d31369e27e9f8ee040`; deterministic structured logs/metrics/trace lineage/exact P9.1+P9.6 health/non-delivering alert candidates with no production telemetry/runtime activation.
63. **DONE — P11.4:** offline backup/recovery and disaster-runbook certification, issue #351 / PR #352 / merge `41329684f56f16e6da1645cd6c29339e038cf1c7`; explicit recovery inventory, supplied RPO/RTO, immutable synthetic manifests, exact migration/P3.6 lineage and ordered synthetic restore evidence with no production backup/restore/DB/storage/runtime activation.
64. **DONE — P11.5:** deterministic/local-synthetic WCAG 2.2 AA engineering certification under issue #355 / PR #356 / merge `11d4d0d363bac9e1d6da8d5f4ee21c49eb1c0ed0`; canonical GitHub Chromium 81/81 green.
65. **DONE — P11.6:** route-wide local/synthetic responsive/product-polish certification under issue #358 / PR #359 / merge `93ccd007c9fb152f60e88daefe6c727afed3fb71`; canonical GitHub Chromium 100/100 green with P11.5 preserved.
66. **NEXT SAFE BOUNDARY — P11.7:** deterministic/read-only reporting/export/shareable executive-view engineering over bounded supplied/read-only evidence; external delivery/publication remains separately gated.
67. **P11.8–P11.10 —** remaining scope/compliance/load hardening stays planned/reviewed as listed above.
68. **P12 —** final production completion certification and program closeout.

This sequence intentionally brings the full-site crawler and professional UX forward instead of waiting until all backend integrations are finished.

---

## 11. Roadmap status protocol

Every material task closeout must update this file in the same docs/closeout PR or an immediately following docs-only PR.

Required updates:

- move the relevant roadmap ID to `DONE` / `PARTIAL` / `BLOCKED` as appropriate;
- add the GitHub issue/PR/merge SHA when stable;
- update `CURRENT_STATE.md` exact next boundary;
- update `PROJECT_HANDOFF.md` if continuation context changed materially;
- add a memory note/index link for lessons that future agents must preserve;
- never rewrite history to hide failed attempts or safety incidents that materially affect continuation.

Do not hard-code mutable `main` SHAs throughout this file after every task. `CURRENT_STATE.md` owns the exact mutable checkpoint. Historical source SHAs should remain only where they are release/task facts.

---

## 12. Agent resume protocol

When entering the project in a new chat/tool/session:

1. Read `AGENTS.md`.
2. Read `CURRENT_STATE.md`.
3. Read this `MASTER_COMPLETION_ROADMAP.md`.
4. Read `ARCHITECTURE.md`.
5. Read `PROJECT_HANDOFF.md` and relevant memory/task closeout.
6. Independently resolve GitHub `main` SHA/tree and CI state.
7. Independently inspect Replit branch/HEAD/tree/ahead-behind/clean state before sync or publication.
8. Distinguish **published production application source** from later engineering/docs `main`.
9. Locate the first roadmap item marked `NEXT` or the active issue explicitly named in `CURRENT_STATE.md`.
10. Confirm that the requested user instruction actually authorizes the next operation under `AGENTS.md`.
11. Create a dedicated issue/branch from exact current main for engineering changes.
12. Complete tests/PR/exact-head CI/merge/postmerge CI/Replit sync/certification before advancing.
13. Update durable docs and this roadmap before considering the task closed.

If the user says only `continue`, continue only the current safe/default-off task. Do not infer live credentials, provider contact, DDL or mutation authorization.

---

## 13. Product completion scorecard

This scorecard is deliberately conservative and should be updated from evidence, not optimism.

| Domain | Current broad state | Completion condition |
|---|---|---|
| Core backend/security | strong foundation | production hardened + observable |
| Provider/read control plane | strong architecture, limited live activation | live first-party + external reads certified |
| Whole-site crawling | P2.1–P2.6 pure foundations complete; live full-site execution/persistence/scheduled incremental operation not yet activated | full_site + incremental + history certified in production |
| Durable evidence | architecture foundations | persisted/provenanced/queryable at scale |
| Search/competitor intelligence | architecture/pilot foundations | operational external + first-party synthesis |
| Opportunity engine | partial foundations | unified evidence-backed prioritization |
| Execution | strong guarded foundations | integrated verified action lifecycle + selected live classes |
| Automation | intentionally disabled | bounded scheduled reads + later certified policy execution |
| AI/GEO | placeholder/architecture stage | live visibility + citations + opportunity integration |
| UX/UI | functional but engineering-oriented | complete enterprise product IA/workflows |
| Measurement/learning | partial | action impact + experimentation + calibration loop |
| Enterprise quality | partial | accessibility/perf/obs/recovery/security certification |

Do not use a single percentage as the authoritative progress measure. Use the phase/work-item statuses above.

---

## 14. Final product identity

The intended finished product is:

> **SEO ENGINE — Autonomous Search Optimization with Verifiable Control**

Operationally:

`Collect → Prove → Prioritize → Plan → Authorize → Execute Safely → Verify → Attribute Impact → Learn`

The system is complete when that loop is real, observable, professional to operate, safe under failure, and repeatable across the approved site inventory—not when the backend merely contains the component parts.
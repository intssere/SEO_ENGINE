# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree and CI before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the durable long-term completion plan, and GitHub `main` remains canonical.

## Active engineering checkpoint — P8.8 W02 complete / W03 specification-review active / implementation blocked

P8.8 W02 is certified complete under issue #412 / PR #413.

Final W02 certification:
- final exact tested PR head: `a10f18e225b7266dad9fe0d784c5d6c729c0de13`;
- exact-head CI #724 / run `35832630157`: success;
- merge/tree: `d42a0b11c730795d8f279b02f770c8925638be94` / `95c7e1309e43e94142ef302f305844f5c748d272`;
- post-merge main CI #725 / run `35834394743`: success;
- Replit Git-only reconciliation: exact merge/tree, `0/0`, clean, zero tracked/untracked changes, zero locks/writers, no republish/runtime/provider/database/config/migration/W03 implementation/scheduler/worker/policy activation.

W03 specification/review is tracked by issue #414.

W03 defines a future pure, provenance-distinct policy authorization artifact that must:
- canonically rebuild and verify exact W01 admission;
- canonically rebuild and verify exact W02 materialization;
- fail closed unless W01/W02 shared recommendation/proposal/target/before/after identities agree;
- identify provenance exactly as `policy_authorization`;
- carry no human approval ID/decision/actor and create no approvals row;
- remain structurally incompatible with the human Task #51 `controlled_execution_foundation_v1` envelope and Task #54 human confirmation namespace;
- derive a deterministic policy action identity without claiming a persisted DB action row;
- bind an opaque caller-supplied reservation descriptor without creating/persisting it; W04 remains the later durable-reservation authority;
- use caller-supplied canonical issued time and a maximum 15-minute TTL bounded by W01 evaluation expiry and policy-grant expiry;
- bind exact policy/evaluation/materialization/proposal/target/before/after/evidence/quality/risk/current-state/control/reservation fingerprints;
- set provider write/dispatch/public-site/automatic-transition authority to false.

The W03 artifact may authorize progression only to a later policy-aware preflight stage. It must not itself authorize provider dispatch or live mutation.

W03 is **specification/review only** at this checkpoint. Generic continuation does not authorize W03 implementation, policy authorization creation, approvals/action/reservation persistence, DB/schema work, provider/network access, Task #51/#53/#54 execution, policy activation, scheduler/worker/autonomous execution, credential/scope/config changes, deployment, publication or W04–W10.

**Next boundary after W03 specification certification:** explicit authorization for pure W03 implementation only.

## Active engineering checkpoint — P12.2 live-adapter engineering certified / live proof blocked

Issue #387 / PR #388 is complete.

Certified engineering:
- exact tested implementation head: `f7210f7c7d7b7ff3e079403ec107acefbf4f9cc0`;
- tree: `317675fd81f3a83a0336be56c4e4c1f816ff82d9`;
- exact-head PR CI #686 / run `35713158875`: success;
- merge: `cfdb21f3853f6a6c604686d750016c08c7f43492`;
- post-merge main CI #687 / run `35713968607`: success;
- Replit Git-only sync: exact merge/tree, origin/main exact, `0/0`, clean, zero locks/writers.

The merged engineering layer provides:
- exact Diamond Shelf production-capable but default-off sitemap, robots, page and pacing-clock adapters for site `eb1da9ee-539c-4200-8f04-f64ccaea7768` / `https://diamondshelf.us`;
- SSRF/DNS-rebinding protection using fresh public-address resolution, address pinning, TLS/SNI preservation, ambient-proxy exclusion and manual redirect revalidation;
- migration source `0004_first_party_crawl_execution_state.sql` with three dedicated crawl execution-state tables;
- lazy PostgreSQL persistence with exact site/origin/schema binding, replay/idempotency, advisory-lock concurrency controls and checkpoint-revision conflict protection;
- manual composition requiring exact confirmation `AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768` plus all four independent network/execution/persistence gates;
- inspection-only CLI; no HTTP route, startup hook, scheduler or worker binding;
- migration/persistence integration tests isolated to `P12_2_EPHEMERAL_DATABASE_URL` and forbidden from falling back to generic `DATABASE_URL`.

**P12.2 live proof is still blocked.** Merge did not authorize or perform live crawl execution, Production schema migration, live persistence, deployment, publication, scheduler/worker activation, provider/public-site mutation or credential changes.

Schema reality must remain explicit:
- Production remains at the certified 34-table P3.6 schema;
- Replit Development is at 37 tables because an early local issue #387 migration test incorrectly inherited generic `DATABASE_URL` before the dedicated isolation safeguard was added;
- the three new Development crawl-state tables were empty when detected;
- no compensating DDL/rollback has been attempted;
- migration 0004 remains unapplied to Production;
- Production schema application, deployment/runtime activation and the live proof each require separate explicit authorization.

## Published production

The currently published and post-publication-certified application release is the **current-main production publication** authorized after P12.2 engineering closeout.

Published application source:
- SHA: `78f8e69d07aa4e853ab0c815e7ba24d284d93e97`
- tree: `271d82d2c3e3a1bef5eeca567e96f924189166f7`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success
- current public-write gate posture: closed (`PUBLIC_SITE_WRITES_ENABLED=false`)
- the P8.7 gate-close republish did not re-attest a specific emitted asset hash

Post-publication certification passed:
- `GET /api/healthz` = 200;
- `GET /api/auth/status` = 200;
- `HEAD /` = 200;
- unauthenticated protected-capability probe = 401 `authentication_required`;
- P12.1 operational-only primary navigation is live;
- at the time of post-publication certification, Development and Production both matched the exact 34-table P3.6 contract; current schema state later diverged only because of the issue #387 Development-only migration-test incident documented above;
- P3.6 remains 3 tables / 15 indexes / 26 constraints / 0 rows;
- public/provider writes, Task #53/#54 dispatch, competitor execution/persistence/dry-run, AI proposal generation, signal collection, GSC runtime, scheduler, worker/autonomous mutation and P12.2 crawl runtime execution/persistence remain disabled;
- no unexpected provider/crawl/public-site/database activity was observed;
- Replit's zero-file publication marker `0a6046e9cbc8b8b9a984d0cff77ce359400b384b` was safely reconciled Git-only back to the authorized source.

The publication required two bounded prepublication remediations that are now complete:
- a Git-ignored local Corepack shim corrected Replit's pnpm 10.26.1 → repository-pinned pnpm 10.34.5 workflow bootstrap mismatch without any tracked source/config/dependency change;
- Development alone received the exact canonical P3.6 migration blob `ea13df6e9e0e0307e349f1502a4548b9e4de11ed`, moving Development from 31 to 34 tables; Production received no write, and the managed Development→Production schema diff then returned zero statements and zero destructive changes.

This publication makes the current P4/P5/P6/P7/P8/P9/P10/P11/P12.1/P12.2-engineering application code available in production, but it does **not** activate their live provider/crawl/mutation capabilities. P12.2–P12.8 live-proof gates, the P11.9 blockers, and final P12.10 program completion remain separately gated.

Subsequent documentation-only closeout commits after this source SHA are not automatically part of the published application release and do not imply republishing. P3.6 changed only the separately authorized Production schema; P4.1–P4.8/P4.10 change engineering-source product navigation/design-system/workbench/evidence-inspection/Command-Center/audit-explorer/responsive/accessibility/browser-regression code only; P5.1–P5.8 are external-intelligence research/adapter/operational-report/frontend/telemetry engineering only; P6.1 is unified opportunity classification/evidence engineering only; P6.2 is deterministic transparent opportunity-scoring engineering only; P6.3 is deterministic collection conflict/dedupe/suppression/prioritization engineering only; P6.4 is deterministic explanation/evidence projection engineering only; P6.5 is deterministic actionability-classification engineering only; P6.6 is deterministic current-vs-proposed preview/diff engineering only; P6.7 is deterministic opportunity lifecycle/history engineering only; P7.1 is deterministic supplied-evidence AI crawler/bot accessibility-audit engineering only; P7.2 is deterministic supplied-definition prompt/topic-set modeling only; P7.3 is deterministic provider-neutral supplied-observation answer/brand/citation normalization engineering only; P7.4 is deterministic supplied-evidence citation/domain/competitor comparison engineering only; P7.5 is deterministic evidence-bound AI visibility scoring/history engineering only; P7.6 is deterministic P7→P6 AI/GEO opportunity-lineage integration engineering only; P7.7 is deterministic synthetic/read-only AI Visibility frontend workspace engineering only; P8.1 is deterministic/read-only governed opportunity → proposal → approval workspace engineering only; P8.2 is deterministic/read-only evidence/risk/preview/verification-availability/rollback-plan action-card engineering only; P8.3 is review/contract documentation only with implementation blocked; P9.1 is deterministic/default-off read-work scheduler/queue architecture engineering only; P9.2 is deterministic/default-off first-party refresh materialization-review engineering only; P9.3 is deterministic/default-off scheduled full/incremental crawl-policy review engineering only; P9.4 is deterministic/default-off bounded external-intelligence refresh-review engineering only; P9.5 is deterministic/default-off failure/retry/dead-letter/idempotency control-plane engineering only; P9.6 is deterministic/default-off worker observability and pause/drain/kill/resume control-plane engineering only; P9.7 is deterministic/default-off recommendation-generation review engineering only; P9.8 is autonomous-mutation policy architecture review only with implementation blocked. P10.1 is deterministic/read-only unified change-timeline engineering only: caller-supplied chronology/lineage normalization, exact P6.7 transition projection, fail-closed source replay conflicts and non-causal measurement markers; it adds no live loader, attribution inference, provider/runtime call, persistence, mutation or publication. P10.2 is deterministic/read-only direct action-association engineering only: exact action-ID joins to explicitly supplied page/query/category facts with fail-closed lineage/page conflicts, unavailable-state preservation and non-causal semantics; it adds no live loader, provider/runtime call, persistence, mutation or publication. P10.3 is deterministic/read-only supplied-window/confounder engineering only: exact retained-live anchoring, caller-supplied before/after bounds, exact P10.2-scoped observation membership and descriptive direct-evidence confounder flags; it performs no causal attribution, impact calculation, live loading, provider/runtime call, persistence, mutation or publication. P10.4 is deterministic/read-only supplied experiment/holdout engineering only: exact P10.1→P10.3 integrity, one bounded treatment action, caller-supplied holdouts/assignment provenance, exact shared-window observation membership and descriptive structural contamination/coverage flags; it performs no treatment-effect/statistical/causal calculation, live assignment, provider/runtime call, persistence, mutation or publication. P10.5 is deterministic/read-only supplied expected-vs-actual outcome engineering only: exact P10.4 rebuild/integrity, explicit metric/target/scope provenance, canonical decimal values, exact BigInt signed differences and descriptive above/equal/below relations with unavailable-state preservation; it performs no percentage/treatment-effect/statistical/causal calculation, live loading, provider/runtime call, persistence, mutation or publication. P10.6 is deterministic/read-only recommendation-calibration engineering only: exact P10.5 rebuild/integrity, exact same-action recommendation lineage, caller-supplied calibration definitions and per-actual directional signals with explicit non-reward/non-quality semantics; it performs no scoring/ranking/model/policy update, causal calculation, live loading, provider/runtime call, persistence, mutation or publication. P10.7 is deterministic synthetic/read-only Impact-workspace engineering only: exact six-layer P10.1–P10.6 projection validation, independent expected-vs-actual and directional-calibration presentation, explicit non-causal/non-reward guardrails and no live API/provider/DB/runtime/mutation/publication authority. P11.1 is deterministic/offline performance-hardening engineering only: explicit frontend raw/gzip build budgets, a post-build emitted-asset gate, normalized synthetic-local browser profile contracts and supplied-profile regression semantics; it adds no production load, live provider/DB access, runtime/deployment mutation or publication authority. P11.2 is deterministic/offline security-review and bounded source-hardening engineering only: auth return-target normalization, trusted-proxy request identity, browser/API header hardening, network-free security-posture regression contracts and immutable GitHub Action pinning while preserving the existing SSRF-hardened competitor transport; it adds no live scan, exploit attempt, credential/provider/Production DB/runtime/deployment mutation or publication authority. P11.3 is deterministic/offline observability-foundation engineering only: bounded structured event/log projection, descriptive metric rollups, exact trace/correlation integrity, exact P9.1/P9.6 rebuild-bound job health and caller-threshold alert candidates with no telemetry exporter/sink, production ingestion, alert delivery, scheduler/worker activation, Production DB/provider/runtime/deployment mutation or publication authority. P11.4 is deterministic/offline backup/recovery planning and synthetic disaster-runbook certification only: explicit recovery inventory, caller-supplied RPO/RTO objectives, immutable synthetic backup manifests, exact migration/P3.6 schema-lineage checks, ordered synthetic restore evidence and disaster-scenario dependency classification with no production backup discovery/read/export, restore/PITR/snapshot/storage operation, Production DB/storage mutation, secret/provider/runtime/failover/cutover/deployment or publication authority. P11.5 is deterministic/local-synthetic accessibility certification only: all routed engineering surfaces are covered by WCAG 2.2 A/AA axe gates at every returned impact level plus 320 CSS-pixel reflow, target-size/spacing, keyboard/focus and reduced-motion checks; it does not certify the separately published production release or every browser/OS/assistive-technology combination. P11.6 is deterministic/local-synthetic responsive/product-polish certification only: every routed surface plus not-found is exercised at 1440, 1024, 768 and 390 CSS-pixel viewport classes for document overflow, shell/content geometry, unintended visible-copy clipping, interactive overlap, internal table scrolling and compact-shell/touch ergonomics while retaining P11.5 unchanged; it does not certify the separately published production release or every physical device/browser combination. P11.7 is deterministic/local-synthetic reporting/export/share-state engineering only: the `/reports` workspace projects supplied synthetic/read-only evidence into deterministic executive summaries, local CSV/JSON/print output and bounded URL view-state, with no report API, persistence, production-data export, external delivery, public sharing, provider/runtime/DB mutation, deployment or publication authority. P11.8 is review-only multi-site/project architecture: the existing `organizations → sites` hierarchy is selected as the v1 tenant/workspace model, no duplicate `projects` entity is justified, and true multi-site runtime activation remains blocked until membership, explicit site request scope, OAuth/connection isolation, frontend context and cross-site tests exist. P11.9 is an engineering/provider-policy retention/privacy/compliance review only: it inventories personal/business/provider/evidence/log/backup data, records dated Google/Shopify/DataForSEO/SerpApi/OpenAI policy constraints and establishes ten fail-closed pre-production blockers; it is not legal advice or a legal-compliance certification and performs no deletion, revocation, provider-account mutation or runtime activation. P11.10 certifies bounded local/synthetic scale at 25,000 URLs, 100,000 query signals, 25,000 materialized opportunity candidates and 100 read schedules using real pure-function paths, with no production/provider/DB load or runtime activation. P4.9 remains optional and unselected. Git synchronization, engineering merges and database DDL do not change the separately attested published application source.

## Current engineering state — P12.2 crawl bridge complete / live proof still blocked

Roadmap **P12.2 — full-site crawl complete and repeatable** now has its required **default-off engineering execution/persistence bridge** under issue #382 / implementation PR #383.

This closes the missing runtime-adapter gap between the existing P2.1–P2.6 deterministic crawl contracts and a future separately authorized Diamond Shelf production crawl. It does **not** complete P12.2 production certification.

Implementation outcome:
- Diamond Shelf-only canonical origin binding: `https://diamondshelf.us`;
- injected sitemap acquisition, robots evaluation, page transport, clock and persistence contracts;
- no bundled HTTP/fetch/PostgreSQL/Drizzle/timer/scheduler implementation;
- explicit `networkReady`, `liveExecutionAuthorized`, `persistenceReady` and `persistenceAuthorized` gates, all default-off;
- exact reuse of P2.1 crawl planning, P2.2 sitemap inventory/canonicalization, P2.3 batching/rate/timeout/redirect/retry/checkpoint/resume, P2.4 whole-site certification, P2.5 repeat/history comparison and P2.6 incremental-recrawl integrity;
- robots evaluation before each page GET;
- explicit non-following redirect transport with P2 URL-policy revalidation;
- checkpoint persistence adapter and completed-run/incremental receipt contracts with no raw page body, page content or raw sitemap XML persistence;
- stale/mismatched checkpoint, identity, origin, redirect and incremental-lineage inputs fail closed;
- deterministic in-memory regression coverage plus a live-proof runbook in `docs/p12-2-crawl-execution-persistence-bridge.md`.

Certification:
- implementation base SHA/tree: `2b17be98c750dcba30eeedb657587bb49748867f` / `8af93afa0c3c7fc6bdbaab7adb55fe77e865e869`;
- final exact tested head/tree: `dbeadef4b18dabeac37e82535e791b8e7eb733c2` / `782f65af18516791421f20bcc9b198a7b8fc515a`;
- exact-head PR CI #674 / run `35652034114`: success;
- implementation merge/tree: `0981daad1da5737ac4a4ec04d97ad6cf6659057d` / `782f65af18516791421f20bcc9b198a7b8fc515a`;
- post-merge main CI #675 / run `35652518058`: success;
- canonical post-merge workspace packages: **1,264 tests / 0 failures**; DB bootstrap **7/7 PASS**; P3.6 migration checks **2/2 PASS**;
- API package: **1,072/1,072 PASS**;
- P11.10 synthetic scale: PASS at the established 25k URL / 100k query-signal / 25k candidate / 100 schedule envelope;
- canonical Chromium: **111/111 PASS**;
- typecheck: PASS;
- build/P11.1 budget: PASS;
- post-merge assets: JS 610,807 raw / 175,245 gzip; CSS 186,332 raw / 31,020 gzip;
- Replit is Git-only exact-synced to the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero tracked/untracked files, zero locks and zero active repository writers;
- Replit Git state was independently re-verified after the sync at the exact merge/tree; no separate Replit non-browser test run was performed, so GitHub CI remains canonical for full test/browser certification.

At the P12.2 engineering closeout, the bridge was **unpublished** and had performed no live website/sitemap/robots request, Production DB/storage read/write/DDL/DML, observation/evidence persistence activation, provider/public-site mutation, scheduler/worker activation, autonomous mutation, credential/secret change, destructive retention or Task #51/#53/#54 execution. The bridge code is now included in the certified current-main production release, but remains runtime-inert because all live network/execution/persistence/provider/write gates are still false; publication alone granted no crawl authority.

P12 criterion readiness after the P12.2 bridge:
- **P12.1 — DONE.**
- **P12.2 — ENGINEERING BRIDGE COMPLETE / LIVE PROOF BLOCKED:** still requires a fresh explicit authorization for the real Diamond Shelf full crawl, intentional interruption/resume evidence, repeat/reconciliation crawl, bounded incremental cycle, concrete Production persistence target and persisted/inspectable production evidence.
- **P12.3 — LIVE PROVIDER ACTIVATION BLOCKED:** requires real GSC plus required first-party analytics/catalog production proof.
- **P12.4 — LIVE PROVIDER ACTIVATION BLOCKED:** requires selected real external-intelligence provider certification.
- **P12.5 — ENGINEERING READY / REAL-EVIDENCE BLOCKED:** depends on persisted evidence from P12.2–P12.4.
- **P12.6 — PARTIAL FOUNDATION ONLY:** P8.4 verification adapters are certified; governed execution still requires P8.5/P8.6 plus later P8.7/P8.8 live/policy execution proof.
- **P12.7 — ENGINEERING READY / LIVE SCHEDULER PROOF BLOCKED.**
- **P12.8 — ENGINEERING READY / REAL-OUTCOME BLOCKED.**
- **P12.9 — LOCAL ENGINEERING SUBSTANTIALLY READY / PRODUCTION RC ACCEPTANCE BLOCKED.**
- **P12.10 — BLOCKED:** depends on P12.1–P12.9, applicable P11.9 blockers and explicit deployment/publication/runtime proof.

The ten P11.9 privacy/compliance blockers remain fail-closed prerequisites for affected live/commercial flows.

Detailed record:
- issue #382 — `P12.2 — default-off full-site crawl execution and persistence bridge`;
- PR #383 — `P12.2 — default-off crawl execution and persistence bridge`;
- `docs/p12-2-crawl-execution-persistence-bridge.md`;
- `.agents/memory/p12-2-crawl-bridge-closeout.md`.

**Next dependency boundary:** the engineering bridge exists, so P12.2 can advance only through a separately authorized bounded live proof. P12.3 and P12.4 remain separate provider-activation lanes. Generic `continue` does not authorize a live crawl/provider/OAuth request, Production DB/storage mutation/persistence, scheduler/worker activation, provider/public-site mutation, credential change, deployment or publication.

## Previous engineering state — P12.1 complete / live-proof lanes remain gated

Roadmap **P12.1 — no primary placeholder screens** is complete under issue #379 / implementation PR #380.

P12.1 certifies the **primary product-navigation boundary** only. It does not convert engineering-only routes into live production features and does not activate any provider/runtime capability.

Implementation outcome:
- primary navigation now contains only deliberate operational surfaces:
  - Overview
  - Opportunities
  - Technical SEO
  - Governance
  - Actions
  - Approvals
  - Deployments
  - Performance
  - Connections
  - Settings
- the following engineering-only routes remain mounted/directly routable but are intentionally absent from primary navigation until production-bound:
  - `/rankings`
  - `/internal-links`
  - `/ai-visibility`
  - `/experiments`
  - `/search-intelligence`
  - `/learning`
  - `/impact`
  - `/reports`
- no primary navigation item carries `status: "planned"`;
- informational routes retain explicit unavailable/coming-soon evidence-first states rather than fabricated metrics;
- synthetic/read-only workspaces retain explicit disclosure and direct engineering access;
- all mounted engineering routes remain inside the inherited P11.5 accessibility and P11.6 responsive/product-polish route suites;
- a dedicated P12.1 production-surface contract prevents fixture/placeholder routes from silently re-entering primary navigation;
- the critical-path Chromium suite proves primary-nav exclusion while direct `/search-intelligence` access remains visibly `SYNTHETIC READ-ONLY` and network-closed.

Certification:
- implementation base SHA/tree: `6f4dd2a11f0f347e2ac6ba9823d90f299fa00dd6` / `af57d67916ff62354e49f643428aca5833a217c5`;
- final exact tested implementation head/tree: `be143b4084823786ecc42440dbcd722af2fac39b` / `a47387c152b25b63a4256b33f6390fe24d13f20b`;
- initial CI #666 correctly exposed two historical tests that still required Impact/Reports to be primary-nav items; the P12.1 contracts themselves passed;
- those historical contracts were narrowed to preserve route/certification guarantees while accepting the new engineering-only navigation boundary;
- exact-head PR CI #668 / run `35645253660`: success;
- implementation merge/tree: `4bc2bfcead3f7eaece1e0143e4546110580984f1` / `a47387c152b25b63a4256b33f6390fe24d13f20b`;
- post-merge main CI #669 / run `35645749969`: success;
- canonical post-merge workspace packages: **1,264 tests / 0 failures**;
- P11.10 synthetic load scale: PASS at the established 25k URL / 100k query-signal / 25k candidate / 100 schedule envelope;
- canonical Chromium: **111/111 PASS**;
- typecheck: PASS;
- build/P11.1 budget: PASS;
- post-merge assets: JS 610,807 raw / 175,245 gzip; CSS 186,332 raw / 31,020 gzip;
- Replit is Git-only exact-synced to the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero tracked/untracked files, zero locks and zero active repository writers;
- a follow-up Replit non-browser validation request was not queued because the Replit Agent channel became busy; no separate Replit test-run claim is made. GitHub remains canonical for full CI/browser certification.

P12.1 is **unpublished**. It performed no provider/OAuth activity, production crawl, Production DB/storage mutation, observation/evidence persistence activation, provider/public-site write, scheduler/worker activation, autonomous mutation, credential/secret change, destructive retention, Task #51/#53/#54 execution, deployment or publication.

P12 criterion readiness after P12.1:
- **P12.1 — DONE:** primary navigation contains no planned/placeholder/fixture-only product surfaces; engineering-only routes remain explicitly non-primary and honestly disclosed.
- **P12.2 — LIVE PROOF BLOCKED:** requires an explicitly authorized production full-site crawl, repeat/reconciliation crawl and incremental cycle.
- **P12.3 — LIVE PROVIDER ACTIVATION BLOCKED:** requires real GSC plus required first-party analytics/catalog production proof.
- **P12.4 — LIVE PROVIDER ACTIVATION BLOCKED:** requires selected real external-intelligence provider certification.
- **P12.5 — ENGINEERING READY / REAL-EVIDENCE BLOCKED:** depends on persisted evidence from P12.2–P12.4.
- **P12.6 — PARTIAL FOUNDATION ONLY:** governed execution still requires the remaining P8.4–P8.8/integrated persistent action-verification-audit-rollback proof.
- **P12.7 — ENGINEERING READY / LIVE SCHEDULER PROOF BLOCKED.**
- **P12.8 — ENGINEERING READY / REAL-OUTCOME BLOCKED.**
- **P12.9 — LOCAL ENGINEERING SUBSTANTIALLY READY / PRODUCTION RC ACCEPTANCE BLOCKED.**
- **P12.10 — BLOCKED:** depends on P12.1–P12.9, applicable P11.9 blockers and explicit deployment/publication/runtime proof.

The ten P11.9 privacy/compliance blockers remain fail-closed prerequisites for affected live/commercial flows.

Detailed record:
- issue #379 — `P12.1 — primary-surface placeholder audit and production-state remediation`;
- PR #380 — `P12.1 — production primary-surface remediation`;
- `docs/p12-1-primary-surface-production-state.md`;
- `.agents/memory/p12-1-primary-surface-closeout.md`.

**Next dependency boundary:** P12.2–P12.4 are live-proof/provider-activation lanes and remain separately authorized. Generic `continue` may perform only read-only preflight/runbook/dependency verification for those lanes; it must not execute a production crawl, provider/OAuth flow, provider request, Production DB/storage mutation/persistence, scheduler/worker, provider/public-site mutation, credential change, deployment or publication without a fresh explicit authorization.

## Previous engineering state — P12 entry review complete / P12.1 next

P12 final production completion certification has formally started under issue #375 / review PR #376.

The P12 entry review does **not** mark any P12 criterion complete. It reconciles the ten criteria against current engineering evidence and separates safe local engineering from live-production proof that requires separate authorization.

Certified P12 entry review:
- review base SHA/tree: `22cb4855075fd9d4cb3924c5a45f81ebefa758aa` / `128a04d639b82630ecd38367e666e0f8b8fe3fa6`;
- exact reviewed head/tree: `b694af1343e4bf281cc804b38d7a4114a5c5a896` / `de48471a111f4bdebd01395d895473984b611b63`;
- exact-head PR CI #662 / run `35634208467`: success across PostgreSQL/bootstrap/schema checks, all workspace tests, P11.10 synthetic scale, canonical Chromium, typecheck and build;
- review merge/tree: `a586894e6fab859befda7d5e011a80a367d4752f` / `de48471a111f4bdebd01395d895473984b611b63`;
- post-merge main CI #663 / run `35634679592`: success across the same complete gate;
- Replit Git-only exact-synced to `a586894e6fab859befda7d5e011a80a367d4752f` / `de48471a111f4bdebd01395d895473984b611b63`, origin/main exact, ahead/behind `0/0`, clean, zero tracked/untracked files, zero locks and zero active writers.

P12 criterion readiness:
- **P12.1 — HISTORICAL ENTRY STATUS (now superseded by P12.1 completion above):** the entry review found `Learning` planned and required the primary-surface audit/remediation.
- **P12.2 — LIVE PROOF BLOCKED:** P2 full-site engineering exists, but a real approved full-site crawl, repeat/reconciliation crawl and incremental cycle have not been certified.
- **P12.3 — LIVE PROVIDER ACTIVATION BLOCKED:** GSC/first-party architecture exists, but real GSC client/consent/property/read plus required analytics/catalog production integration are not certified.
- **P12.4 — LIVE PROVIDER ACTIVATION BLOCKED:** P5 adapters exist, but no selected external-intelligence source has production credential/request/terms/retention/quota/evidence certification.
- **P12.5 — ENGINEERING READY / REAL-EVIDENCE PROOF BLOCKED:** P6/P7 engine exists but needs persisted real evidence from P12.2–P12.4.
- **P12.6 — PARTIAL FOUNDATION ONLY:** governed execution foundations exist, but P8.4–P8.8 and a complete integrated persistent mutation/verification/rollback proof remain incomplete.
- **P12.7 — ENGINEERING READY / LIVE SCHEDULER PROOF BLOCKED:** P9 read-automation engineering exists but no bounded live production canary is certified.
- **P12.8 — ENGINEERING READY / REAL-OUTCOME PROOF BLOCKED:** P10 measurement/learning exists but needs real action/outcome evidence.
- **P12.9 — LOCAL ENGINEERING SUBSTANTIALLY READY / PRODUCTION RELEASE ACCEPTANCE NOT READY:** P11 engineering gates are strong, but the exact final release candidate still needs production runtime acceptance.
- **P12.10 — BLOCKED:** depends on P12.1–P12.9, applicable P11.9 blockers, exact deployment/runtime proof and final program issue #139 closeout.

The ten P11.9 privacy/compliance blockers remain fail-closed prerequisites for affected live/commercial flows and are not waived by P12 entry.

Detailed record:
- issue #375 — `P12 entry — final production completion readiness and dependency review`;
- PR #376 — `P12 entry — final production readiness review`;
- `docs/p12-entry-readiness-review.md`;
- `.agents/memory/p12-entry-readiness-closeout.md`.

**Historical boundary:** P12.1 was the next safe task at P12 entry and is now complete. The current dependency boundary is defined in the P12.1 section above.

## Previous engineering state — P11.10 complete / P11 enterprise hardening complete

Roadmap **P11.10 — load/scale testing for target URL/query volumes** is complete under issue #371 / implementation PR #372.

P11.10 adds a dedicated deterministic/local-synthetic scale gate over real existing pure functions. It does **not** generate production traffic and does not raise existing live/runtime safety ceilings.

Certified scale envelope:
- 25,000 canonical URLs/site;
- 100,000 synthetic page-query signals/site;
- at most 25,000 materialized opportunity candidates;
- crawl batch size 250 → exactly 100 deterministic batches;
- URL Explorer page size 500;
- 100 read schedules/projection;
- DataForSEO keyword request contract remains 50 keywords/request.

Real functions exercised:
- `buildSitemapInventory()`;
- `planFullSiteCrawlExecution()`;
- `queryUrlExplorer()`;
- `generateOpportunityCandidates()`;
- `buildReadQueueProjection()`.

Stabilization history:
- initial CI #654 exposed a real algorithmic/fixture scale defect rather than being masked by a relaxed budget;
- the initial opportunity fixture produced 50,000 valid candidates instead of the intended 25,000, and internal-link source selection scanned the full eligible crawl array for every qualifying query;
- the implementation now stops source selection after the required first three matching pages while preserving their prior ordering semantics;
- a regression test locks that first-three behavior;
- the stress fixture now produces exactly 25,000 bounded candidates while still scanning all 100,000 supplied query rows.

Final exact tested implementation:
- base SHA/tree: `4aad63e82d2ec41d80328b63c9a1a7b8737b3d9e` / `79a1420043c2aad16138e54679506f2320b708d8`;
- exact tested head/tree: `0b1cb915ac54cc56c26aeb841662f26d6de052f4` / `16a453f80ba5577416d3060696a56e027762952c`;
- exact-head PR CI #658 / run `35627543198`: success;
- implementation merge/tree: `fbf1abd2e1f04de649b9c54b29b74873098ccdb9` / `16a453f80ba5577416d3060696a56e027762952c`;
- post-merge main CI #659 / run `35627981015`: success.

Final canonical P11.10 scale profile from exact-head CI #658:
- certification fingerprint: `99c9910efd2474573f5ffd060bd24cea276aa337adfdf57140679e6ae6fdb20c`;
- combined five-scenario measured time: **739.787 ms**;
- sitemap inventory: 25,000 → 25,000, 234.623 ms, 54.49 MiB;
- crawl execution plan: 25,000 → 100 batches, 58.501 ms, 54.80 MiB;
- URL Explorer: 25,000 → 500-page output, 193.964 ms, 33.71 MiB;
- opportunity engine: 100,000 → 25,000 candidates, 238.407 ms, 96.42 MiB;
- read scheduler: 100 → 100, 14.292 ms, 95.40 MiB;
- every scenario passed with zero blockers.

The P11.10 budgets remain catastrophic-regression guards rather than SLAs:
- max individual scenario: 20,000 ms;
- max combined scenario time: 45,000 ms;
- max observed process heap-used per scenario: 768 MiB.

Canonical exact-head validation also passed:
- **1,250 workspace tests / 0 failures** across reported package groups;
- API package: **1,063/1,063**;
- canonical Chromium: **110/110**;
- full typecheck;
- full build;
- P11.1 asset budgets: JS 611,156 raw / 175,333 gzip; CSS 186,332 raw / 31,020 gzip.

Replit is Git-only exact-synced to the implementation merge/tree:
- branch `main`;
- HEAD/tree `fbf1abd2e1f04de649b9c54b29b74873098ccdb9` / `16a453f80ba5577416d3060696a56e027762952c`;
- origin/main exact;
- ahead/behind `0/0`;
- tracked/untracked zero;
- clean;
- zero Git locks;
- zero active repository writers/validation processes at reconciliation.

P11.10 is **unpublished** and synthetic/local only. It performed no production load generation, public-site crawling, provider/API load, provider request, Production DB benchmarking/read/write/DDL/DML, destructive retention execution, worker/scheduler activation, Task #51/#53/#54 execution, P9.8 implementation/activation, secret/config/runtime mutation, deployment or publication.

P11.10 does not certify production capacity, p50/p95/p99 latency, concurrency, database scale, provider quota sufficiency, worker throughput, hosting size, uptime or SLA.

**P11 enterprise hardening is now complete.** The ten P11.9 privacy/compliance blockers remain separately open prerequisites for the affected live/commercial flows and are not waived by scale certification.

Detailed record:
- issue #371 — `P11.10 — synthetic load/scale certification for target URL and query volumes`;
- PR #372 — `P11.10 — synthetic load/scale certification`;
- `docs/p11-10-load-scale.md`;
- `.agents/memory/p11-10-load-scale-closeout.md`.

The P12 entry/readiness review has since been completed. The historical P11.10 boundary remains synthetic load/scale certification only and does not authorize any live P12 proof.

## Previous engineering state — P11.9 complete

Roadmap **P11.9 — retention/privacy/provider terms and compliance review** is complete under issue #367 / review PR #368.

P11.9 is a review/documentation-only engineering and provider-policy assessment. It is **not legal advice and not a legal-compliance certification**.

The review inventories:
- account/authentication identity and pseudonymous security telemetry;
- encrypted provider credentials and connection metadata;
- site/business configuration;
- public crawl/page content including full-text snapshot risk;
- search/query/performance data;
- evidence/history/governance records;
- P3.6 observation/evidence persistence;
- AI prompt/response/citation data;
- logs/traces/metrics and job/error payloads;
- policy-source snapshots;
- backup/recovery implications.

Existing controls confirmed:
- OAuth access/refresh tokens are encrypted before persistence in `connections.secret_ref`;
- browser-facing connection listing does not expose secret refs/token envelopes;
- GSC architecture uses an exact read-only scope;
- Task #53 Shopify mutation requires the bounded `write_products` scope;
- session and CSRF token material is stored as hashes;
- auth IP/user-agent values are HMAC-hashed rather than stored raw;
- Pino redacts Authorization/Cookie/Set-Cookie headers;
- P11.3 structured observability rejects secret-like attribute keys;
- P3.3 defines retention-policy intent while keeping archive/prune/delete execution disabled.

P11.9 also identifies critical lifecycle gaps:
- expired/revoked auth sessions and auth-audit identity data have no certified cleanup schedule;
- no generic provider disconnect lifecycle both revokes the upstream grant and permanently removes local encrypted token material;
- no repository handlers/subscriptions were found for Shopify `customers/data_request`, `customers/redact` or `shop/redact`;
- P3.3 archive/prune/delete decisions are planning only, not an active production retention executor;
- P3.6 `seo_observation.site_id` is not foreign-keyed to `sites`, and the observation/evidence join uses `ON DELETE RESTRICT`, so future persisted evidence requires an explicit ordered erasure path;
- production backup deletion/expiry and restore-reapplies-deletion semantics are not certified;
- production telemetry retention is not defined;
- no durable controller/processor/subprocessor/DPA register is maintained;
- no final external privacy policy/contextual disclosure set is certified against activated live data flows.

Dated provider review on **2026-09-21** covers:
- Google API Services User Data Policy / OAuth 2.0 Policies / production OAuth verification expectations;
- Shopify API License and Terms of Use, protected-customer-data/privacy requirements and privacy-compliance webhooks;
- DataForSEO Terms, Privacy Policy and API/result-retention guidance;
- SerpApi legal/privacy/ZeroTrace behavior;
- OpenAI Services/API data-control and retention behavior.

The review records ten fail-closed pre-production blockers:
1. external privacy policy + contextual provider disclosures;
2. provider credential disconnect/revocation/permanent-local-delete lifecycle;
3. Shopify privacy deletion/data-request path where required by distribution mode;
4. retention/archive/prune/delete execution;
5. P3.6 explicit evidence erasure path;
6. auth-session/auth-audit retention;
7. backup deletion/recovery interaction;
8. dated provider/DPA/subprocessor register;
9. outgoing-data classification/retention review before live AI/external-provider activation;
10. jurisdiction-specific legal review before commercial launch.

Review/certification file:
- `docs/p11-9-retention-privacy-provider-compliance-review.md`

Certification:
- review base SHA/tree: `03cd3c7e15ac1bbc804f283c81f2c95a0c5e670d` / `d15b1fcd8e34f8755493b0c170f2b894f16669e0`;
- exact reviewed head/tree: `2668467168bb7a272c6fc2873e6c8b80ea7da2b4` / `8176334f53bb166cfbe36cc2ef3eca0d8d9c9ef0`;
- exact-head PR CI #650 / run `35621237576`: success;
- review merge/tree: `9ed6377963d052a4beccd9a43c102dcddbd798c7` / `8176334f53bb166cfbe36cc2ef3eca0d8d9c9ef0`;
- post-merge main CI #651 / run `35621913456`: success;
- canonical GitHub validation: **1,241 workspace tests / 0 failures**, **110/110 Chromium**, typecheck PASS, build/P11.1 budget PASS;
- P11.1 asset diagnostics: JS 611,156 raw / 175,333 gzip; CSS 186,332 raw / 31,020 gzip;
- Replit is Git-only exact-synced to the review merge/tree, origin/main exact, ahead/behind `0/0`, tracked/untracked zero, clean, zero Git locks and no active repository writer;
- a follow-up Replit non-browser validation request was not queued because the Replit Agent channel became busy immediately after synchronization; no additional Replit test-run claim is made. GitHub remains canonical for full certification.

P11.9 is **unpublished**. It performed no production archive/prune/delete, Production DB/storage read/write/DDL/DML, provider-token revocation, secret rotation/deletion, Shopify webhook deployment, OAuth/provider request, provider-account change, new external collection, retention worker/scheduler activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

Detailed record:
- issue #367 — `P11.9 — retention/privacy/provider terms and compliance review`
- PR #368 — `P11.9 — retention/privacy/provider terms and compliance review`
- `docs/p11-9-retention-privacy-provider-compliance-review.md`
- `.agents/memory/p11-9-retention-privacy-provider-compliance-closeout.md`

P11.10 has since been completed as the bounded local/synthetic scale-certification milestone. The ten P11.9 compliance blockers remain open prerequisites for the affected live/commercial flows and were not waived by P11.10.

## Previous engineering state — P11.8 complete

Roadmap **P11.8 — multi-site/project abstraction review before final scope lock** is complete under issue #364 / review PR #365.

P11.8 is a review-only architecture decision. It introduces no schema, API, runtime or frontend implementation.

Decision:
- **Organization = tenant/account boundary.**
- **Site = SEO workspace/project boundary.**
- do **not** add a separate first-class `projects` table/entity for v1;
- a future Project entity is justified only if a real commercial grouping is required between organization and site, rather than as a second name for Site.

Evidence:
- `lib/db/migrations/0001_core.sql` already defines first-class `organizations` and child `sites.organization_id`;
- most durable SEO entities are directly or transitively site-scoped;
- current runtime remains intentionally single-site: dashboard/runtime-readiness/OAuth helpers resolve `diamondshelf.us` directly;
- current API routes do not carry explicit site identity;
- current auth principal has subject/email/global role but no organization/site membership;
- current Connections/OAuth persistence is schema-site-scoped but runtime-hard-bound to Diamond Shelf;
- frontend shell has no organization/site selector or durable workspace route context.

True multi-site activation therefore remains blocked until a future separately governed implementation provides:
- server-authoritative organization/site membership;
- explicit fail-closed site request scope;
- site-scoped loaders with no implicit domain fallback;
- site-bound OAuth state, callback validation and connection persistence;
- execution/governance cross-site ownership checks;
- site-aware job/idempotency identity;
- visible frontend organization/site context and switching;
- deterministic cross-site isolation tests.

Review/certification file:
- `docs/p11-8-multisite-project-review.md`

Certification:
- review base SHA/tree: `b3cdad0f1b7c2853e3f80b1624072e2be65fbdae` / `2bb00656cac0685f43a07ffe2cbcbff280832fb0`;
- exact reviewed head/tree: `893ff51157cfbc9db05ff89cc569e3d1024078e5` / `009a4225e9825c763b01f64d5aa5ef14a09007a9`;
- exact-head PR CI #646 / run `35615799086`: success across schema/bootstrap checks, all workspace tests, **110/110 Chromium**, typecheck and build/P11.1 budget gate;
- review merge/tree: `7a47acfeede05b3e9a4ab7a1dd1f6ce670245bc7` / `009a4225e9825c763b01f64d5aa5ef14a09007a9`;
- post-merge main CI #647 / run `35616390237`: success across the same complete gate;
- Replit is Git-only exact-synced to the review merge/tree with origin/main exact, ahead/behind `0/0`, tracked/untracked zero, clean worktree, zero Git locks and no active repository writer;
- a separate Replit non-browser validation request was not queued because the Replit Agent channel became busy again; no additional Replit test-run claim is made. GitHub remains canonical for full CI/browser certification.

P11.8 is **unpublished**. It performed no new table/migration, Production DB/storage read/write/DDL/DML, tenant/site provisioning, auth/session change, API/runtime/frontend implementation, OAuth/provider request, worker/scheduler activation, public-site mutation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

P11.8 does **not** certify the current application as multi-tenant or multi-site at runtime. The schema is multi-site-capable, but end-to-end membership/request authorization/site switching is not implemented.

Detailed record:
- issue #364 — `P11.8 — multi-site/project abstraction review before v1 scope lock`
- PR #365 — `P11.8 — multi-site/project abstraction review`
- `docs/p11-8-multisite-project-review.md`
- `.agents/memory/p11-8-multisite-project-closeout.md`

P11.9 has since been completed as the review-only retention/privacy/provider-terms engineering assessment. The historical P11.8 boundary remains a tenant/workspace architecture decision and does not itself imply privacy/compliance readiness.

## Previous engineering state — P11.7 complete

Roadmap **P11.7 — reporting/export/shareable executive views** is complete under issue #361 / implementation PR #362.

P11.7 adds a deterministic/read-only Executive Reports engineering workspace over supplied synthetic evidence:
- new `/reports` route under Measure with executive and operations-detail view state;
- versioned `p11.7-executive-report-v1` pure report model with deterministic ordering, report fingerprinting and explicit synthetic/read-only capability metadata;
- deterministic CSV export with full quoting, embedded-quote escaping, CRLF records and spreadsheet-formula neutralization for supplied cells beginning with `=`, `+`, `-` or `@`;
- deterministic JSON export with report identity/fingerprint and safety metadata;
- deterministic print-text projection and print stylesheet;
- bounded URL share-state containing only `view` and selected-section configuration; evidence, metrics, fingerprints, tokens and credentials are never embedded in share state;
- malformed/unknown/overlong share-state fails closed to the safe default view;
- browser-local download uses `Blob` + `URL.createObjectURL` only; no report API, persistence layer, mail/Slack/webhook/cloud delivery or public-share publication exists;
- `/reports` is inside the inherited P11.5 accessibility and P11.6 responsive route inventories, preserving those certification gates;
- phone checkbox/radio touch handling now evaluates the associated 44px label as the effective product target where present, while the independent P11.5 24px accessibility target contract remains unchanged;
- local export feedback is exposed as an explicit live `status` region.

Implementation/certification files:
- `artifacts/seo-engine/src/lib/executive-report-model.ts`
- `artifacts/seo-engine/src/lib/executive-report-model.test.ts`
- `artifacts/seo-engine/src/pages/reports.tsx`
- `artifacts/seo-engine/src/pages/reports.css`
- `artifacts/seo-engine/e2e/reporting.spec.mjs`
- `artifacts/seo-engine/src/reporting-export-contract.test.mjs`
- route additions to P11.5/P11.6 certification inventories
- `docs/p11-7-reporting-export.md`

Certification:
- implementation base SHA/tree: `8730b8187a4892ee5bd184dde92a129f316ccffb` / `6061918e6eaa3ec5feddf586444bc0bbaf7fb951`;
- final exact tested implementation head/tree: `ddfe1d355331a08d28a9b6eb990b02741ca7fdf1` / `a3c4a9fc201acc297b7e60b3cdabb7c06693dd14`;
- CI #636 and #637 exposed only CSV line-ending test-expectation mistakes; the serializer itself remained correct;
- CI #638 reached Chromium and exposed three bounded integration issues: effective phone checkbox target measurement, an ambiguous KPI locator in the focused browser test, and missing explicit status semantics on export feedback;
- stabilization commits `921ed29f...`, `95b34396...`, `326a428e...` and `ddfe1d35...` corrected those semantics without weakening P11.5/P11.6;
- exact-head PR CI #642 / run `35611326688`: success with **110/110 Chromium tests**, **1,241 workspace tests / 0 failures**, typecheck PASS, build PASS and P11.1 budget PASS;
- exact-head P11.1 diagnostics: JS 611,156 raw / 175,333 gzip and CSS 186,332 raw / 31,020 gzip;
- implementation merge/tree: `83ea7efde2e78f5ccf59ee5bec7ecf7ba791c9d4` / `a3c4a9fc201acc297b7e60b3cdabb7c06693dd14`;
- post-merge main CI #643 / run `35611813846`: success across the same complete gate set including 110/110 Chromium.

Replit was subsequently Git-only reconciled through the P11.7 closeout and then the P11.8 review merge; the historical P11.7 implementation section is superseded by the current P11.8 checkpoint above.

P11.7 is **unpublished**. It performed no production report generation, production data export/exfiltration, external file/email/Slack/webhook/cloud delivery, public report publication, provider/public-site request/write, Production DB/storage read/write/DDL/DML, secret/config/runtime mutation, scheduler/worker activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

P11.7 certifies the exact engineering tree and deterministic synthetic fixtures only. It does not certify a future production report loader, real external delivery, public sharing, production reporting data, a reporting SLA, or the separately published Task #73 application.

Detailed record:
- issue #361 — `P11.7 — deterministic reporting, export and shareable executive views`
- PR #362 — `P11.7 — deterministic reporting, export and executive views`
- `docs/p11-7-reporting-export.md`
- `.agents/memory/p11-7-reporting-closeout.md`

P11.8 has since been completed as the review-only organization/site/project architecture decision. The historical P11.7 boundary remains reporting/export/share-state engineering only and does not itself imply multi-site runtime capability.

## Previous engineering state — P11.6 complete

Roadmap **P11.6 — responsive/product polish** is complete under issue #358 / implementation PR #359.

P11.6 adds a deterministic route-wide responsive/product-quality certification layer over the existing P4.7/P4.8/P4.10/P11.5 frontend foundation:
- every explicit application route plus the not-found fallback is exercised through one P11.6 route test containing four certified viewport steps: 1440×1000 wide desktop, 1024×900 compact desktop, 768×1024 tablet and 390×844 phone;
- document and body horizontal overflow must remain within the viewport at every certified size;
- shell, main workspace, content and mobile-navigation geometry must remain viewport-safe, with at least a 12px content gutter;
- the established <=820px compact-shell mode must hide the desktop sidebar and expose mobile navigation, while wider viewports retain the desktop shell;
- visible operational copy is checked for accidental hidden-overflow clipping, with semantic exclusion for standard visually-hidden accessibility labels and explicit/title-backed truncation;
- visible interactive controls are checked for unintended geometric overlap;
- wide DataGrid/table content must remain inside explicit internally scrollable regions rather than forcing document-level overflow;
- phone primary controls preserve the established 44px product touch target outside dense DataGrid headers;
- the opened mobile navigation panel is separately certified for viewport containment and 44px navigation-link targets;
- P11.5 remains intact: all-impact WCAG A/AA axe gates, 320px reflow, SC 2.5.8 target-size/spacing, focus and reduced-motion tests were not weakened;
- the only presentation remediation required by the route-wide audit was raising mobile shared `.linkButton` action links and compact Performance filter selects to 44px minimum height;
- no additional runtime API, provider, persistence, schema, dependency or execution capability was introduced.

Implementation/certification files:
- `artifacts/seo-engine/e2e/product-polish.spec.mjs`
- `artifacts/seo-engine/src/product-polish-certification-contract.test.mjs`
- bounded mobile presentation remediation in `artifacts/seo-engine/src/index.css`
- `artifacts/seo-engine/package.json` test-script inclusion only
- `docs/p11-6-product-polish.md`

Certification:
- implementation base SHA/tree: `75294652c5ddcf8f4b16873e78678b5c991dece6` / `d8fe375deff44bcc6fdaca8b37123d9ebe689f40`;
- final exact tested implementation head/tree: `d3695e9467f26c4a1501acc27715f1b2c85fc2f3` / `6e55d861c171a3e412ef93d37318677285f6cb9e`;
- initial audit CI #626 / run `35603994772` intentionally failed with 11 new P11.6 findings: ten route failures were traced to intentionally visually-hidden labels being misclassified as clipped copy, while the root phone view exposed real 36px shared action-link targets;
- stabilization refined clipping detection semantically and raised mobile `.linkButton` targets; CI #629 / run `35604590286` then passed 99/100 browser tests and isolated the remaining real issue: the Performance phone view's Reporting window/Country/Device selects were 28px high;
- compact Performance selects were raised to 44px and locked by the static contract;
- exact-head PR CI #631 / run `35605218166`: success with **100/100 Chromium tests**, **1,225 workspace tests / 0 failures**, typecheck PASS, build PASS and P11.1 budget PASS;
- exact-head GitHub P11.1 diagnostics: JS 589,405 raw / 170,018 gzip and CSS 180,099 raw / 29,963 gzip;
- implementation merge/tree: `93ccd007c9fb152f60e88daefe6c727afed3fb71` / `6e55d861c171a3e412ef93d37318677285f6cb9e`;
- post-merge main CI #632 / run `35605748067`: success across the same complete gate set including 100/100 Chromium;
- Replit is Git-only exact-synced to the implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences, zero Git lock files and no active repository-writing process;
- Replit non-browser validation using existing dependencies only: 1,225 workspace tests PASS / 0 failures, full typecheck PASS, full build/P11.1 budget PASS and `git diff --check` PASS;
- Replit build diagnostics: JS 589,405 raw / 169,557 gzip and CSS 180,099 raw / 29,948 gzip;
- GitHub Ubuntu/Chromium remains the canonical browser runner because the Replit environment previously lacks required Chromium shared libraries.

P11.6 is **unpublished**. It performed no production responsive/accessibility crawl or scan, provider/public-site request/write, Production DB/storage read/write/DDL/DML, secret/config/runtime mutation, scheduler/worker/retry activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

P11.6 certifies the exact engineering tree and deterministic synthetic fixture matrix only. It does not certify the separately published Task #73 application, every physical device/browser/OS combination, live provider content or future code/content that has not rerun the gate.

Detailed record:
- issue #358 — `P11.6 — route-wide responsive/product polish certification`
- PR #359 — `P11.6 — route-wide responsive/product polish certification`
- `docs/p11-6-product-polish.md`
- `.agents/memory/p11-6-product-polish-closeout.md`

P11.7 has since been completed as the deterministic/local-synthetic reporting/export/share-state milestone. The historical P11.6 boundary remains responsive/product-polish certification only and does not itself imply reporting delivery, production publication or runtime authority.

## Previous engineering state — P11.5 complete

Roadmap **P11.5 — accessibility WCAG 2.2 AA certification** is complete under issue #355 / implementation PR #356.

P11.5 upgrades the prior P4.8/P4.10 accessibility baseline into a deterministic local/synthetic engineering certification gate:
- every explicit routed application surface plus the not-found fallback is covered by the P11.5 browser suite;
- axe runs with WCAG 2.0/2.1/2.2 A/AA tags and **every returned WCAG violation blocks certification**, rather than filtering only serious/critical findings;
- each routed surface is checked at a 320 CSS-pixel viewport for page-level horizontal overflow while preserving independently scrollable two-dimensional DataGrid regions;
- visible interactive targets are checked against WCAG 2.2 SC 2.5.8 using the 24×24 CSS-pixel rule plus bounded inline-target/spacing exceptions;
- skip-link visibility, visible focus treatment, focus-not-obscured behavior, main-content focus transfer and route-change focus handoff are explicitly exercised;
- reduced-motion rendering is checked under the canonical Playwright `prefers-reduced-motion: reduce` profile;
- the synthetic proposal fixture was completed so Actions and Approvals render their real engineering surfaces under the network-closed browser harness rather than falling into the error boundary;
- bounded remediation corrected audited contrast/status-token defects while retaining the established P4.8 focus, landmark, form-label, live-region and forced-colors contracts;
- a source/static certification contract prevents route, WCAG-tag, all-impact, reflow, target-size, focus, reduced-motion and network-isolation coverage from silently weakening.

Implementation/certification files:
- `artifacts/seo-engine/e2e/accessibility-certification.spec.mjs`
- `artifacts/seo-engine/e2e/fixtures.mjs`
- `artifacts/seo-engine/src/accessibility-certification-contract.test.mjs`
- bounded accessibility CSS remediation in `artifacts/seo-engine/src/index.css` and `artifacts/seo-engine/src/pages/impact.css`
- `docs/p11-5-accessibility.md`

Certification:
- implementation base SHA/tree: `82e6ef687b1de176a02070baea10acc464748bf3` / `981f7889825ea40e334221a6c3b9df85781f6df8`;
- final exact tested implementation head/tree: `8698aea5b0cf9124156364a40d05c8d084a2b05c` / `7263db76f570cfe03722ec43437be6b3361a579a`;
- initial stricter browser audit CI #611 intentionally exposed target-size, Impact contrast and incomplete synthetic-proposal-fixture defects; subsequent bounded repairs were retained rather than hiding that stabilization history;
- exact-head PR CI #622 / run `35594233934`: success across schema/bootstrap checks, all workspace tests, the complete Chromium suite, typecheck and build/P11.1 budget gate;
- implementation merge/tree: `11d4d0d363bac9e1d6da8d5f4ee21c49eb1c0ed0` / `7263db76f570cfe03722ec43437be6b3361a579a`;
- post-merge main CI #623 / run `35594621574`: success across the same complete gate set;
- canonical GitHub Chromium result: **81/81 browser tests PASS**, including 57 P11.5 accessibility tests, 13 existing critical-path tests, 7 P11.1 performance-profile tests and 4 visual-regression tests;
- GitHub workspace test groups passed with 1,218 package tests / 0 failures; typecheck/build passed and P11.1 budgets passed at JS 589,405 raw / 170,018 gzip and CSS 180,021 raw / 29,945 gzip;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree and zero tracked/untracked differences;
- Replit non-browser validation using existing dependencies only passed 1,218 workspace tests / 0 failures, full typecheck, full build/P11.1 budget and `git diff --check`; its build diagnostics were JS 589,405 raw / 169,557 gzip and CSS 180,021 raw / 29,931 gzip;
- Replit discovered the same 81 Chromium tests but could not launch Chromium because required shared libraries are unavailable in that environment; no browser assertions ran there, so GitHub Ubuntu/Chromium remains the canonical browser runner as established by P4.10.

P11.5 is **unpublished**. It performed no production accessibility crawl/scan, provider/public-site activity, Production DB/storage read/write/DDL/DML, secret/config/runtime change, scheduler/worker/retry activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

P11.5 certifies the exact engineering tree under the deterministic local/synthetic browser conditions above. It is not a legal/universal conformance claim, does not certify the separately published Task #73 production application, and does not replace representative manual assistive-technology testing before a commercial accessibility statement.

Detailed record:
- issue #355 — `P11.5 — WCAG 2.2 AA accessibility certification`
- PR #356 — `P11.5 — WCAG 2.2 AA accessibility certification`
- `docs/p11-5-accessibility.md`
- `.agents/memory/p11-5-accessibility-closeout.md`

P11.6 has since been completed as the deterministic route-wide local/synthetic responsive/product-polish certification milestone. The historical P11.5 boundary remains accessibility engineering certification only and does not itself imply production publication or device-universal product certification.

## Previous engineering state — P11.4 complete

Roadmap **P11.4 — backup/recovery and disaster-runbook certification** is complete under issue #351 / implementation PR #352.

P11.4 adds a deterministic/offline recovery-planning and synthetic-certification foundation over caller-supplied fixtures/evidence:
- versioned `p11.4-backup-recovery-v1` inventory distinguishes PostgreSQL-backed core/auth/P3.6 observation-evidence state from Git-controlled migrations, external secrets, external provider/public-site state and non-authoritative runtime-ephemeral state;
- expected migration lineage is exactly `0001_core.sql` → `0002_auth.sql` → `0003_observation_evidence_schema.sql`, with P3.6 schema-contract integrity/fingerprint binding;
- caller-supplied RPO/RTO objectives are bounded and descriptive only; no hosting/provider guarantee is inferred;
- synthetic backup manifests bind immutable IDs/fingerprints, status, creation/coverage timestamps, covered domains, migration/schema lineage, optional object/byte counts, SHA-256 checksum metadata, optional supplied encryption evidence and verification state;
- exact backup replay dedupes while conflicting reuse of one backup ID fails closed;
- incomplete/failed/unverified/stale/domain-incomplete/migration-mismatched/P3.6-schema-mismatched or incident-postdated backups cannot certify;
- ordered restore evidence covers incident declaration, write freeze, isolated target, base restore, schema/integrity verification, read-only smoke validation, external dependency reconciliation, cutover review and post-recovery verification; stages cannot be completed past a blocked/not-run prerequisite;
- synthetic measured RPO/RTO are derived only from supplied timestamps; misses block certification;
- credential/secret loss and provider outage are explicitly not database-backup-recoverable, and public-site/provider write regression retains external rollback/reconciliation requirements;
- `certified_synthetic` certifies only the supplied exercise/runbook evidence, not production backup existence or production restore readiness;
- no backup utility, storage SDK, schema migration, API route, runtime configuration, worker or automatic recovery path was added.

Implementation:
- `artifacts/api-server/src/lib/backup-recovery-foundation.ts`
- `artifacts/api-server/src/lib/backup-recovery-foundation.test.ts`
- `artifacts/api-server/src/lib/backup-recovery-foundation-contract.test.ts`
- `docs/p11-4-backup-recovery.md`

Certification:
- implementation base SHA/tree: `1ad2efa3b194183e245724ac69f0863a4504df21` / `4a0ca940dfa811d63e91b5f0f12166b4fcc63377`;
- final exact tested implementation head/tree: `7905b2db758e2af5e0187c238d121abb26927bcb` / `b50bdc0b8ad256fc7f022c9edbf933d660cb22ae`;
- branch stabilization transparently included documentation-contract-only repairs on intermediate commits `35729b0a...`, `d6db504c...` and `7d17b2ab...`; these exposed no recovery-logic or production-system defect, and final detached validation passed;
- detached Replit final exact-head validation: focused P11.4 tests 16/16 PASS, full API tests 1,054/1,054 PASS, API typecheck PASS and `git diff --check` PASS, followed by restoration to clean canonical main;
- exact-head PR CI #607 / run `35586999609`: success across schema/bootstrap checks, all workspace tests, Chromium browser suite, typecheck and build/P11.1 budget gate;
- implementation merge/tree: `41329684f56f16e6da1645cd6c29339e038cf1c7` / `b50bdc0b8ad256fc7f022c9edbf933d660cb22ae`;
- post-merge main CI #608 / run `35587257845`: success across the same complete gate set;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree and zero tracked/untracked differences;
- Replit validation using existing dependencies only: recursive workspace tests PASS with 1,210 reported passes / 0 failures, full typecheck PASS, full build PASS, P11.1 performance-budget gate PASS and `git diff --check` PASS;
- Replit P11.1 build diagnostics remained JS `589,405` raw / `169,557` gzip and CSS `179,974` raw / `29,929` gzip; only the pre-existing sourcemap-location notices and Vite >500 kB advisory remained non-fatal.

P11.4 is **unpublished**. It performed no production backup discovery/list/read/export, backup creation, production restore/PITR/snapshot/storage API operation, Production DB/storage read/write/DDL/DML, secret retrieval/rotation, provider/public-site request/write, runtime mutation, failover/cutover, scheduler/worker/retry activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

P11.4 does **not** claim that production backups exist, that retention/PITR/snapshots are configured, that current production data has been restored, that external secrets/provider state are backup-recoverable, or that production RPO/RTO equals a synthetic exercise.

Detailed record:
- issue #351 — `P11.4 — offline backup/recovery contracts and disaster-runbook certification`
- PR #352 — `P11.4 — offline backup/recovery contracts and disaster-runbook certification`
- `docs/p11-4-backup-recovery.md`
- `.agents/memory/p11-4-backup-recovery-closeout.md`

P11.5 has since been completed as the deterministic local/synthetic engineering accessibility-certification milestone. The historical P11.4 boundary remains recovery-planning/synthetic-runbook engineering only and does not itself imply production recovery, accessibility, deployment or publication authority.

## Previous engineering state — P11.3 complete

Roadmap **P11.3 — observability: metrics/logs/traces/alerts/job health** is complete under issue #348 / implementation PR #349.

P11.3 adds a deterministic/offline observability foundation over caller-supplied synthetic/local evidence:
- versioned `p11.3-observability-v1` normalization for bounded event identity, component/operation, event kind, explicit outcome/severity, canonical UTC time, optional bounded duration, correlation ID, exact trace/span lineage and bounded scalar attributes;
- likely credential/secret-bearing attribute keys fail closed; exact replay of an identical event ID dedupes while conflicting replay fails closed;
- each retained event projects to one deterministic structured-log record with exact correlation/trace/span lineage; no log sink/exporter is configured;
- descriptive metric rollups preserve event/outcome counts, arithmetic failure rate and supplied-duration count/min/max/mean/nearest-rank p50/p95 without creating an SLO/SLA, production-user-impact or deployment verdict;
- trace/span parent references must resolve inside the same trace; duplicate spans, self-parenting and lineage cycles fail closed; correlation summaries remain descriptive lineage only;
- supplied P9.1 scheduler and P9.6 worker projections are independently rebuilt from their supplied inputs and must match exactly before P11.3 uses them;
- bounded job-health context preserves scheduler due/missed/paused/materialized counts plus exact P9.6 control mode/health/in-flight/stale-heartbeat/dead-letter/kill-recovery counts without dispatching work or changing control state;
- alert policy is caller-supplied and validated; P11.3 creates deterministic local candidates for failure-rate, missed-schedule, stale-heartbeat, dead-letter, unreconciled-kill and blocked-recovery conditions;
- every alert is `candidate_only` with `deliveryAuthorized=false` and `incidentCreationAuthorized=false`;
- no OpenTelemetry/Prometheus/Datadog/Sentry/etc. exporter, Slack/email/PagerDuty/webhook integration, database migration, API route, scheduler/worker activation or runtime configuration was added.

Implementation:
- `artifacts/api-server/src/lib/observability-foundation.ts`
- `artifacts/api-server/src/lib/observability-foundation.test.ts`
- `artifacts/api-server/src/lib/observability-foundation-contract.test.ts`
- `docs/p11-3-observability.md`

Certification:
- implementation base SHA/tree: `a246f021a1eb0a511d0b27b7a3dbdb8256a77d3a` / `2c7ad666e86a13a9de7415d23d1a2f0941b4e015`;
- exact tested implementation head/tree: `350c6463a4466574d181bfe8c543f32fe73eb0ac` / `6759f50bd55bd89409939a275f92cabd7b0dce9c`;
- detached Replit exact-head validation before PR: focused P11.3 tests 12/12 PASS, full API tests 1,038/1,038 PASS, API typecheck and `git diff --check` PASS, followed by restoration to clean canonical main;
- exact-head PR CI #600 / run `35583135013`: success across schema/bootstrap checks, all workspace tests, Chromium browser suite, typecheck and build/P11.1 budget gate;
- implementation merge/tree: `e2cd22ae0e8e072be04bb6d31369e27e9f8ee040` / `6759f50bd55bd89409939a275f92cabd7b0dce9c`;
- post-merge main CI #601 / run `35583379204`: success across the same complete gate set;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree and zero tracked/untracked differences;
- Replit validation using existing dependencies only: recursive workspace tests PASS with 1,194 reported passes / 0 failures, full typecheck PASS, full build PASS, P11.1 performance-budget gate PASS and `git diff --check` PASS;
- Replit P11.1 build diagnostics remained JS `589,405` raw / `169,557` gzip and CSS `179,974` raw / `29,929` gzip; only the pre-existing sourcemap-location notices and Vite >500 kB advisory remained non-fatal.

P11.3 is **unpublished**. It performed no production telemetry ingestion, exporter/sink configuration, alert delivery, incident mutation, provider/public-site activity, Production DB read/write/DDL/DML, credential/secret use, scheduler/worker/retry activation, P9.8 implementation/activation, Task #51/#53/#54 execution, runtime/deployment configuration change, deployment or publication.

P11.3 does **not** claim that production is currently observable end-to-end. It does not prove that production requests emit these records, that a production metrics/log/trace backend exists, that alert delivery works or that current incidents would be detected.

Detailed record:
- issue #348 — `P11.3 — offline observability contracts, correlation and job-health projection`
- PR #349 — `P11.3 — offline observability contracts, correlation and job-health projection`
- `docs/p11-3-observability.md`
- `.agents/memory/p11-3-observability-closeout.md`

P11.4 has since been completed as the bounded deterministic/offline recovery-planning and synthetic disaster-runbook milestone. The historical P11.3 boundary remains observability-foundation engineering only and does not itself imply production telemetry, recovery execution, deployment or publication authority.

## Previous engineering state — P11.2 complete

Roadmap **P11.2 — security review: auth, CSRF, SSRF, CSP/headers, secret handling and supply chain** is complete under issue #345 / implementation PR #346.

P11.2 adds a deterministic/offline security-review and bounded source-hardening pass over the engineering tree:
- auth audit/rate-limit client identity now uses Express-resolved `req.ip` under the existing `trust proxy = 1` policy rather than separately trusting the first raw `X-Forwarded-For` value;
- OIDC post-login `returnTo` values are normalized to bounded same-origin application paths and fail closed for absolute/protocol-relative forms, backslashes, ASCII controls, malformed/empty or overlong values;
- Express `X-Powered-By` disclosure is disabled;
- security headers retain CSP/HSTS/frame/content/referrer/permissions controls and add `Cross-Origin-Opener-Policy: same-origin` plus `Cross-Origin-Resource-Policy: same-origin`;
- middleware security tests are included in the normal API package test command;
- a network-free security-posture contract protects pnpm minimum-release-age controls, the built-dependency allowlist, frozen-lockfile CI, read-only GitHub Actions permissions, absence of `pull_request_target`, query-string stripping, auth/cookie redaction, trusted-proxy identity handling and source-level security-header invariants;
- GitHub Actions used by CI are pinned to immutable 40-character commit SHAs;
- the existing SSRF-hardened competitor transport remains unchanged and retains URL/protocol validation, public-IP validation, IP-pinned execution, rebinding protection, proxy bypass resistance, manual redirects and sensitive header/body/method rejection;
- P11.2 does not claim that dependencies are vulnerability-free: it made no live advisory-service query, and residual items such as the CI PostgreSQL image tag, CSP inline-style/HTTPS-image allowances and deployment-topology `trust proxy` assumptions remain explicitly documented for later/final review;
- no production/public-site scan or exploitation, secret retrieval/rotation, live OAuth/provider request, Production DB read/write/DDL/DML, dependency/lockfile change, scheduler/worker activation, P9.8 implementation, Task #51/#53/#54 execution, runtime/deployment configuration change, provider/public-site mutation, deployment or publication.

Implementation:
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/lib/auth-foundation.ts`
- `artifacts/api-server/src/lib/auth-foundation.test.ts`
- `artifacts/api-server/src/lib/security-posture-contract.test.ts`
- `artifacts/api-server/src/middlewares/auth-security.ts`
- `artifacts/api-server/src/middlewares/auth-security.test.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/package.json`
- `.github/workflows/ci.yml`
- `docs/p11-2-security-review.md`

Certification:
- implementation base SHA/tree: `841c10c4a0fbe06fcd97d3c3fbcc84357dd18790` / `12036420976ac3f1ddc9413a070b3c71533abdd4`;
- exact tested implementation head/tree: `6b1380efebccea980123f293b550e599b65b22ba` / `e42872ed4887c48698ddd0358089931f166a4e9a`;
- exact-head PR CI #596 / run `35574991295`: success across schema/bootstrap checks, all workspace tests including P11.2 middleware/posture contracts and existing SSRF transport coverage, Chromium browser suite, typecheck and build/budget gate;
- implementation merge/tree: `cdf1ca8d9c1138dc8dd9fed4d41c1d6e31f5b7cb` / `e42872ed4887c48698ddd0358089931f166a4e9a`;
- post-merge main CI #597 / run `35579001011`: success across the same complete gate set;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree and zero tracked/untracked differences;
- Replit validation using existing dependencies only: recursive workspace tests PASS with 1,182 reported passes / 0 failures, full typecheck PASS, full build PASS, P11.1 performance budget PASS and `git diff --check` PASS;
- Replit P11.1 build diagnostics remained JS `589,405` raw / `169,557` gzip and CSS `179,974` raw / `29,929` gzip; only the pre-existing sourcemap location warnings and Vite >500 kB advisory remained non-fatal;
- canonical Chromium certification is provided by exact-head CI #596 and post-merge CI #597; no Replit system-package/browser installation was performed.

P11.2 is **unpublished**. It performed no production/public-site security scan, exploit attempt, secret/credential retrieval or rotation, live provider/OAuth request, Production DB read/write/DDL/DML, dependency/lockfile mutation, P9.8 implementation/activation, Task #51/#53/#54 execution, scheduler/worker activation, runtime/deployment configuration change, provider/public-site mutation, deployment or publication.

Detailed record:
- issue #345 — `P11.2 — offline security review and bounded source hardening`
- PR #346 — `P11.2 — offline security review and bounded source hardening`
- `docs/p11-2-security-review.md`
- `.agents/memory/p11-2-security-review-closeout.md`

P11.3 has since been completed as the bounded deterministic/offline observability-foundation milestone. The historical P11.2 boundary remains source/security hardening only and does not itself imply live production telemetry, alert delivery, deployment or publication authority.

## Previous engineering state — P11.1 complete

Roadmap **P11.1 — production performance budgets and profiling** is complete under issue #341 / implementation PR #342.

P11.1 adds deterministic/offline enterprise performance hardening over the engineering tree:
- explicit versioned frontend JavaScript/CSS raw and gzip budgets in `artifacts/seo-engine/performance-budgets.json`;
- recursive post-build emitted-asset measurement using Node built-ins only;
- hard build failure on missing required asset classes or per-asset/total raw/gzip budget violations;
- current ceilings of JS `620,000` raw / `180,000` gzip and CSS `190,000` raw / `33,000` gzip, each both per-asset and total;
- the existing Vite >500 kB chunk advisory remains unchanged and visible rather than being raised or suppressed;
- normalized `p11.1.v1` synthetic-local browser profiles for DCL, load event, first-contentful-paint, main-content readiness and resource count;
- unavailable timing values remain `null` rather than being converted to zero;
- deterministic supplied-profile regression comparison uses independent metrics and marks a regression only beyond the larger of baseline × `1.25` or baseline + `100 ms`;
- no aggregate performance grade, production RUM/CWV inference or production user-experience verdict;
- local Playwright profiling covers `/`, `/technical-seo`, `/search-intelligence`, `/ai-visibility`, `/governance`, `/impact` and `/connections` under the existing synthetic no-external-network boundary;
- no production load generation, provider contact, Production DB access/mutation, secret/config/runtime mutation, scheduler/worker activation, Task #51/#53/#54 execution, provider/public-site write, deployment or publication.

Implementation:
- `artifacts/seo-engine/performance-budgets.json`
- `artifacts/seo-engine/performance/performance-budget.mjs`
- `artifacts/seo-engine/scripts/check-performance-budgets.mjs`
- `artifacts/seo-engine/src/performance-budget-contract.test.mjs`
- `artifacts/seo-engine/e2e/performance-profile.spec.mjs`
- `artifacts/seo-engine/package.json` build/test registration
- `docs/p11-1-performance-budgets-and-profiling.md`

Certification:
- implementation base SHA/tree: `accea205784a1ba5a99d4627f807e52742d3fb84` / `b7e1782f9a2fe4e20ea4e60ce0ed9ab9b52d7d46`;
- exact tested implementation head/tree: `a3e6eb9ec03f090ac8c18da4d0ff3f8823fff635` / `47346f32708af927b8b9394b82c892b3caa00318`;
- exact-head PR CI #588 / run `35572373801`: success across schema/bootstrap checks, all workspace tests, Chromium browser suite, typecheck and build/budget gate;
- implementation merge/tree: `b43d10f5662862cb6467edd056b1e8adf96c2aa5` / `47346f32708af927b8b9394b82c892b3caa00318`;
- post-merge main CI #589 / run `35572567203`: success across the same complete gate set;
- canonical GitHub build budget diagnostics: JS `589,405` raw / `170,018` gzip; CSS `179,974` raw / `29,944` gzip; `P11_1_BUDGET_PASS`;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree and zero tracked/untracked differences;
- Replit recursive workspace tests, full typecheck, full build/budget gate and `git diff --check`: PASS using existing dependencies only;
- Replit budget diagnostics: JS `589,405` raw / `169,557` gzip; CSS `179,974` raw / `29,929` gzip; `P11_1_BUDGET_PASS`. The small cross-environment gzip variance is compression-runtime evidence only; both remain below the explicit ceilings;
- Replit-local Chromium could not launch because the workspace image lacks `libglib-2.0.so.0`; no system package installation was attempted. Canonical browser certification is the GitHub Ubuntu/Chromium suite, which passed on both exact-head CI #588 and post-merge CI #589.

P11.1 is **unpublished**. It performed no production traffic/load generation, live provider request, Production DB read/write/DDL/DML, secret/credential/config mutation, scheduler/worker/retry activation, P9.8 implementation/activation, Task #51/#53/#54 execution, provider/public-site mutation, deployment or publication.

Detailed record:
- issue #341 — `P11.1 — production performance budgets and offline profiling`
- PR #342 — `P11.1 — production performance budgets and offline profiling`
- `docs/p11-1-performance-budgets-and-profiling.md`
- `.agents/memory/p11-1-performance-budgets-profiling-closeout.md`

P11.2 has since been completed as the bounded deterministic/offline security-review milestone. The historical P11.1 boundary remains performance hardening only and does not itself imply security certification, deployment or publication authority.

## Previous engineering state — P10.7 complete

Roadmap **P10.7 — Impact workspace v2** is complete under issue #337 / PR #338.

P10.7 replaces the legacy `/impact` live-deployments measurement table with a deterministic **synthetic/read-only** frontend projection over explicit P10.1–P10.6-shaped artifacts:
- preserves one exact visible six-layer chain: P10.1 chronology → P10.2 direct association → P10.3 windows/confounders → P10.4 experiment/holdout structure → P10.5 expected-vs-actual arithmetic → P10.6 directional calibration;
- validates the supported P10.1–P10.6 version labels, exact SHA-256 report fingerprints, parent-report fingerprint chain, canonical UTC reference/anchor/window timestamps and deterministic projection identity;
- preserves exact treatment action ID, recommendation ID/fingerprint, retained-live anchor, and direct page/query/category association as lineage only;
- preserves caller-shaped before/after windows, assignment-basis provenance, holdout count, P10.4 structural-flag fingerprints and P10.3 treatment-confounder count as descriptive context only;
- preserves each P10.5 outcome independently, including expectation/actual fingerprints, metric/unit/direction, expected/actual values, signed difference, arithmetic relation and explicit unavailable states;
- preserves each P10.6 directional signal independently and requires exact calibration→actual→expectation binding plus exact treatment recommendation identity;
- rejects duplicate actual IDs/fingerprints, duplicate signal IDs/fingerprints, unsupported layer versions, broken parent lineage and calibration/outcome or recommendation mismatches;
- stable-sorts outcome and calibration rows and derives a deterministic frontend model fingerprint;
- visibly labels the workspace **SYNTHETIC READ-ONLY**, **NO CAUSAL VERDICT**, and **NO EXECUTION**;
- uses existing `DataGrid` / `StatusBadge` design-system components and adds responsive desktop/tablet/mobile layout rules;
- removes the `@workspace/api-client-react` / live deployment-query dependency from `/impact`; no P10.7 backend API route or live loader was added;
- explicitly prevents chronology, association, windows, holdout presence, expected-vs-actual differences, arithmetic relation or directional calibration from being presented as causal impact, recommendation quality, reward/penalty, success/failure, improvement/regression, ranking weight or rollout advice;
- creates no reward/recommendation score, statistical estimate, trend/confidence inference, model update, ranking change, policy update, prompt change, rollout/retain/rollback recommendation or automatic transition;
- contains no live provider/outcome loading, Production DB read/write, SQL, provider credentials, provider/public-site write, recommendation persistence, mutation hook, timer/scheduler/worker runtime, Task #51/#53/#54 execution, P9.8 implementation, backend-route activation, deployment or publication.

Implementation:
- `artifacts/seo-engine/src/lib/impact-workspace-model.ts`
- `artifacts/seo-engine/src/lib/impact-workspace-model.test.ts`
- `artifacts/seo-engine/src/pages/impact.tsx`
- `artifacts/seo-engine/src/pages/impact.css`
- `artifacts/seo-engine/src/impact-workspace-contract.test.mjs`
- `artifacts/seo-engine/package.json` test registration

Certification:
- implementation base SHA/tree: `6a28f58962d3c710cdc050ff4af3d37b01599a9d` / `9a6c24b10794a84a8516fe42344f3bfd39f82922`;
- exact tested PR head/tree: `5e81960b3c471de18f69d5770c3dcfeeab21b70a` / `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`;
- detached Replit exact-head validation: P10.7 model tests `9/9`, P10.7 static contract tests `8/8`, full `@workspace/seo-engine` tests PASS including TypeScript model phase `55/55`, frontend typecheck/build and `git diff --check` PASS;
- exact-head PR CI #583 / run `35521313230`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `72cf75fb9248c750b485d212a8a0f9245d785809`;
- implementation tree: `5b31ddd3c9fa44f8507833752c6b50b1e6a26f81`;
- post-merge main CI #584 / run `35521463457`: success;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree and zero tracked/untracked differences;
- Replit recursive workspace tests, full workspace typecheck, full workspace build and `git diff --check`: PASS using existing dependencies only;
- known non-fatal build advisory on final merged tree: generated SEO Engine JavaScript chunk `589.41 kB` minified / `169.95 kB` gzip exceeds Vite's 500 kB advisory threshold.

P10.7 is **unpublished**. It performed no live provider/outcome loading, Production DB read/write/DDL/DML, credential/OAuth use, recommendation/model/ranking/policy mutation, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #337 — `P10.7 — Impact workspace v2`
- PR #338 — `P10.7 — Impact workspace v2`
- `.agents/memory/p10-7-impact-workspace-v2-closeout.md`

P11.1 has since been completed as deterministic/offline performance hardening; the historical P10.7 boundary remains synthetic/read-only Impact presentation and does not imply production measurement or execution authority.

## Previous engineering state — P10.6 complete

Roadmap **P10.6 — Recommendation calibration/learning signals** is complete under issue #334 / PR #335.

P10.6 adds a pure deterministic/read-only calibration projection over the exact P10.1–P10.5 lineage chain:
- independently rebuilds the supplied P10.5 outcome report from its supplied P10.5 input before any P10.6 projection; tampered or mismatched P10.5 input/report fails closed;
- therefore preserves the exact P10.1→P10.4 integrity chain already enforced by P10.5 rather than introducing a weaker or inferred lineage path;
- resolves the calibration subject only from P10.1 timeline events whose exact `lineage.actionId` equals the P10.5 treatment action;
- requires non-null recommendation ID and SHA-256 recommendation fingerprint for same-action lineage and keeps a defensive exact-conflict guard; upstream P10.2 already rejects conflicting same-action recommendation identity earlier;
- accepts only caller-supplied calibration definitions containing exact calibration key, recommendation ID/fingerprint, exact P10.5 expectation ID, role and source fingerprint;
- restricts direct recommendation calibration in v1 to exact P10.5 treatment expectations; holdout expectations cannot directly calibrate the treatment recommendation;
- treats calibration role (`primary`, `secondary`, `diagnostic`) as descriptive provenance only and never as weight, priority, score, rank, confidence or authority;
- derives one independent directional signal per exact P10.5 actual record: `same_as_declared_direction`, `opposite_declared_direction`, `equal_expected`, `neutral_direction`, or `unavailable`;
- directional signals describe only the relationship between caller-declared metric direction and exact P10.5 actual-vs-expected arithmetic;
- if an expectation has no actuals, produces no synthetic observation and leaves that calibration definition `signal_unavailable`;
- preserves multiple actuals as independent signals and never selects latest/best/worst, averages, majority-votes, scores, aggregates across metrics, infers trend, or infers confidence;
- exact definition replay dedupes while conflicting calibration-key/source/expectation replay fails closed;
- preserves P10.4 structural-flag fingerprints/count and P10.3 treatment-confounder count as provenance only, with no weighting, suppression, promotion or causal adjustment;
- explicitly records that directional signals are not recommendation quality, reward, penalty, causal impact, success/failure, ranking weight or rollout advice;
- calculates no reward score, recommendation score/rank, model reward, model parameter/weight update, policy update, prompt/template update, causal attribution or rollout/retain/rollback decision;
- creates no recommendation persistence/update, model training/fine-tuning, proposal, approval, authorization, execution, provider/public-site write or autonomous-mutation authority;
- contains no Production/live database loader, SQL, provider/network request, credential use, live outcome loader, timer, scheduler, live worker, retry runtime, schema change, route activation, deployment or publication.

Implementation:
- `artifacts/api-server/src/lib/recommendation-calibration.ts`
- `artifacts/api-server/src/lib/recommendation-calibration.test.ts`
- `artifacts/api-server/src/lib/recommendation-calibration-contract.test.ts`
- `docs/p10-6-recommendation-calibration.md`

Certification:
- implementation base SHA/tree: `73c7cbad06fe917d790ecd142bfef2210b27a064` / `2d388b480b99c4cf338a52b0b95853847cba4e87`;
- exact tested PR head/tree: `e0dbd4d6fd01a6043bfb1b164c3c0a9d23fff25a` / `00fe887aefa4a607cc26ec622d47ba9126ef68fb`;
- detached Replit validation on that exact head: focused P10.6 unit/contract tests `22/22`, API typecheck and `git diff --check` PASS;
- exact-head PR CI #579 / run `35516046746`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `255ec1058a01bf20f0db0e04f45d1c981b7c2ac6`;
- implementation tree: `00fe887aefa4a607cc26ec622d47ba9126ef68fb`;
- post-merge main CI #580 / run `35516171732`: success;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences;
- Replit recursive workspace tests PASS `1013/1013`; full typecheck, full build and `git diff --check`: PASS using existing dependencies only;
- only known non-fatal existing frontend build diagnostics remained: tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk advisory.

P10.6 is **unpublished**. It performed no live outcome/provider loading, Production DB read/write/DDL/DML, credential/OAuth use, recommendation/model/policy persistence or mutation, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, P10.7 implementation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #334 — `P10.6 — recommendation calibration and learning signals`
- PR #335 — `P10.6 — recommendation calibration and learning signals`
- `docs/p10-6-recommendation-calibration.md`
- `.agents/memory/p10-6-recommendation-calibration-closeout.md`

P10.7 has since been completed as the synthetic/read-only Impact workspace projection; the historical P10.6 boundary remains directional calibration evidence only and does not imply recommendation quality, reward or causal impact.

## Previous engineering state — P10.5 complete

Roadmap **P10.5 — Expected-vs-actual outcome tracking** is complete under issue #331 / PR #332.

P10.5 adds a pure deterministic/read-only supplied-outcome layer over the exact P10.1–P10.4 lineage chain:
- independently rebuilds the supplied P10.4 experiment/holdout report from its supplied P10.4 input before any P10.5 projection; tampered or mismatched P10.4 input/report fails closed;
- inherits P10.4's exact P10.1→P10.2→P10.3 integrity verification rather than bypassing earlier lineage;
- accepts only caller-supplied metric definitions with exact metric key, unit, direction metadata and source fingerprint;
- treats direction (`higher`, `lower`, `neutral`) as metadata only and never translates it into good/bad, success/failure, winner/loser or rollout advice;
- accepts expected outcomes only for the exact P10.4 treatment action or an exact P10.4 holdout unit, with exact scope and the exact shared after window;
- treatment expectation scope must match direct P10.2 treatment association; holdout expectation scope must exactly equal the declared P10.4 holdout scope;
- accepts actual observations only when metric, target and exact scope bind to one expectation and the timestamp lies inside the exact P10.4 after window;
- uses bounded canonical decimal strings and exact BigInt-aligned subtraction, with no floating-point value arithmetic;
- derives only `signedDifference = actual - expected` plus numeric relation `above_expected`, `equal_expected` or `below_expected`;
- preserves null/missing expected or actual values as `expected_unavailable` / `actual_unavailable` rather than inferring or imputing values;
- allows multiple actual observations for one expectation but preserves them independently and never selects, averages, aggregates, smooths or infers a trend;
- exact replay dedupes while conflicting replay for the same source identity fails closed;
- preserves exact P10.4 structural-flag fingerprints/count and P10.3 treatment-confounder count as context only, with no weighting or arithmetic adjustment;
- explicitly records that expected values are supplied expectations rather than causal counterfactuals, actual values do not prove action impact, and signed differences are arithmetic only;
- calculates no percentage change, uplift, treatment-vs-holdout effect, difference-in-differences, confidence interval, p-value/significance, probability, causal attribution, recommendation or rollout/retain/rollback decision;
- creates no live outcome loading, experiment assignment, proposal, approval, authorization, execution, provider/public-site write or autonomous-mutation authority;
- contains no Production/live database loader, SQL, provider/network request, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, schema change, route activation, deployment or publication.

Implementation:
- `artifacts/api-server/src/lib/expected-actual-outcome.ts`
- `artifacts/api-server/src/lib/expected-actual-outcome.test.ts`
- `artifacts/api-server/src/lib/expected-actual-outcome-contract.test.ts`
- `docs/p10-5-expected-actual-outcomes.md`

Certification:
- implementation base SHA/tree: `e0fbb08f5f4995a5d691861a01a7a8c7dd8260fe` / `fe347637abdb7096b3b6a242e7e255add28ec7b6`;
- exact tested PR head/tree: `a7e198e38118ac091907713812dd526d17bd448c` / `81354446398d038a6360502385982cd47166c38f`;
- detached Replit validation on that exact head: focused P10.5 unit/contract tests `19/19`, API typecheck and `git diff --check` PASS;
- exact-head PR CI #575 / run `35511781930`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `d038fbb1b8cccc67366dec7eb79961e10e947507`;
- implementation tree: `81354446398d038a6360502385982cd47166c38f`;
- post-merge main CI #576 / run `35511907628`: success;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences;
- Replit recursive workspace tests PASS, including API suite `991/991`; full typecheck, full build and `git diff --check`: PASS using existing dependencies only;
- only known non-fatal existing frontend build diagnostics remained: tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk advisory.

P10.5 is **unpublished**. It performed no live outcome/provider loading, Production DB read/write/DDL/DML, credential/OAuth use, proposal/approval/action persistence, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, P10.6 implementation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #331 — `P10.5 — expected-vs-actual outcome tracking`
- PR #332 — `P10.5 — expected-vs-actual outcome tracking`
- `docs/p10-5-expected-actual-outcomes.md`
- `.agents/memory/p10-5-expected-actual-closeout.md`

P10.6 has since been completed as the next deterministic/read-only layer; the historical P10.5 boundary remains expected-vs-actual arithmetic only and does not imply recommendation quality or causal impact.

## Previous engineering state — P10.4 complete

Roadmap **P10.4 — Experiment/holdout framework where practical** is complete under issue #328 / PR #329.

P10.4 adds a pure deterministic/read-only supplied experiment/holdout design layer over exact P10.1 chronology, P10.2 direct action attribution and P10.3 window/confounder analysis:
- independently rebuilds exact P10.2 from the supplied P10.1 timeline before any P10.4 projection;
- independently rebuilds the supplied P10.3 treatment analysis and fails closed if the supplied P10.3 report differs from the exact deterministic rebuild;
- requires exact P10.1→P10.2→P10.3 lineage binding before any experiment/holdout structure is emitted;
- models exactly one treatment action in v1 and requires its exact P10.3 retained-live anchor plus available before and after windows;
- accepts zero or more caller-supplied holdout definitions; zero holdouts remains explicitly `treatment_only` and never becomes a pseudo-control;
- records caller-declared assignment basis only as provenance: `externally_randomized`, `externally_matched`, `externally_selected` or `observational`;
- never treats a randomization/matching declaration as verified randomization, balance, comparability or exchangeability;
- requires exact holdout unit IDs, explicit assignment source identity/fingerprint and at least one page/query/category scope dimension;
- reuses the exact P10.3 treatment windows and never derives, shifts or re-anchors experiment windows;
- classifies caller-supplied holdout observations only when the observation scope exactly equals the declared holdout scope;
- preserves holdout observation membership only as `before`, `after` or `outside`;
- exact source replay dedupes and conflicting replay under the same source identity fails closed;
- emits bounded descriptive structural flags only for cross-arm exact scope overlap, exact holdout-action overlap, treatment P10.3 confounder presence and missing holdout before/after observation coverage;
- does not treat scope disjointness as exchangeability or holdout presence as comparability;
- explicitly records that before/after timing does not establish causality and contamination flags do not perform causal adjustment;
- calculates no treatment effect, metric delta, statistical significance, confidence interval, experiment success/failure, winner/loser or rollout/retain/rollback recommendation;
- creates no live assignment, proposal, approval, authorization, execution, provider/public-site write or autonomous-mutation authority;
- contains no Production/live database loader, SQL, provider/network request, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, schema change, route activation, deployment or publication.

Implementation:
- `artifacts/api-server/src/lib/experiment-holdout.ts`
- `artifacts/api-server/src/lib/experiment-holdout.test.ts`
- `artifacts/api-server/src/lib/experiment-holdout-contract.test.ts`
- `docs/p10-4-experiment-holdout.md`

Certification:
- implementation base SHA/tree: `7ec8706bf7320cff7a41a420f387f43eecbd1b13` / `ad0f09cd5fc7c2e0bf9f60705232e7cfc326ebb9`;
- exact tested PR head/tree: `ce67cbbe5542e45ddd5f76204274555e2c5ea45a` / `d236693f98231e6aa991a3e39feb6a17e802187d`;
- detached Replit validation on that exact head: focused unit tests, contract tests, API typecheck and `git diff --check` PASS;
- exact-head PR CI #571 / run `35510122006`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `50ef9fda7b9e0bdee2d48e1d2ba1400b8d9a5b7e`;
- implementation tree: `d236693f98231e6aa991a3e39feb6a17e802187d`;
- post-merge main CI #572 / run `35510239165`: success;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences and zero diff against origin/main;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: PASS using existing dependencies only;
- only known non-fatal existing frontend build diagnostics remained: tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk warning.

P10.4 is **unpublished**. It performed no live experiment assignment, Production DB read/write/DDL/DML, provider/crawl request, credential/OAuth use, proposal/approval/action persistence, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, P10.5 implementation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #328 — `P10.4 — experiment/holdout framework where practical`
- PR #329 — `P10.4 — supplied experiment/holdout framework`
- `docs/p10-4-experiment-holdout.md`
- `.agents/memory/p10-4-experiment-holdout-closeout.md`

P10.5 has since been completed as the next deterministic/read-only layer; the historical P10.4 boundary remains experiment/holdout structure only and non-causal/non-statistical.

## Previous engineering state — P10.3 complete

Roadmap **P10.3 — Before/after windows and confounder flags** is complete under issue #325 / PR #326.

P10.3 adds a pure deterministic/read-only window-membership and descriptive-confounder layer over exact supplied P10.1 chronology and P10.2 direct action attribution:
- independently rebuilds the supplied P10.2 attribution from the supplied P10.1 timeline before analysis; tampered or mismatched lineage fails closed;
- analyzes only an exact P10.2 `actionId`;
- accepts a measurement anchor only from an exact same-action P10.1 `verified_change_retained_live` event fingerprint;
- never infers an anchor from authorization, deployment, provider-write acceptance, nearby verification, timestamp proximity or event ordering;
- accepts only caller-supplied canonical UTC before/after bounds; before must end strictly before the anchor and after must start strictly after it;
- preserves missing anchor/window state as unavailable rather than inventing a window, duration, cooldown, lag or significance threshold;
- classifies caller-supplied observations only when every supplied non-null page/query/category/site scope dimension exactly matches P10.2 direct association;
- preserves `before`, `after`, `outside`, `unassociated` and `window_unavailable` as distinct descriptive states;
- emits same-action uncertain-write, rollback and manual-intervention flags only from exact P10.1 events inside a supplied window;
- emits an overlapping-action flag only when another exact P10.2 action has retained-live evidence inside the window and shares at least one exact direct page/query/category association;
- accepts bounded caller-supplied external confounder facts only with explicit source identity, canonical interval and exact P10.2-compatible scope;
- exact source replay dedupes while conflicting replay for the same source identity fails closed;
- explicitly records that chronology, direct association, window membership and confounder overlap do not establish causality, causal adjustment or impact;
- calculates no metric delta, confidence, score, recommendation, retain/replace/rollback decision or causal effect;
- creates no proposal, approval, authorization, execution, provider/public-site write or autonomous-mutation authority;
- contains no Production/live database loader, SQL, provider/network request, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, schema change, route activation, deployment or publication.

Implementation:
- `artifacts/api-server/src/lib/action-window-confounder.ts`
- `artifacts/api-server/src/lib/action-window-confounder.test.ts`
- `artifacts/api-server/src/lib/action-window-confounder-contract.test.ts`
- `docs/p10-3-window-confounder.md`

Certification:
- implementation base SHA/tree: `2340f788dfc26bda65cd6ab5fb8891d4a9abf933` / `ef58daa82cbcfd355cc0cbe5ee64ee2d36d4b8ee`;
- exact tested PR head/tree: `14d24e1c4186fafd5ef5f159d789f0e1cd05cd99` / `a6b4e87a607f9a2ea973c7d2f6f603d511669d53`;
- detached Replit validation on that exact head: focused unit tests, contract tests, API typecheck and `git diff --check` PASS;
- exact-head PR CI #567 / run `35508864497`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `7337cefde56bfecc11664f81fbba8adcc6130393`;
- implementation tree: `a6b4e87a607f9a2ea973c7d2f6f603d511669d53`;
- post-merge main CI #568 / run `35509022152`: success;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences and zero diff against origin/main;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: PASS using existing dependencies only;
- only known non-fatal existing frontend build diagnostics remained: tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk warning.

P10.3 is **unpublished**. It performed no Production DB read/write/DDL/DML, provider/crawl request, credential/OAuth use, proposal/approval/action persistence, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, P10.4 implementation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #325 — `P10.3 — before/after windows and confounder flags`
- PR #326 — `P10.3 — before/after windows and confounder flags`
- `docs/p10-3-window-confounder.md`
- `.agents/memory/p10-3-window-confounder-closeout.md`

P10.4 has since been completed as the next deterministic/read-only layer; the historical P10.3 boundary remains window/confounder evidence only and non-causal.

## Previous engineering state — P10.2 complete

Roadmap **P10.2 — Action-to-page/query/category attribution** is complete under issue #322 / PR #323.

P10.2 adds a pure deterministic/read-only direct-association layer over an exact supplied P10.1 report:
- independently rebuilds and verifies the supplied P10.1 report before attribution; tampered/non-canonical input fails closed;
- groups events into an action only through an explicit non-null P10.1 `lineage.actionId`;
- page association uses only same-action `target.pageId` and/or `target.url`;
- query association uses only same-action `associations.query`;
- category association uses only same-action `associations.category`;
- every association retains exact contributing P10.1 event/source provenance;
- missing page/query/category evidence stays `unavailable`; there is no likely/inferred/estimated association state;
- exact same page ID may enrich a missing URL and exact same URL may enrich a missing page ID;
- same page ID with conflicting non-null URLs or same URL with conflicting non-null page IDs fails closed;
- page-ID-only and URL-only evidence with no shared identifier remain separate rather than being guessed equivalent;
- multiple distinct directly supplied queries/categories are preserved as deterministic sets with no semantic expansion, weighting or taxonomy inference;
- same-action site/opportunity/recommendation/action-plan/proposal lineage may enrich nulls, while conflicting non-null singular lineage fails closed;
- shared opportunity/action-plan/proposal, matching URL, resource kind, URL path, event ordering, metric movement or timestamp proximity never creates action association;
- explicitly records that association is direct lineage only, not causal attribution or impact measurement;
- creates no proposal, approval, authorization, execution, provider/public-site write or autonomous-mutation authority;
- contains no Production/live database loader, provider/network request, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, schema change, route activation, deployment or publication.

Implementation:
- `artifacts/api-server/src/lib/action-attribution.ts`
- `artifacts/api-server/src/lib/action-attribution.test.ts`
- `artifacts/api-server/src/lib/action-attribution-contract.test.ts`
- `docs/p10-2-action-attribution.md`

Certification:
- implementation base SHA/tree: `5046f1ed19fd93bbcee332934efcc9a967fd229c` / `d122b0f80a1789bef6863f3305cc6b5c7a55eacc`;
- exact tested PR head/tree: `4040632c297af50b5a7b49d5bcd1efcdf36bd711` / `99fed5c9fd8dc2df0d72076f0c05e35bde45212d`;
- detached Replit branch validation: focused unit tests, contract tests, API typecheck and `git diff --check` PASS;
- exact-head PR CI #563 / run `35507439693`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `34eb263c48b2c01920cb23df1b854d7df95b3bea`;
- implementation tree: `99fed5c9fd8dc2df0d72076f0c05e35bde45212d`;
- post-merge main CI #564 / run `35507555715`: success;
- Replit was Git-only fast-forwarded to the exact implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences and zero diff against origin/main;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: PASS;
- Replit validation used existing dependencies only and performed no dependency/lockfile update, config/secret/database/provider/runtime change, deployment or publication.

P10.2 is **unpublished**. It performed no Production DB read/write/DDL/DML, provider/crawl request, credential/OAuth use, proposal/approval/action persistence, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, P10.3 implementation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #322 — `P10.2 — action-to-page/query/category attribution`
- PR #323 — `P10.2 — direct action attribution`
- `docs/p10-2-action-attribution.md`
- `.agents/memory/p10-2-action-attribution-closeout.md`

P10.3 has since been completed as the next deterministic/read-only layer; the historical P10.2 boundary remains association-only and non-causal.

## Previous engineering state — P10.1 complete

Roadmap **P10.1 — Unified Change Timeline v1** is complete under issue #319 / PR #320.

P10.1 adds a pure deterministic/read-only timeline foundation over directly supplied already-certified change lineage:
- defines five bounded descriptive event classes: opportunity, recommendation, proposal, execution and measurement;
- binds every normalized event to canonical ISO time, exact source system/version/event identity, optional exact source fingerprint, direct site/target lineage and exact upstream IDs/fingerprints when supplied;
- preserves unknown/unavailable values as null instead of inferring them from nearby events;
- collapses exact replay of one source identity and fails closed when the same claimed source identity has different canonical content;
- orders events only by canonical timestamp, equal-time event-kind precedence and final event fingerprint; ordering creates no priority, risk, quality or execution preference;
- includes an exact P6.7 lifecycle adapter that independently rebuilds supplied lifecycle state before projecting only explicit P6.7 transition IDs/fingerprints;
- represents accepted/uncertain provider-write state, verification, rollback, manual intervention and retained-live state only when directly supplied;
- requires uncertain provider-write outcomes to remain unknown instead of being silently converted to “no write”;
- permits descriptive measurement eligibility/pending/unavailable markers but explicitly performs no measurement-impact calculation;
- explicitly records that temporal proximity creates neither lineage nor attribution and that metric movement is not attributed to an action;
- creates no ProposalRecord, approval, authorization, execution, provider/public-site write or autonomous-mutation authority;
- contains no Production/live database loader, provider/network request, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, schema change, route activation, deployment or publication.

Implementation:
- `artifacts/api-server/src/lib/unified-change-timeline.ts`
- `artifacts/api-server/src/lib/unified-change-timeline.test.ts`
- `artifacts/api-server/src/lib/unified-change-timeline-contract.test.ts`
- `docs/p10-1-unified-change-timeline.md`

Certification:
- implementation base SHA/tree: `621750c172bddef78a30415b6e157f1bc2e3cb8c` / `70a5ede3f9c0cf62fce1738efff12c570a0ae4ae`;
- exact tested PR head/tree: `23d9f97fb3c644f62b41e7b6c8c0cf22c8755fb4` / `f321069813c95546d95ed253119b7bc8d79f2380`;
- exact-head PR CI #558 / run `35505049246`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `779b5a655dd04f60744d24ee373071a6a03dca23`;
- implementation tree: `f321069813c95546d95ed253119b7bc8d79f2380`;
- post-merge main CI #559 / run `35505161647`: success;
- Replit was independently verified exact-aligned to the implementation merge/tree with origin/main exact, ahead/behind `0/0`, clean index/worktree, zero tracked/untracked differences and zero diff against origin/main;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: PASS;
- Replit validation used existing dependencies only and performed no dependency/lockfile update, config/secret/database/runtime change, deployment or publication.

P10.1 is **unpublished**. It performed no Production DB read/write/DDL/DML, provider/crawl request, credential/OAuth use, proposal/approval/action persistence, Task #51/#53/#54 execution, provider/public-site mutation, P9.8 implementation/activation, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #319 — `P10.1 — Unified change timeline v1`
- PR #320 — `P10.1 — unified change timeline v1`
- `docs/p10-1-unified-change-timeline.md`
- `.agents/memory/p10-1-unified-change-timeline-closeout.md`

Default next safe boundary: **P10.2 — action-to-page/query/category attribution**. Generic continuation may define and implement deterministic/read-only direct-association semantics over exact P10.1/source lineage only. It must not infer causality from temporal proximity, start P9.8 autonomous mutation, execute Task #51/#53/#54, call providers, mutate Production data/schema, deploy or publish.

## Previous engineering state — P9.8 review complete / implementation blocked

Roadmap **P9.8 — Autonomous mutation policy engine architecture review** is complete under issue #316 / PR #317.

P9.8 is review-only architecture. It made no autonomous-mutation implementation or runtime change.

Review decisions:
- selected the first future autonomous canary class as Shopify **product SEO `meta_description`** only;
- retained the current existing Task #51–#54 executable surface as product/collection SEO `title` + `meta_description` under isolated `write_products`, but did not admit the broader surface to initial autonomy;
- deferred collection meta description, product/collection SEO title, merchant-visible content/title, handles, inventory/price/status/publication, theme mutation and any new write scope;
- preserved P8.3 media-alt as separately blocked because current Shopify `fileUpdate` requires `write_files` or `write_themes`, outside the existing isolated `write_products` authority;
- requires future autonomy to originate from exact P9.7 `proposal_review` lineage through a separately certified deterministic governed-proposal materialization bridge;
- forbids treating a P9.7 review artifact directly as a ProposalRecord or executable action;
- requires an immutable/versioned, expiring/revocable policy grant created outside the worker; the worker may never create, expand, renew or self-approve its own authority;
- requires policy authorization provenance to remain distinct from human approval provenance; future code must not fabricate human approval rows/actors;
- requires a distinct policy-authorized execution namespace; future automation must not fabricate the current Task #54 `APPLY_AND_VERIFY_TASK54` human confirmation;
- proposes initial canary admission only for deterministic/non-AI proposals, exact changed preview, no missing evidence, evidence sufficient, >=2 persisted evidence refs, quality `pass`, quality score >=90, zero warnings/blockers, bounded pilot, low effective execution risk, exact target/current-state match and no unresolved site mutation incident;
- requires a durable policy decision/idempotency reservation before any forward provider mutation;
- defines Stage 0 shadow evaluation, then a future Stage 1 canary capped at one product-meta-description action per 24 hours/site, one active site mutation, one action per worker cycle and 14-day same-target cooldown;
- requires a fresh policy version and explicit activation for any volume/class expansion;
- defines side-effect-safe pause/drain/kill: block new forward writes; if a provider write may already have occurred, provider/storefront reconciliation and the existing single bounded rollback path remain mandatory safety closure;
- kill does not retroactively roll back already completed/verified historical actions, but an in-flight write observed after kill defaults to restoration unless it was already terminal before kill;
- any unresolved forward/rollback uncertainty enters manual intervention and blocks further autonomous mutation;
- sets Stage 1 expansion review only after at least 20 terminal canary actions with zero manual intervention, zero unresolved uncertainty, verified rollbacks, verified retained writes, no duplicate execution and complete policy/action audit lineage.

P9.8 implementation remains blocked pending:
1. deterministic P9.7 → governed-proposal materialization;
2. durable policy grants/version/activation/revocation;
3. distinct policy authorization provenance;
4. policy-aware Task #51-compatible authorization;
5. policy-aware Task #54-compatible execution namespace without spoofing human confirmation;
6. durable policy decision/idempotency reservation;
7. durable mutation pause/drain/kill control bridge;
8. P8.4 verification-adapter certification;
9. P8.5 rollback/manual-intervention certification;
10. P8.6 action history/audit ledger;
11. separately authorized schema/config work for any new persistence;
12. separate implementation authorization and later separate live activation authorization.

Provider contract was rechecked against current Shopify Admin GraphQL documentation on 2026-09-20: product/collection update authority remains under `write_products`; `fileUpdate` alt updates require `write_files` or `write_themes`.

Certification:
- base SHA/tree: `484eb0e90dfed3638c84ae2b92999a60e40cf77b` / `128a61bf5526e61b0134017bbf7c56f0905f00a9`;
- exact tested review head/tree: `71e36898b0092765c9371a12dd77143cbdb7f30b` / `3e41fbffc9fb8e03edc303456531a72c8d66e13d`;
- exact-head PR CI #554 / run `35502451078`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- review merge: `84944e49cdc2e8dee0dde3b2abb723daf7c5a535`;
- review tree: `3e41fbffc9fb8e03edc303456531a72c8d66e13d`;
- post-merge main CI #555 / run `35502566507`: success;
- Replit exact-aligned at the review merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero tracked/untracked differences;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P9.8 review is **unpublished**. It performed no policy persistence, approval creation/renewal, Task #51/#53/#54 preflight/execution, live worker/scheduler/retry/batch activation, credential/scope change, provider/public-site request/write, Production DB read/write/DDL/DML, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #316 — `P9.8 — Autonomous mutation policy engine architecture review`
- PR #317 — `P9.8 — autonomous mutation policy engine architecture review`
- `docs/p9-8-autonomous-mutation-policy-review.md`
- `.agents/memory/p9-8-autonomous-mutation-policy-review-closeout.md`

Default next safe boundary: **P10.1 — unified change timeline**. Generic continuation may build deterministic/read-only timeline architecture over existing supplied/persisted change/evidence/deployment lineages without enabling P9.8 implementation, autonomous mutation, provider writes, new scopes, Production DB mutation, deployment or publication.

## Previous engineering state — P9.7 complete

Roadmap **P9.7 — Deterministic recommendation generation worker v1** is complete under issue #313 / PR #314.

P9.7 adds a pure deterministic/default-off recommendation-generation control plane over exact supplied/synthetic P6.1–P6.7 lineage plus a canonical P9.6 worker-control state:
- independently rebuilds the supplied P6.7 lifecycle report, transitively validating P6.6 preview/diff, P6.5 actionability, P6.4 explanation, P6.3 prioritization, P6.2 scoring and P6.1 opportunity/evidence identity;
- accepts P7.6 AI/GEO opportunities only after they have entered the canonical P6 pipeline; P9.7 does not read P7 provider observations directly;
- permits generation only while P9.6 control mode is `running`; paused/draining/drained/killed modes hold otherwise eligible work;
- uses deterministic bounded review templates only; no freeform generation, AI/model/provider call or AI proposal runtime;
- P6.5 `recommend` + P6.7 `observed|active` may emit an advisory-review candidate;
- P6.5 `approval` + P6.7 `observed|active` may emit a proposal-review candidate only when at least one exact P6.6 preview contains a changed field;
- P6.5 `informational` and `blocked` remain withheld;
- P6.7 `deferred` remains held;
- P6.7 `dismissed|closed|superseded` remain terminal and are never regenerated;
- preserves exact opportunity/explanation/actionability/lifecycle/score/evidence/statement/missing-evidence/semantic-guard/preview lineage;
- preserves P6.3 priority facts only as lineage and serializes P9.7 outputs by opportunity fingerprint so P9.7 creates no additional recommendation priority or dispatch order;
- emits stable recommendation/idempotency identities independent of temporary pause/resume state and P9.7 observation time, so unchanged exact lineage regenerates the same identity;
- emits only a P8-compatible governance handoff projection; it creates no ProposalRecord and grants no approval, execution, public-write, automatic-transition or Task #51 authority;
- contains no AI runtime/provider/network/database/wall-clock/timer/worker-process/Task #69/#70 primitive;
- keeps live worker, scheduler, retry loop, AI/model calls, AI proposal-generation gate, durable queue/claim, recommendation/proposal persistence, Production DB reads/writes, approval grant, Task #51/#53/#54 execution, provider/public-site writes, automatic transition and publication explicitly false.

Certification:
- base SHA/tree: `48a3e44fae0a320ad527e00ee06f5ee9eb2643a7` / `7e849723f7427009ecbd14a6d96dab7b32f94cb3`;
- exact tested PR head/tree: `9401c2b7e2598cde6e4a90ec50204c68c3e49ef2` / `52dd4492d042fea27d9fb6ce7fb5dc040fff568e`;
- exact-head PR CI #550 / run `35500244101`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `b7a64e860f7fbd7b15e9e87a5812e0cef442c104`;
- implementation tree: `52dd4492d042fea27d9fb6ce7fb5dc040fff568e`;
- post-merge main CI #551 / run `35500407071`: success;
- Replit exact-aligned at the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero tracked/untracked differences;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P9.7 is **unpublished**. It performed no live worker/scheduler/retry activation, AI/model/provider call, `AI_PROPOSAL_GENERATION_ENABLED` change, durable queue/claim mutation, recommendation/proposal persistence, Task #69/#70 execution, credential/OAuth use, provider/crawl request, Production DB read/write/DDL/DML, approval grant, Task #51/#53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #313 — `P9.7 — Deterministic recommendation generation worker v1`
- PR #314 — `P9.7 — Deterministic recommendation generation worker v1`
- `docs/p9-7-recommendation-generation-worker.md`
- `.agents/memory/p9-7-recommendation-generation-worker-closeout.md`

Default next boundary: **P9.8 — autonomous mutation policy engine REVIEW ONLY**. Generic continuation may inspect and define the policy architecture, eligible already-certified action classes, risk/approval/verification/rollback requirements, and activation prerequisites. It does **not** authorize implementation or activation of autonomous mutation, proposal-to-execution transition, Task #51/#53/#54 execution, new provider scopes/credentials, Production DB writes, public-site/provider writes, deployment or publication.

## Previous engineering state — P9.6 complete

Roadmap **P9.6 — Worker observability and pause/drain/kill/resume controls v1** is complete under issue #310 / PR #311.

P9.6 adds a pure deterministic/default-off worker-control and observability layer over supplied/fake state plus certified P9.5 projections:
- control precedence is `kill > drain > pause > running`;
- pause blocks new admission/claims/retry dispatch while allowing already in-flight work to continue;
- drain blocks new admission/claims/retry dispatch, allows in-flight work to finish and projects `drained` only when supplied in-flight count reaches zero;
- kill blocks admission/claims/retry dispatch and in-flight continuation, requests cancellation conceptually and emits deterministic reconciliation review for supplied in-flight state;
- `confirmed_not_started` kill evidence may remain reviewable after recovery only while the original P9.1 work window remains open; if the window expired it remains dead-letter review;
- `execution_started` and `outcome_uncertain` kill evidence require manual-intervention recovery and never auto-retry;
- ordinary resume is allowed only from paused/drained or completed-draining state; killed state fails closed with `killed_requires_recovery_review`;
- active attempt validity is checked against the exact next attempt implied by P9.5 at the supplied claim time, including retry backoff eligibility;
- claim/start/heartbeat timestamps are canonical, ordered, bounded and caller-supplied only;
- active work is modeled separately from terminal P9.5 attempt records so a valid in-flight attempt may finish after its admission window later expires, while no new claim can begin after expiry;
- heartbeat freshness and overall health are deterministic from supplied time only, with health states `healthy`, `degraded`, `paused`, `quiescing`, `drained`, `killed`, and `blocked_recovery`;
- P9.5 succeeded/dead-letter items remain terminal under every control mode;
- P9.3 `no_work` remains terminal and any supplied attempt/in-flight history for it fails closed;
- controls never reset P9.5 attempts/backoff/idempotency, extend original work windows, create catch-up/backfill or reactivate dead letters;
- contains no timer/environment/database/network/Task #69/#70/worker-process primitive;
- keeps live worker, scheduler, retry loop, durable control state, queue reservation/enqueue, durable DLQ, provider/crawl reads, crawl execution, credential/OAuth use, persistence, Production DB reads/writes, Task #53/#54, provider/public-site writes, automatic transition and publication explicitly false.

Certification:
- base SHA/tree: `d44952fc57e29dd4289b24dfe14f198c2754e9d4` / `bdb704e93435db34c83852f59b8741cc024ccba4`;
- exact tested PR head/tree: `cf982342b540db6d2f73b8b4c8c5800f61e46c33` / `f0cbc84c274379e7b120edc6636187e8d741ff55`;
- exact-head PR CI #546 / run `35498483145`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `6886c518cad989d14ea8f61ff02d20fbf2f771ab`;
- implementation tree: `f0cbc84c274379e7b120edc6636187e8d741ff55`;
- post-merge main CI #547 / run `35498627966`: success;
- Replit exact-aligned at the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero tracked/untracked differences;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P9.6 is **unpublished**. It performed no live worker/scheduler/retry activation, durable control/queue/DLQ mutation, Task #69 packet materialization, Task #70 execution, credential/OAuth use, provider/crawl request, observation/evidence persistence, Production DB read/write/DDL/DML, Task #53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #310 — `P9.6 — Worker observability and pause/drain/kill/resume controls v1`
- PR #311 — `P9.6 — Worker observability and pause/drain/kill/resume controls v1`
- `docs/p9-6-worker-observability-controls.md`
- `.agents/memory/p9-6-worker-observability-controls-closeout.md`

Default next safe boundary: **P9.7 — recommendation generation worker**. Generic continuation may define a deterministic/default-off recommendation-generation worker contract over supplied/synthetic P6/P7/P8-compatible evidence and proposals only. It does **not** authorize a live worker, AI/provider model call, `AI_PROPOSAL_GENERATION_ENABLED`, durable queue mutation, provider/crawl request, persistence, Production DB writes, public-site/provider mutation, deployment or publication.

## Previous engineering state — P9.5 complete

Roadmap **P9.5 — Failure/retry/dead-letter/idempotency controls v1** is complete under issue #307 / PR #308.

P9.5 adds a pure deterministic/default-off control-plane layer over supplied/proposed P9.1–P9.4 artifacts:
- independently validates exact P9.1 intent identity/safety plus P9.2/P9.3/P9.4 candidate identity/safety and exact candidate ↔ P9.1 schedule/intent/slot/expiry binding;
- derives one stable idempotency identity per exact upstream artifact;
- accepts only bounded caller-supplied attempt records with fixed failure codes and no raw provider/runner error text;
- suppresses exact duplicate replayed attempt records while conflicting replay for one attempt number fails closed;
- requires attempt histories to start at 1, remain contiguous, use strictly increasing timestamps, stay inside the original P9.1 work window and stop after success;
- automatically marks retryable only explicit transient/throttled failures: `transport_timeout`, `provider_rate_limited`, `provider_unavailable`, and `dependency_unavailable`;
- keeps generic `runner_failed`, `normalization_failed`, stale lineage, closed authorization, invalid input, identity collision, claim/manual-intervention, expiry, unsupported/already-consumed and unknown failures non-retryable by default;
- applies bounded total-attempt and capped deterministic backoff policy using caller-supplied time only;
- emits an inert `proposed_review` retry intent only while attempt budget and the original P9.1 work window both still allow it;
- emits inert dead-letter review for non-retryable failures, attempt-budget exhaustion, retry-window expiry, or an unattempted artifact whose original work window expired;
- successful supplied history is terminal and exact replay is suppressed;
- never creates catch-up/backfill or extends the original P9.1 due window;
- P9.3 `no_work` artifacts remain representable for control-plane lineage but gain no execution authority;
- contains no timer/network/database/environment/Task #69/#70 execution primitive;
- keeps retry loop, durable queue/reservation/dead-letter store, worker/batch execution, provider/crawl network access, crawl execution, credential/OAuth use, persistence, Production DB reads/writes, Task #53/#54, provider/public-site writes, automatic transition and publication explicitly false.

Certification:
- base SHA/tree: `91a2dcc1d94421964a6c16940fac4c12855a1676` / `df1a0f2ada77af20bbeae253fb69bffb07b15d55`;
- exact tested PR head/tree: `bf4c69555eb7eb29deeff330e25db195d8533b72` / `3737d643751b0404a4fbd0837626b50eda839d90`;
- exact-head PR CI #542 / run `35496786420`: success across schema, Task/P3.6 checks, all workspace tests, Playwright, typecheck and build;
- implementation merge: `83334cf68900bf779851f92056dc351811822533`;
- implementation tree: `3737d643751b0404a4fbd0837626b50eda839d90`;
- post-merge main CI #543 / run `35496913783`: success;
- Replit exact-aligned at the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P9.5 is **unpublished**. It performed no live retry, timer/scheduler activation, durable queue/claim/dead-letter storage, worker/batch execution, Task #69 packet materialization, Task #70 execution, credential/OAuth use, provider/crawl network request, observation/evidence persistence, Production DB read/write/DDL/DML, Task #53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #307 — `P9.5 — Failure/retry/dead-letter/idempotency controls v1`
- PR #308 — `P9.5 — Failure/retry/dead-letter/idempotency controls v1`
- `docs/p9-5-failure-retry-dead-letter-idempotency.md`
- `.agents/memory/p9-5-failure-retry-dead-letter-idempotency-closeout.md`

Default next safe boundary: **P9.6 — worker observability and pause/kill controls**. Generic continuation may define deterministic/default-off worker-state, health/observability, pause and kill-switch architecture over supplied/fake state only. It does **not** authorize worker activation, scheduler/retry-loop activation, durable queue changes, provider/crawl requests, Task #69/#70 execution, persistence, Production DB writes, provider/public-site writes, deployment or publication.

## Previous engineering state — P9.4 complete

Roadmap **P9.4 — Bounded external intelligence refresh architecture v1** is complete under issue #304 / PR #305.

P9.4 composes exact Task #66/#67/#68 reviewed-external lineage, P5.2–P5.5 supplied-result adapter foundations, P5.8 supplied telemetry and P9.1 `signal_refresh` timing:
- only exact P5.2 DataForSEO SERP, P5.3 DataForSEO keyword, P5.4 DataForSEO trends and P5.5 supplied-backlink source contracts are recognized;
- P5.2–P5.5 remain supplied-result/request-contract foundations, explicitly not live runners;
- exact source/scope/plan/request plus adapter kind/version/capability lineage is bound into P9.1 schedule identity;
- exactly one P5.8 source/signal stream is rebuilt from caller-supplied quality/cost events and rate-limit snapshots;
- quality/cost are descriptive only and cannot reorder Task #67 or create a proprietary provider score;
- provider-review/rate-limit facts yield only `supplied_review_ready`, `supplied_review_caution` or `deferred_review`;
- P5.5 manual-import provider/rate-limit readiness remains not applicable;
- only P9.1 `due` emits a deterministic `proposed_review` candidate; other states emit none;
- supplied-result foundation availability and live-runtime unavailability are separate explicit facts;
- source/plan/request/schedule/telemetry mismatches fail closed;
- all provider/runtime/persistence/mutation/publication gates remain false.

Certification:
- P9.4 branched from canonical Railway-aware main `123600024800f592867075e2b3f2f190e0ae78e4` / tree `2141b614507ef023992ffc13654132bcead2632d`; PR #303 Railway migration and main CI #536 were preserved;
- initial commits: `e9b7088f0f08b5f50eb4b7978416697cd31b0fab`, `711055de4ee535fe8d1d6f70af7bbfef49b7156c`;
- initial PR CI #537 / run `35494931740`: schema/Task/P3.6 checks passed; one P9.4 non-due fixture failed because telemetry reference time was after caller-supplied `now`, so the model correctly failed closed;
- test-fixture-only correction / exact tested PR head: `a29faa0edf05d22624ea0c5133a96f55e7b012c0`;
- exact tested tree: `b296ce42f54850313b0c4efa5e9e746df8eac85a`;
- exact-head PR CI #538 / run `35495015109`: success;
- implementation merge: `5031d9a4d10f68fbe7a82ccc3acb562e31506a9b`;
- implementation tree: `b296ce42f54850313b0c4efa5e9e746df8eac85a`;
- post-merge main CI #539 / run `35495152681`: success;
- Replit exact-aligned at the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P9.4 is **unpublished**. It performed no provider enrollment/purchase, credential/OAuth use, provider network request, Task #69/#70 execution, live timer/scheduler, durable queue/reservation, worker/batch/retry runtime, observation/evidence persistence, Production DB read/write/DDL/DML, Task #53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #304 — `P9.4 — Bounded external intelligence refresh architecture v1`
- PR #305 — `P9.4 — Bounded external intelligence refresh architecture v1`
- `docs/p9-4-bounded-external-intelligence-refresh.md`
- `.agents/memory/p9-4-bounded-external-intelligence-refresh-closeout.md`

Default next safe boundary: **P9.5 — failure/retry/dead-letter/idempotency controls**. Generic continuation may define deterministic/default-off failure classification, retry intent, dead-letter review and idempotency architecture over supplied/fake P9.1–P9.4 artifacts only. It does **not** authorize a live retry loop, durable queue/claim/dead-letter store, worker execution, provider/crawl request, Task #69/#70 execution, persistence, Production DB writes, provider/public-site writes, deployment or publication.

## Previous engineering state — P9.3 complete

Roadmap **P9.3 — Scheduled full/incremental crawl policy architecture v1** is complete under issue #299 / PR #300.

P9.3 adds a pure deterministic/default-off policy-review boundary between exact P9.1 due `crawl_refresh` intents and the certified P2.1–P2.6 first-party crawl artifacts:
- reconstructs the exact current P2.1 crawl plan, P2.2 sitemap inventory, P2.3 execution plan/checkpoint and P2.4 full-site certification lineage before policy evaluation;
- reconstructs supplied P2.5 history comparison and P2.6 incremental plan from exact before/after sources, explicit incremental policy and supplied trusted candidates;
- requires supplied P2.6 `after` inventory/certification to equal the current full-site lineage;
- binds site/origin scope plus exact current/incremental fingerprints and explicit P9.3 policy into a P9.1 `crawl_refresh` schedule;
- uses caller-supplied timestamps only and derives a deterministic slot index from the P9.1 anchor/cadence;
- supports an explicit bounded `fullReconciliationEverySlots` policy from 1 through 720 slots;
- selects `full_reconciliation` on scheduled full slots, blocked current whole-site certification, missing incremental evidence, or either exact P2.6 full-reconciliation fallback;
- selects `incremental` only when exact safe P2.6 evidence contains selected URLs;
- selects `no_work` when exact safe P2.6 evidence contains no selected candidates;
- preserves P2.6 fallback reasons `aggregate_regression_without_url_level_evidence` and `lineage_change_without_url_level_evidence` without weakening them;
- only P9.1 `due` emits one deterministic `proposed_review` crawl-policy candidate; `not_started`, `paused`, `missed` and `already_materialized` emit none;
- preserves P2 page ceilings, same-origin GET/robots/canonical/query-trap controls, bounded batching/concurrency/rate limits, redirect revalidation, checkpoint/resume and whole-site certification semantics;
- fails closed on tampered schedule, current crawl lineage, comparison or incremental-plan lineage;
- contains no timer/network/database/environment/persistence or crawl-execution primitive;
- keeps scheduler/timer, durable enqueue/reservation, worker/batch/retry runtime, sitemap/crawl network access, crawl execution, observation/evidence persistence, Production DB reads/writes, Task #53/#54, provider/public-site writes, automatic transition and publication explicitly false.

Certification:
- base SHA/tree: `3907785ab69247c7876e7dcb63c3c33c794a06ac` / `48398ece7617652cafba799fef01d0211e7faef0`;
- exact tested PR head/tree: `eb41b808e6cd90664a14d0e5d69a4ac33c5a829b` / `b0715be30d22f9183b91f08f92c253818627c7e0`;
- exact-head PR CI #531 / run `35471860344`: success across legacy schema validation, Task/P3.6 tests, all workspace tests, Playwright, typecheck and build;
- implementation merge: `023df71e35376a774c11494d8c17b03a65e7c7b6`;
- implementation tree: `b0715be30d22f9183b91f08f92c253818627c7e0`;
- post-merge main CI #532 / run `35471981585`: success;
- Replit exact-aligned on `main` at the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; only existing non-fatal sourcemap and large-chunk warnings remain.

P9.3 is **unpublished**. It performed no live timer/scheduler activation, crawl/sitemap network request, durable queue materialization/reservation, worker/batch/retry activation, observation/evidence persistence, Production DB read/write/DDL/DML, Task #53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #299 — `P9.3 — Scheduled full/incremental crawl policy architecture v1`
- PR #300 — `P9.3 — Scheduled full/incremental crawl policy architecture v1`
- `docs/p9-3-scheduled-crawl-policy.md`
- `.agents/memory/p9-3-scheduled-crawl-policy-closeout.md`

At the P9.3 checkpoint, the default next safe boundary was **P9.4 — bounded external intelligence refresh**; that milestone is now complete as recorded above.

## Previous engineering state — P9.2 complete

Roadmap **P9.2 — Default-off first-party refresh materialization review v1** is complete under issue #296 / PR #297.

P9.2 adds a pure deterministic review boundary between exact P9.1 due `signal_refresh` intents and certified first-party read foundations:
- independently reconstructs Task #66 market/category identity;
- independently validates Task #67 source identity plus exact refresh-plan ID/fingerprint/safety;
- rebuilds the exact Task #68 adapter request from source/selected-item/market/category/plan lineage and fails closed on mismatch;
- binds exact source/market/category/signal scope and exact Task #67 plan + Task #68 request lineage into P9.1 schedule fingerprints;
- requires `workClass=signal_refresh`, exact P9.1 schedule identity/safety and a caller-supplied evaluation timestamp;
- only P9.1 `due` emits one `proposed_review` P9.2 candidate; `not_started`, `paused`, `missed` and `already_materialized` emit none;
- recognizes the exact Task #71 GSC source key + keyword contract only as `runner_foundation_available`; this explicitly does not mean configured, credential-ready, OAuth-ready, network-ready, Task #70-authorized or executable;
- represents first-party `analytics` and `catalog` channels as `runner_foundation_unavailable` with exact blockers because no current Task #70-compatible source-specific runner equivalent to Task #71 is certified for those channels;
- rejects external sources, unsupported first-party signals and malformed GSC source contracts;
- changes schedule identity when material source/market/category/plan/request lineage changes;
- imports/calls no Task #69 packet construction or Task #70 execution primitive;
- contains no timer/network/database/environment/persistence primitive;
- keeps scheduler/timer, durable enqueue/reservation, worker/batch/retry, Task #69 packet materialization, Task #70 execution, credentials/OAuth, provider reads, persistence, Production DB writes, Task #53/#54, provider/public-site writes, automatic transition and publication explicitly false.

Certification:
- base SHA/tree: `757d55acd0aafbdfd0511bfd425b392c2a6c5a6f` / `2e85be0238b8d86fe083faeb6f63f1b01f16e9ab`;
- initial PR head/tree: `32237d48d5ff94e876ad7f317502d7738fd017b8` / `ab1db57d6c603a41838debd843db06c195bfc5c3`;
- PR CI #526 / run `35468908442`: failed only because the negative-test helper eagerly built a schedule before `assert.throws`; schema, Task and P3.6 migration checks passed;
- correction commit / exact tested PR head/tree: `d6de55b2d1e63c2237e0557599bfe0896e767d87` / `e929c3ededd5fcf71d9891bf51bb92f9dd03fd95`; test-fixture split only, no product/model semantic change;
- exact-head PR CI #527 / run `35468999452`: success across schema, Task/migration tests, all workspace tests, Playwright, typecheck and build;
- implementation merge: `6f7b1dec70d99e6797980e08b10f072c6869d18a`;
- implementation tree: `e929c3ededd5fcf71d9891bf51bb92f9dd03fd95`;
- post-merge main CI #528 / run `35469110061`: success;
- Replit exact-aligned on `main` at the merge/tree, ahead/behind `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P9.2 is **unpublished**. It performed no live timer/scheduler activation, durable queue materialization/reservation, Task #69 packet creation, Task #70 execution, GSC/GA4/Shopify provider request, credential/OAuth use, observation/evidence persistence, Production DB read/write/DDL/DML, Task #53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #296 — `P9.2 — Default-off first-party refresh materialization review v1`
- `docs/p9-2-first-party-refresh-materialization.md`
- `.agents/memory/p9-2-first-party-refresh-closeout.md`

At the P9.2 checkpoint, the default next safe boundary was **P9.3 — scheduled full/incremental crawl policy architecture**; that milestone is now complete as recorded above.

## Previous engineering state — P9.1 complete

Roadmap **P9.1 — Read-only scheduler/queue architecture v1** is complete under issue #293 / PR #294.

P9.1 adds a pure deterministic control-plane model for future scheduled read work without activating any runtime scheduler:
- supports only non-mutating `signal_refresh` and `crawl_refresh` work classes;
- defines deterministic schedule IDs/fingerprints from exact schedule semantics and lineage;
- uses caller-supplied timestamps only, with no wall-clock access;
- defines fixed cadence slots anchored to `startAt`, bounded non-overlapping due windows, and no completion-time drift;
- projects explicit `not_started`, `paused`, `due`, `missed`, and `already_materialized` states;
- emits no catch-up/backfill intent for missed windows;
- validates any supplied last-materialized timestamp as an exact aligned schedule slot and fails closed on future/misaligned state;
- projects at most one deterministic read-work intent per due schedule/slot;
- bounds queue projection to 100 schedules and rejects duplicate schedule keys/IDs;
- treats canonical output ordering as serialization only, never priority or ranking;
- leaves scheduler/timer activation, durable enqueue, reservation/claim, worker, batch executor, retry loop, Task #69 packet materialization, Task #70 execution, credential use, provider/crawl network reads, observation/evidence persistence, Production DB writes, provider/public-site writes, Task #53/#54 execution, automatic transition and publication explicitly false.

Certification:
- base SHA/tree: `53aef9450ed282d74fe3b3436bbb5ec05315f47c` / `b11922ac555733f96b03c65e8bf112e37ae14cc3`;
- exact tested PR head/tree: `71aa75c620c8e05ea37c23a1ca932dbe255139b9` / `e2f2d40dd530b80c74d6803f9245ff642f9f11a8`;
- PR CI #522 / run `35467292055`: success;
- implementation merge: `e348aed49b3d787d237096a2bde24b23930e3223`;
- implementation tree: `e2f2d40dd530b80c74d6803f9245ff642f9f11a8`;
- post-merge main CI #523 / run `35467412415`: success;
- Replit exact-aligned on `main` at the merge/tree, ahead/behind `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P9.1 is **unpublished**. It performed no timer/scheduler activation, queue materialization, reservation, worker/retry activation, Task #69 packet creation, Task #70 execution, provider/crawl request, credential use, observation/evidence persistence, Production DB read/write/DDL/DML, Task #53/#54 execution, provider/public-site mutation, environment/secret/config mutation, deployment or publication.

Detailed record:
- issue #293 — `P9.1 — Read-only scheduler/queue architecture v1`
- `docs/p9-1-read-scheduler-queue-architecture.md`
- `.agents/memory/p9-1-read-scheduler-queue-closeout.md`

At the P9.1 checkpoint, the default next safe boundary was **P9.2 — scheduled GSC/analytics/catalog refresh architecture/materialization review**; that milestone is now complete as recorded above.

## Previous engineering state — P8.3 action-class review complete; implementation blocked

Roadmap **P8.3 — expand bounded Shopify/site mutation action classes only after individual review** has completed its first individual action-class review under issue #291. No mutation-class implementation was authorized or added.

Review result:
- the current certified execution foundation remains limited to Shopify `product` / `collection` SEO fields `title` and `meta_description`;
- those existing fields use the isolated Task #53 `write_products` credential and retain the existing Task #51–#54 exact-target, stale-state, authorization, verification, deterministic rollback and manual-intervention controls;
- product media alt text was selected as the preferred future bounded action class because it is a single reversible metadata field with lower blast radius than merchant-visible title, description HTML or handle changes;
- current Shopify Admin GraphQL `fileUpdate` supports file alt text but requires `write_files` or `write_themes`;
- the existing Task #53 credential is deliberately `write_products` only, so adding `write_files` would expand provider authority and requires separate explicit authorization;
- deprecated `productUpdateMedia` must not be selected merely to avoid that scope review;
- merchant-visible title and description-HTML mutation classes remain deferred; handle mutation is not accepted as the first expansion because of URL/canonical/redirect/indexing blast radius.

Future media-alt implementation contract, if separately authorized:
- one exact Diamond Shelf Product GID plus one exact MediaImage/File GID; no batch or wildcard target;
- a distinct field identity such as `media_alt`;
- exact provider pre-read and before/proposed fingerprints;
- fail closed on stale alt, changed/missing media identity, ownership/reference mismatch, non-ready file state, duplicate deployment or active site execution;
- a separately reviewed isolated `write_files` credential/profile; never silently broaden the existing Task #53 `write_products` profile;
- exactly one `fileUpdate` forward mutation setting only alt text;
- independent provider verification plus storefront verification that uniquely binds the rendered image to the intended asset;
- exactly one deterministic `fileUpdate` rollback to the approved before-alt value on verification failure;
- bounded provider/storefront rollback re-verification and then manual intervention, never a second rollback mutation;
- exact audit/idempotency lineage with no autonomous chaining or self-authorization.

P8.3 review work performed no Shopify/provider request, OAuth enrollment, credential/scope change, public-site write, action execution, verification/rollback mutation, persistence, Production DB read/write/DDL/DML, environment/config mutation, scheduler/worker activation, deployment or publication.

Detailed record:
- issue #291 — `P8.3A — Individual action-class review: product media alt text`
- `docs/p8-3-action-class-review.md`
- `.agents/memory/p8-3-action-class-review-closeout.md`

**Implementation blocker:** separate explicit authorization is required before engineering or enrolling a new isolated `write_files` credential/scope architecture for product-media-alt mutation. Generic `continue` does not cross this boundary.

At the P8.3 checkpoint, the default safe continuation while mutation authorization remained absent was to use non-mutating roadmap lanes. P9.1 has now completed in that safe lane as recorded above; P8.4–P8.8 remain blocked/planned and are not automatically unlocked.

## Previous engineering state — P8.2 complete

Roadmap **P8.2 — Read-only evidence/risk/preview/verification/rollback action cards v1** is complete under issue #288 / PR #289.

P8.2 extends the existing P8.1 `/governance` workspace with deterministic/read-only proposal action cards:
- uses only the existing P8.1 GET sources for opportunities, actions and approvals;
- creates one card per reconciled proposal and never fabricates a card for opportunity-only rows;
- preserves exact evidence count/sufficiency and quality status/score/approval-eligibility fields;
- keeps opportunity, evaluator, plan-control and effective-execution risk domains separate;
- displays `execution_authorized` and `public_site_writes` only as persisted descriptive flags;
- preserves exact current-vs-proposed values, including null versus empty-string distinction;
- displays rationale and expected benefit as source facts without converting them into recommendation or authorization;
- reports per-action verification detail as explicitly unavailable because the current governance GET contract exposes no per-action verification result/evidence record;
- treats recorded lifecycle, including `verified_result`, as descriptive lifecycle only and never as verification proof;
- treats `ProposalRecord.rollback` strictly as a rollback plan string, with rollback execution/status/result explicitly unavailable;
- adds deterministic action-card fingerprints, fail-closed missing/invalid display-fact validation, responsive semantic cards, closed-network browser assertions and continued Governance serious/critical axe coverage;
- adds no backend route, OpenAPI/schema change, mutation hook, database binding, provider request, execution, verification or rollback capability.

Certification:
- base SHA/tree: `d83e23554b3e4499ff83f2edc8e71c605c89f790` / `0ceded2440aa96f1b93f7d992b020adfc71ab9e2`;
- initial implementation head: `452f33a376d993ee6c529a6214b9d210757e00db`;
- PR CI #514 / run `35463018320`: failed only in the Governance Playwright test because `getByText("Old description")` matched both the existing pipeline and new action card; schema, Task, migration and workspace tests had passed;
- correction commit / exact tested PR head: `d02999c3dcae8552bbecde2de1c4a0f2cebdc82b`; the browser assertion was narrowed to exact card preview text with no product/model semantic change;
- PR CI #515 / run `35463135154`: success;
- implementation merge: `964e940d82f93dece9fbaaf56eca21782318e357`;
- implementation tree: `c07238481c5c3764d9b8087a462d24124e80eb08`;
- post-merge main CI #516 / run `35463259622`: success;
- Replit exact-synced on `main` at that merge/tree, ahead/behind `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P8.2 is **unpublished**. It performed no proposal edit/generation, approval grant/rejection, authorization renewal, execution, verification mutation, rollback mutation, provider/public-site request or write, persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- `.agents/memory/p8-2-governance-action-cards-closeout.md`
- `docs/p8-2-governance-action-cards.md`

At the P8.2 checkpoint, the default next safe boundary was **P8.3 individual bounded mutation-action-class review**. That review is now complete as recorded above; implementation remains blocked pending separate explicit authorization for a new isolated `write_files` scope/credential architecture.

## Previous engineering state — P8.1 complete

Roadmap **P8.1 — Unified opportunity → proposal → approval governance workspace v1** is complete under issue #285 / PR #286.

P8.1 adds a deterministic/read-only `/governance` workspace that unifies existing opportunity, proposal/action and approval state without creating a new control mechanism:
- uses only existing GET hooks for opportunities, actions and approvals;
- reconciles proposals to opportunities and approvals by exact IDs;
- duplicate IDs, dangling lineage and conflicting shared proposal/control fields fail closed;
- preserves opportunity-only rows as `not_ready`;
- exposes only descriptive review states: `not_ready`, `pending`, `approved`, `rejected`, and `revision_requested`;
- keeps opportunity score/confidence/risk, proposal before/proposed/evidence/quality, evaluator risk, plan-control risk and effective execution risk visibly distinct;
- treats `execution_authorized` and `public_site_writes` as persisted descriptive state only;
- explicitly states that recorded approval does not authorize execution;
- canonical row ordering is serialization only, not recommendation, priority or execution order;
- adds searchable/sortable DataGrid presentation, source links, responsive styling, browser closed-network coverage and serious/critical axe coverage;
- imports no mutation, approval, authorization, execution, rollback, verification, provider/site-write or persistence hook.

Certification:
- base SHA/tree: `ee91cddaa8b5795e926ac91bcefb7b2415877da1` / `12a112d9e38c1570137b049a06f0be9692193fca`;
- exact tested implementation head: `73f131e29ee36ebda21dc1a3ecec839beaa7a138`;
- PR CI #510 / run `35460580256`: success;
- implementation merge: `6dd42a2850713a4692039bb76900731129422061`;
- implementation tree: `e2c98d4d32b96a0d37ab01be4a81011f72dd944d`;
- post-merge main CI #511 / run `35460776543`: success;
- Replit exact-aligned on `main` at the merge/tree, ahead/behind `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P8.1 is **unpublished**. It performed no proposal edit, approval grant/rejection, authorization renewal, execution, rollback, verification action, live provider/public-site request or mutation, persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation, deployment or publication.

Detailed record:
- `.agents/memory/p8-1-governance-workspace-closeout.md`
- `docs/p8-1-governance-workspace.md`

At the P8.1 checkpoint, the default next safe milestone was **P8.2 — evidence/risk/preview/verification/rollback action cards**; that milestone is now complete as recorded above.

## Previous engineering state — P7.7 complete

Roadmap **P7.7 — AI Visibility production workspace v1** is complete under issue #282 / PR #283.

P7.7 replaces the previous `/ai-visibility` coming-soon placeholder with a production-quality deterministic/read-only workspace over synthetic P7.1–P7.6-shaped data:
- adds a dedicated frontend AI Visibility model with deterministic synthetic fixture validation;
- exposes P7.1 crawler accessibility and P7.2 prompt/topic-set coverage summary projections without implying consent, indexing, demand, popularity or priority;
- adds searchable/sortable P7.3 answer/brand/citation evidence, P7.4 citation/domain/competitor comparison, P7.5 score/history, and P7.6→P6.1 integration DataGrids;
- preserves null P7.5 score distinctly from numeric zero;
- renders history direction only as arithmetic delta and never labels it improvement/regression;
- preserves provider/model score-frame boundaries and makes no cross-provider winner/ranking claim;
- preserves P7.3 missing-mention-evidence and P7.4 citation-co-occurrence guardrails;
- requires explicit P7.6 integration provenance in the synthetic fixture and keeps P6.2 score unavailable, recommendation ungenerated and execution unauthorized;
- explicitly labels the workspace SYNTHETIC READ-ONLY, DEFAULT-OFF and LIVE DISABLED;
- adds responsive styling, deterministic model tests, browser search/sort/focus coverage and `/ai-visibility` serious/critical axe coverage;
- keeps the browser network boundary closed and introduces no backend/API schema/runtime binding.

Certification:
- base SHA/tree: `04a7e2fe151903598cc6ca9b5d8342fc7e1fb5ac` / `1ba613467f6745bb6f008da1ff3a8aeefec85629`;
- exact tested implementation head: `d03cca7a7787abaa2df8dd65ad40e1898bf383c3`;
- PR CI #505 / run `35457712689`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including the P7.7 model, Playwright/P4.10 browser suite including the AI Visibility workspace + axe route, typecheck and build;
- implementation merge: `c70118053ac8e86c284c9e5a151b6f26f52d05dc`;
- implementation tree: `2e64f6a33b298ea2b81d26a22123dce921832f36`;
- post-merge CI #506 / run `35457856132`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.7 is **unpublished**. It performed no live provider/AI request, credential use, public-site read/write, answer/citation collection, persistence, Production DB read/write/DDL/DML, P6 scoring/prioritization/actionability/execution, scheduler/worker/retry activation, approval grant, automatic transition, environment/secret/config mutation, deployment or publication.

**Phase P7 is complete.**

Detailed record:
- `.agents/memory/p7-7-ai-visibility-workspace-closeout.md`
- `docs/p7-7-ai-visibility-workspace.md`

At the P7.7 checkpoint, the default next safe milestone was **P8.1 — unify opportunity → proposal → approval UI around existing control primitives**; that milestone is now complete as recorded above.

## Previous engineering state — P7.6 complete

Roadmap **P7.6 — AI/GEO opportunity integration** is complete under issue #279 / PR #280.

P7.6 adds a pure deterministic lineage bridge from exact certified P7 evidence into P6.1-compatible AI opportunities:
- reconstructs exact P7.5 scoring/history before integration and fails closed on tampered lineage; P7.5 transitively revalidates P7.4/P7.3/P7.2;
- requires an explicit integration request for every projected opportunity; score magnitude, score threshold, history delta, comparison count, mention count or citation count never auto-generates a gap;
- supports only existing certified P6 AI kinds `ai_visibility_gap` and `ai_citation_gap`, both under family `ai`;
- binds requests to exact P7.5 snapshot/score and exact P7.4 comparison fingerprints;
- visibility-gap requests reject citation pair/domain claims;
- citation-gap requests require an exact pair involving the selected score brand plus exact selected P7.4 domain summaries from that pair's citation-domain co-occurrence evidence;
- projects P7.5 score, P7.4 comparison/pair/domain-summary and exact P7.3 score-component observation fingerprints as P6.1 `ai_visibility` evidence;
- preserves P7.3 observation timestamps while leaving derived P7.4/P7.5 artifact `observedAt` null;
- uses only explicitly supplied P6 market/category fingerprints and never maps P7 language/market keys into P6 scope;
- preserves unscorable P7.5 state as null, carries exact missing P7.5 component codes in lineage, and projects only deterministic P6 missing-evidence code `p7.5.unscorable_score`;
- never reuses P7.5 `score100` as P6.2 scoring and never maps P7.5 components to P6 impact/confidence/risk/effort/freshness;
- performs no P6.2 scoring, P6.3 prioritization, P6.4 explanation, P6.5 actionability, P6.6 preview or P6.7 lifecycle transition;
- rejects duplicate normalized integration keys and duplicate exact P6.1 opportunity projections;
- preserves P7.4 citation-co-occurrence and P7.3 missing-mention-evidence guardrails;
- emits deterministic lineage, P6.1 opportunity, integration and report fingerprints.

Certification:
- base SHA/tree: `a5eb291d862b667041aed49a00e0001de79f967f` / `302997086f8077af73ee37d42b9cd357f8f1b7b9`;
- exact tested implementation head: `1bc0334c754d2e11c8444d4ac2efd6827b48a8ad`;
- PR CI #501 / run `35452690292`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P7.6, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `2a375966f943f67c5dc606c9e9257585b3e4824f`;
- implementation tree: `6300a641327c0064b880d99c6c61a1c877e0afc4`;
- post-merge CI #502 / run `35452920099`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.6 is **unpublished**. It performed no live provider/AI request, credential use, source admission, opportunity/score persistence, Production DB read/write/DDL/DML, P6 scoring/prioritization/actionability/execution, scheduler/worker/retry activation, approval grant, public-site mutation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p7-6-ai-geo-opportunity-integration-closeout.md`
- `docs/p7-6-ai-geo-opportunity-integration.md`

At the P7.6 checkpoint, the default next safe milestone was **P7.7 — AI Visibility production workspace**; that milestone is now complete as recorded above.

## Previous engineering state — P7.5 complete

Roadmap **P7.5 — AI visibility scoring/history** is complete under issue #276 / PR #277.

P7.5 adds a pure deterministic scoring/history layer over exact P7.4/P7.3/P7.2 lineage:
- reconstructs the exact P7.4 comparison report before scoring and fails closed on tampered lineage;
- binds every score to explicit comparison, provider/model, tracked brand and P7.2 prompt-set identities;
- derives a stable comparison-frame fingerprint from explicit comparison membership so evidence changes can form history without hiding exact snapshot/report lineage;
- accepts only caller-supplied normalized weighted components with unique component codes, explicit weights, values in [0,1] or null, caller-owned basis codes and exact P7.3 observation evidence;
- requires non-null component evidence to belong to the exact provider/model and prompt-set scope;
- requires component weights to sum to 1 under fixed six-decimal normalization;
- computes transparent `score01 = Σ(weight × value)` and `score100 = score01 × 100`;
- preserves zero as a valid value distinct from null; any null required component makes the combined score unscorable/null and exposes missing component codes;
- never derives component values automatically from P7.3/P7.4 answer/mention/citation/domain/comparison counts;
- groups history only across exact score-key/site/comparison-frame/provider/model/brand/prompt-set/profile identities;
- emits only arithmetic `increased / decreased / unchanged / indeterminate` deltas and explicitly does not interpret direction as improvement/regression;
- makes no cross-provider/model normalized comparison, provider winner, market-share, preference, rank, quality, correctness, recommendation or execution-priority claim;
- preserves P7.4 citation-co-occurrence and P7.3 missing-mention-evidence guardrails;
- generates no P7.6 opportunity.

Certification:
- base SHA/tree: `6f8841688b9897fd65daf5a8a7d8c0890ca5503f` / `25c1bf64ca3e2cc3a911bdb7c8d1dbe7cecebf59`;
- initial implementation head: `ed6b803d74b779f53d7f6e78576fadcb88c3e051`;
- PR CI #496 / run `35451270712`: failed in workspace tests because one assertion expected the less-specific unknown-brand error and the snapshot-limit fixture constructed invalid pre-reference snapshots before reaching the limit guard;
- correction commit/head: `f25d2d912e86a59998e1e8dd4342cf70c54afeac`; validation ordering now reports unknown brand before comparison-membership rejection and the snapshot-limit fixture now reaches the intended bound guard; scoring/history semantics were unchanged;
- exact tested PR CI #497 / run `35451398466`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P7.5, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `5a378eb72471aa7697011c814a7703213f5ed8ed`;
- implementation tree: `36e878daebc1c687b808b001d22bdf50b284548d`;
- post-merge CI #498 / run `35451526600`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.5 is **unpublished**. It performed no live AI/provider request, credential use, source admission, score/history persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, opportunity generation, approval grant, public-site mutation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p7-5-ai-visibility-scoring-history-closeout.md`
- `docs/p7-5-ai-visibility-scoring-history.md`

At the P7.5 checkpoint, the default next safe milestone was **P7.6 — AI/GEO opportunity integration**; that milestone is now complete as recorded above.

## Previous engineering state — P7.4 complete

Roadmap **P7.4 — citation/domain/competitor comparison** is complete under issue #273 / PR #274.

P7.4 adds a pure deterministic comparison layer over exact P7.3 supplied-observation records:
- reconstructs the exact P7.3 collection and requires complete canonical equality before comparison;
- preserves exact P7.2 prompt/topic lineage transitively through P7.3;
- accepts only explicit caller-supplied comparison groups containing one tracked subject brand and one or more tracked competitor brands;
- never infers competitor identity from answer text, brand labels, topics, citation domains, provider/model identity, market data or external knowledge;
- compares only explicit positive P7.3 brand-mention evidence and never treats missing supplied mention evidence as proof of semantic brand absence;
- derives deterministic subject/competitor observation sets, shared positive-evidence observation sets and evidence-only differences;
- derives citation-domain co-occurrence only from citations appearing in observations that also carry explicit brand-mention evidence;
- explicitly states that citation-domain co-occurrence does not prove brand support, endorsement, association, authority, trust or factual support;
- emits deterministic descriptive domain summaries with citation count, distinct observation count and exact citation/provider/prompt/topic provenance;
- emits deterministic pair/group/report fingerprints and bounded counts;
- selects no winner, produces no ranking, makes no market-share or quality claim, performs no cross-provider normalized metric comparison, and generates no P7.5 visibility score/history or P7.6 opportunity.

Certification:
- base SHA/tree: `de4d6df160d95ef13d6dd7dc6b358b1eadcfdd36` / `1200efff9d1e6bee23f654337bbcf5d2e724fcfd`;
- exact tested implementation head: `8c5ba7ff86d28e6b77c67d26db32a10031b4c4ef`;
- PR CI #492 / run `35449557160`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P7.4, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `3e34b7e151a0e5669b986e377dded16c53f86073`;
- implementation tree: `cb0403478f20e6aae1847d6d2d9fa58cdc54af19`;
- post-merge CI #493 / run `35449745409`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.4 is **unpublished**. It performed no live AI/provider request, credential use, answer-text mining, citation fetch, source admission, comparison/domain persistence, Production DB read/write/DDL/DML, visibility scoring, scheduler/worker/retry activation, approval grant, public-site mutation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p7-4-ai-citation-competitor-comparison-closeout.md`
- `docs/p7-4-ai-citation-competitor-comparison.md`

At the P7.4 checkpoint, the default next safe milestone was **P7.5 — AI visibility scoring/history**; that milestone is now complete as recorded above.

## Previous engineering state — P7.3 complete

Roadmap **P7.3 — AI answer/brand/citation visibility collection strategy** is complete under issue #270 / PR #271.

P7.3 adds a pure deterministic provider-neutral normalization contract over exact P7.2 lineage and supplied/synthetic collection observations:
- reconstructs the exact P7.2 prompt/topic model and requires complete canonical equality before accepting observations;
- binds every observation to an exact P7.2 prompt key/fingerprint and inherits exact prompt topic lineage rather than re-inferring topics;
- accepts only explicit caller-supplied opaque provider/model identities and never infers provider capability, quality, policy, market share, freshness or recommendation;
- accepts only explicit caller-supplied tracked-brand definitions and explicit supplied mention records; it performs no answer-text brand mining or alias discovery;
- uses deterministic answer states `answered`, `refused`, `unavailable`, and `error`;
- requires answered observations to carry bounded exact answer text and requires non-answered observations to carry no answer text, mention records or citation records;
- preserves answer text and matched mention text exactly after bounded control-character validation;
- accepts only HTTP(S) citation URLs, rejects URL credentials, removes fragments, normalizes via the platform URL parser, and exposes lower-cased hostname as descriptive citation domain;
- collapses exact repeated mention/citation records deterministically and fails closed on conflicting citation title metadata for one normalized URL;
- validates canonical collection/observation timestamps with no wall-clock dependency;
- emits deterministic provider/model/brand/mention/citation/observation/report fingerprints and descriptive counts;
- explicitly states that answer observation does not imply correctness, mention does not imply recommendation/sentiment/prominence/preference, absent mention evidence does not prove absence, and citation presence does not imply endorsement/authority/trust/support;
- explicitly states that collection does not imply indexing/crawler accessibility, makes no cross-provider comparability claim, performs no P7.4 domain/competitor comparison, no P7.5 visibility scoring/history and no P7.6 opportunity generation.

Certification:
- base SHA/tree: `d325d46010c36764a8be14af8c697e627f8e69b2` / `2721afdea15f59a29fb4f2e5334b41f25a8d0641`;
- exact tested implementation head: `4313d5df785d43245d0f327265897a29c915a0cf`;
- PR CI #488 / run `35447907730`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P7.3, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `399a6b946b213b2e8aff9416ca5287896476fe48`;
- implementation tree: `35d337012c4865e162e606f505d3ea63660e4e09`;
- post-merge CI #489 / run `35448044951`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.3 is **unpublished**. It performed no live AI/provider request, credential use, provider selection, source admission, prompt/answer/mention/citation persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, approval grant, public-site mutation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p7-3-ai-answer-visibility-collection-closeout.md`
- `docs/p7-3-ai-answer-visibility-collection.md`

At the P7.3 checkpoint, the default next safe milestone was **P7.4 — citation/domain/competitor comparison**; that milestone is now complete as recorded above.

## Previous engineering state — P7.2 complete

Roadmap **P7.2 — prompt/topic set model** is complete under issue #267 / PR #268.

P7.2 adds a pure deterministic supplied-definition catalog:
- accepts only explicit caller-supplied topics, prompts and prompt sets under a canonical site/reference frame;
- normalizes only opaque keys/codes while preserving topic/set labels and prompt text exactly;
- validates explicit topic parent relationships, requiring known parents and rejecting self-parenting or hierarchy cycles;
- never infers topic relationships from labels, prompt text, keyword similarity or embeddings;
- requires every prompt to reference one or more known topics and deterministically dedupes/sorts repeated topic references;
- treats caller-owned intent/language/market codes as opaque normalized labels and never infers those attributes from prompt text;
- requires every prompt set to reference one or more known prompts and deterministically dedupes/sorts repeated prompt references;
- derives descriptive set-level topic coverage only as the exact union of referenced prompt topic keys;
- rejects duplicate normalized topic, prompt or set keys rather than silently merging definitions;
- emits deterministic topic, prompt, set and report fingerprints plus bounded reference/count summaries;
- explicitly states that prompt/set membership does not imply demand, popularity, search volume, priority, AI visibility, answer inclusion, citation, ranking or recommendation;
- performs no prompt generation/expansion/rewriting, embedding generation, provider/model request, answer/citation collection, visibility scoring or opportunity generation.

Certification:
- base SHA/tree: `3c46105da8daaa6464c5f012e6c20d991b83db0f` / `d3b2ebea2e2a0a8f54c0b7e4d740deb578d7f2f7`;
- exact tested implementation head: `a10bedcec52baa16507ee8715d439cc672f15254`;
- PR CI #484 / run `35445344907`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P7.2, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `ecee3e9796c04c25f3c800e73e621c2cef299666`;
- implementation tree: `78384a93df0a3d66beba03d0e06b83a5ba57bd11`;
- post-merge CI #485 / run `35445482575`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.2 is **unpublished**. It performed no provider/AI/embedding request, credential use, source admission, prompt/topic persistence, answer/citation collection, Production DB read/write/DDL/DML, scheduler/worker/retry activation, approval grant, public-site mutation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p7-2-ai-prompt-topic-model-closeout.md`
- `docs/p7-2-ai-prompt-topic-model.md`

At the P7.2 checkpoint, the default next safe milestone was **P7.3 — AI answer/brand/citation visibility collection strategy**; that milestone is now complete as recorded above.

## Previous engineering state — P7.1 complete

Roadmap **P7.1 — AI crawler/bot accessibility audit** is complete under issue #264 / PR #265.

P7.1 adds a pure deterministic supplied-evidence accessibility audit:
- accepts only caller-supplied exact bot identity, user-agent, site-relative path and evidence observations;
- performs no live crawl, robots.txt fetch, vendor-policy lookup, AI/provider request or credential use;
- validates canonical audit/observation timestamps and rejects future observations;
- preserves exact caller-supplied user-agent/path while normalizing only opaque site/bot keys;
- treats supplied robots policy as `allowed`, `disallowed`, or `unknown` without implementing a hidden robots.txt parser;
- classifies exact observations with fixed precedence: explicit robots/HTTP access denial → `blocked`; 404/410 → `unavailable`; challenge/429/unresolved 3xx → `limited`; explicit robots allow + 2xx + body available → `accessible`; otherwise `indeterminate`;
- retains all applicable diagnostics even when a higher-precedence status wins;
- collapses exact duplicate observations only when their normalized metadata match and fails closed on conflicting duplicate evidence;
- rejects conflicting user-agent identities under one normalized bot key;
- produces deterministic per-bot summaries, including `mixed` when probe states differ;
- explicitly states that robots allowance is not training consent/license and accessibility is not proof of indexing, citation or AI-answer visibility;
- never infers vendor intent, page meta/X-Robots semantics, recommendations, prompt/topic sets, AI-answer collection, visibility scores or AI/GEO opportunities.

Certification:
- base SHA/tree: `5ffb308a0a606b2514c3aaa8d443b8e382679e65` / `b6c3dcc81984059cb44f953f440fe567d7bdb992`;
- exact tested implementation head: `1525569d0f917e0760dc3aa53823a37ef0f6fdaa`;
- PR CI #480 / run `35442537775`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P7.1, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `74e5de6518359f9f92b2e73edd5d44f02eecffa2`;
- implementation tree: `6dfd2b5179b489367858ca2092000a9e0292415f`;
- post-merge CI #481 / run `35442677104`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P7.1 is **unpublished**. It performed no live crawl, robots.txt fetch, provider/AI request, credential use, source admission, observation/accessibility persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, approval grant, public-site mutation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p7-1-ai-crawler-accessibility-closeout.md`
- `docs/p7-1-ai-crawler-accessibility.md`

At the P7.1 checkpoint, the default next safe milestone was **P7.2 — prompt/topic set model**; that milestone is now complete as recorded above.

## Previous engineering state — P6.7 complete

Roadmap **P6.7 — opportunity lifecycle/history** is complete under issue #261 / PR #262.

P6.7 adds a pure deterministic lifecycle/history ledger over exact P6.6/P6.5 lineage:
- reconstructs the exact P6.6 report before lifecycle processing, transitively retaining P6.5/P6.4/P6.3/P6.2/P6.1 integrity checks;
- emits one lifecycle record for every exact current P6.5 actionability decision whether or not P6.6 preview data exists;
- uses neutral `observed` only to mean presence in the certified snapshot with no supplied lifecycle transition;
- accepts only explicit caller-supplied ordered lifecycle events; actionability, score, rank, explanation and preview differences never infer lifecycle changes;
- defines deterministic states `observed`, `active`, `deferred`, `dismissed`, `closed`, and `superseded`;
- requires contiguous event sequences and canonical caller-supplied timestamps bounded by a deterministic `historyReferenceTime`, with no wall-clock dependency;
- permits deferred → active only through an explicit later `activate` event;
- makes `dismissed`, `closed`, and `superseded` terminal so stale exact fingerprints cannot silently reactivate;
- treats `closed` as administrative lifecycle closure only, not proof of implementation, issue resolution or verification;
- requires supersession to explicitly name another exact current opportunity fingerprint, rejects self/dangling targets, and rejects supersession cycles;
- never infers supersession from subject/family/kind/evidence/score/preview similarity;
- preserves exact actionability and associated preview lineage without copying approval/execution/apply authority;
- emits deterministic event, lifecycle-record and report fingerprints plus per-state/event counts.

Certification:
- base SHA/tree: `04f458d6b0eecdd5c09d7cc85543d65e5c2ffabd` / `6b9184f65fe5b88aa427d613378effbf1d9f8ead`;
- exact tested implementation head: `56f5ba6f6aa33378f7e4cc39ba34ba6a923866e4`;
- PR CI #476 / run `35440752266`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.7, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `d587a1cc7737c87e09b5bdb827b1cc80170c8a8b`;
- implementation tree: `5e410bc0b5cd6953d769fe336407d4e6491d222d`;
- post-merge CI #477 / run `35440907498`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P6.7 is **unpublished**. It performed no provider/AI request, credential use, current-site fetch, public-site read/write, source admission/refresh-plan mutation, Task #64/#70 execution, approval grant, observation/evidence/score/priority/explanation/actionability/preview/lifecycle persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, automatic lifecycle transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p6-7-opportunity-lifecycle-closeout.md`
- `docs/p6-7-opportunity-lifecycle.md`

**Phase P6 — Opportunity and recommendation engine is now complete through P6.7.**

At the P6.7 checkpoint, the default next safe milestone was **P7.1 — AI crawler/bot accessibility audit**; that milestone is now complete as recorded above.

## Previous engineering state — P6.6 complete

Roadmap **P6.6 — current-vs-proposed preview/diff generation** is complete under issue #258 / PR #259.

P6.6 adds a pure deterministic preview layer over exact P6.5 actionability lineage:
- reconstructs the exact P6.5 report before preview generation, transitively retaining P6.4/P6.3/P6.2/P6.1 integrity checks;
- accepts only explicitly caller-supplied preview entries bound to exact opportunity and actionability fingerprints;
- never discovers current site state and never generates proposed content;
- preview coverage is optional; absent previews are not fabricated;
- normalizes only preview/field keys while preserving current/proposed values exactly;
- keeps null distinct from empty string;
- uses exact field statuses: unchanged, added, removed, modified;
- rejects duplicate normalized preview keys per opportunity and duplicate normalized field keys within a preview;
- preserves P6.5 informational/recommend/approval/blocked classification without modifying governance state;
- permits inspection of blocked previews without implying actionability or apply permission;
- emits deterministic field/preview/report counts and fingerprints;
- explicitly treats proposed state as neither applied, approved, recommended, better, safe nor valid;
- generates no patch/apply instruction and hard-codes `applyAuthorized=false`;
- performs no lifecycle/history inference; P6.7 owns that boundary.

Certification:
- base SHA/tree: `c05d7eeb986eaf9fe38669a337f76e9b31b803cb` / `ba1a88da701d1b2860264157c81385505a0413d7`;
- initial implementation commit: `af8c8850ea4f168c063032db3f4b2b678eb2de3b`;
- serialization-hygiene commit: `07dfa68650902aec525609018d7cf15050940c5e`;
- first PR CI #471 / run `35438506383` failed one P6.6 test because the test assumed subject order instead of canonical P6.5 decision order; implementation semantics were correct and no merge occurred;
- corrected exact tested head: `c5ae9c78044970c911379f411482901a6a29fdb5`;
- corrected PR CI #472 / run `35438598540`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.6, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `6f650c985dfd7e8097d2f030704c1841126b587a`;
- implementation tree: `25f971bae389a6896a8ee6f0a7df78c37a362974`;
- post-merge CI #473 / run `35438728623`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P6.6 is **unpublished**. It performed no provider/AI request, credential use, current-site fetch, public-site read/write, source admission/refresh-plan mutation, Task #64/#70 execution, approval grant, observation/evidence/score/priority/explanation/actionability/preview persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, automatic apply/transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p6-6-opportunity-preview-diff-closeout.md`
- `docs/p6-6-opportunity-preview-diff.md`

At the P6.6 checkpoint, the default next safe milestone was **P6.7 — opportunity lifecycle/history**; that milestone is now complete as recorded above.

## Previous engineering state — P6.5 complete

Roadmap **P6.5 — actionability classifier: informational / recommend / approval / blocked** is complete under issue #255 / PR #256.

P6.5 adds a pure deterministic governance-classification layer over exact P6.4 explanation lineage:
- reconstructs the complete canonical P6.4 report before classification, transitively retaining P6.3/P6.2/P6.1 integrity checks;
- requires exactly one explicit policy entry for every P6.4 explanation item; missing, unknown or duplicate policy coverage fails closed;
- accepts only explicit `recommendationAllowed`, `approvalRequired` and bounded normalized caller-owned `blockCodes`;
- never infers actionability from opportunity family/kind/subject text, evidence text/type, P6.2 score, P6.3 advisory rank, missing-evidence code or semantic-guard text;
- classifies with exact precedence: explicit block or inherited P6.3 suppression → `blocked`; otherwise approval-required → `approval`; otherwise recommendation-allowed → `recommend`; otherwise `informational`;
- preserves P6.3 suppression/conflict state, so unresolved equal-top conflicts remain blocked and P6.5 never invents a winner;
- treats `approval` strictly as “approval required,” never approval granted;
- treats `recommend` as advisory only, never execution authorization;
- gives `informational` no implicit escalation;
- emits deterministic normalized policy, decision fingerprints, state counts and report fingerprint;
- hard-codes `approvalGranted=false`, `executionAuthorized=false` and `automaticTransitionAuthorized=false` on every actionability decision;
- generates no recommendation prose, current-vs-proposed diff or lifecycle inference.

Certification:
- base SHA/tree: `153c5c423443c746085c6c7893c1f0893cff6e1d` / `a07d8fb5388d451dc4b10e1a4e7ff63a099fd194`;
- initial implementation commit: `cc2ec0bec86e3992966166f3500fde8015df1dd6`;
- pre-PR test-only cleanup removed an unused fixture helper; no P6.5 semantics changed;
- exact tested implementation head: `abd73c795b061d7f31b7e6c95a3a8811d702c431`;
- PR CI #467 / run `35435400355`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.5, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `0a306365d8f0e23f203e4dc9c59afed0c04c586f`;
- implementation tree: `d776c241f8884e2f83d3aa6db3d212c9da30de1c`;
- post-merge CI #468 / run `35435517215`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal tooltip/sheet sourcemap messages and chunk-size warning only.

P6.5 is **unpublished**. It performed no provider/AI request, credential use, public-site read/write, source admission/refresh-plan mutation, Task #64/#70 execution, approval grant, observation/evidence/score/priority/explanation/actionability persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, automatic transition, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p6-5-opportunity-actionability-closeout.md`
- `docs/p6-5-opportunity-actionability.md`

At the P6.5 checkpoint, the default next safe milestone was **P6.6 — current-vs-proposed preview/diff generation**; that milestone is now complete as recorded above.

## Previous engineering state — P6.4 complete

Roadmap **P6.4 — explanation/evidence generation** is complete under issue #252 / PR #253.

P6.4 adds a pure deterministic explanation/evidence projection over exact P6.1 opportunities, P6.2 scores and P6.3 prioritization decisions:
- requires the exact P6.3 collection input plus the exact canonical P6.3 report and re-runs P6.3 before explaining anything;
- reconstructs each unique P6.1 opportunity and P6.2 score and fails closed on tampered lineage;
- emits one deterministic explanation item per unique P6.3 decision without re-ranking, re-suppressing or choosing a new conflict winner;
- mirrors exact P6.3 decision status, advisory rank/tie count, conflict key, explicit suppression codes and system suppression reasons;
- projects the exact P6.2 score status, score values, formula, blockers and all five component values/basis codes;
- retains the exact P6.2 evidence basis fingerprints on every non-null component statement while null components remain unavailable with no claimed evidence basis;
- projects every P6.1 evidence reference as an evidence card and reverse-maps only the P6.2 score dimensions that explicitly cite that fingerprint;
- preserves P6.1 missing-evidence codes and semantic guards explicitly, including provider-native/non-comparable and descriptive-only boundaries;
- uses fixed deterministic English templates only; there is no freeform/LLM inference;
- generates no causal outcome claim, SEO recommendation, actionability classification, current-vs-proposed diff or lifecycle inference;
- gives statements, explanation items and the whole report deterministic fingerprints;
- inherits P6.3 decision serialization only for deterministic output order and does not turn equal-score serialization into a new preference.

Certification:
- base SHA/tree: `72c2daf503cc475ceb4d684b894735453b1b62e6` / `fd802bd4c4b5407fa7a2e7c8f919d00e78e73b46`;
- initial implementation commit: `5aed992ca924e6405a1342be9d26e84783c0b598`;
- pre-PR fixture corrections aligned evidence-card assertions with P6.1 canonical evidence ordering and allowed the required negative semantic-guard phrase “not a recommendation by itself” without weakening the no-prescriptive-language test;
- pre-PR TypeScript fixture correction made null/undefined narrowing explicit without changing P6.4 semantics;
- exact tested implementation head: `1a07f0e9e482e800e17ca308252bff2cdba3a165`;
- PR CI #463 / run `35433617406`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.4, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `b3b83e36ba6bb0c5461396eb2a2b1aa33e62762f`;
- implementation tree: `6ab4bac7d8613088a01856c061229e17dd938321`;
- post-merge CI #464 / run `35433777998`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal build chunk-size warning only.

P6.4 is **unpublished**. It performed no provider/AI request, credential use, public-site read/write, Task #67 Production source admission or refresh-plan mutation, Task #64/#70 execution, observation/evidence/score/priority/explanation persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p6-4-opportunity-explanation-closeout.md`
- `docs/p6-4-opportunity-explanation.md`

At the P6.4 checkpoint, the default next safe milestone was **P6.5 — actionability classifier**; that milestone is now complete as recorded above.

## Previous engineering state — P6.3 complete

Roadmap **P6.3 — conflict/dedupe/suppression/prioritization** is complete under issue #249 / PR #250.

P6.3 adds a pure deterministic collection-policy layer over exact P6.1 opportunities and exact P6.2 scores:
- revalidates the complete canonical P6.1 record and reconstructs the complete canonical P6.2 score before collection processing;
- requires one exact P6.1 reference time and one exact market/category scope per collection; mixed snapshots/scopes fail closed;
- collapses exact duplicate opportunity rows only when score/conflict/suppression metadata is identical;
- rejects the same opportunity fingerprint when score or policy metadata conflicts instead of silently choosing one version;
- preserves bounded caller-supplied suppression codes as visible audit metadata rather than deleting rows;
- suppresses P6.2 unscorable rows from ranking and never fabricates a replacement score;
- recognizes mutual exclusion only through an explicit normalized conflict key and never infers conflict from family, kind, subject or shared evidence;
- keeps a unique highest P6.2 score eligible inside an explicit conflict while suppressing lower-scored active members;
- leaves an equal highest-score conflict unresolved with no fingerprint/order/family/kind tiebreak winner;
- applies dense priority ranks to remaining eligible rows by canonical P6.2 `score100` descending; equal non-conflicting scores share the same rank;
- treats deterministic fingerprint ordering only as serialization order, not as preference;
- does not infer lifecycle supersession/history; P6.7 owns that boundary;
- produces advisory prioritization only, not execution order, recommendation text or actionability classification.

Certification:
- base SHA/tree: `5efea32b93a0e8f2daa6693a6c5d7faefec6e757` / `ee59b670755addad1b1662aed254609764f0a4d6`;
- pre-PR implementation commit: `f428a9e523ef0203a8fbc63941af567a9396dbbd`;
- pre-PR type-safety correction: canonical serialization was made total for `undefined`; no P6.3 collection semantics changed;
- exact tested implementation head: `20fa4ba5159840d94d36a2900a1d4f687e2cf23e`;
- PR CI #459 / run `35432176194`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.3, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `06739367624018c501a11459881462e2be480657`;
- implementation tree: `b8f4ff628d55cf94c0664583c4ad83c86f9f5c2e`;
- post-merge CI #460 / run `35432288284`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal build chunk-size warning only.

P6.3 is **unpublished**. It performed no provider enrollment/purchase/credential use/request, public-site read/write, Task #67 Production source admission or refresh-plan mutation, Task #64/#70 execution, observation/evidence/score/priority persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p6-3-opportunity-prioritization-closeout.md`
- `docs/p6-3-opportunity-prioritization.md`

At the P6.3 checkpoint, the default next safe milestone was **P6.4 — explanation/evidence generation**; that milestone is now complete as recorded above.

## Previous engineering state — P6.2 complete

Roadmap **P6.2 — impact × confidence × risk × effort × freshness scoring** is complete under issue #246 / PR #247.

P6.2 adds a pure deterministic scoring kernel over exact P6.1 unified opportunity records without changing the legacy opportunity engine:
- models `impact`, `confidence`, `risk`, `effort`, and `freshness` as explicit normalized `[0,1]` components supplied by defensible upstream/family-specific adapters;
- computes `score01 = impact × confidence × freshness × (1 - risk) × (1 - effort)` and `score100 = score01 × 100`;
- keeps `0` as a valid scored value and `null` as unavailable/unscorable; any missing required component makes the combined score null instead of fabricating a neutral replacement;
- requires every non-null component to cite bounded evidence fingerprints that exist on the exact P6.1 record, with deterministic dedupe/order and a deterministic score fingerprint;
- reconstructs the P6.1 record and fails closed if its canonical opportunity ID/fingerprint no longer matches;
- inherits P6.1 semantic guards so provider-native keyword difficulty/backlink authority, request-frame trends, competitor visibility and descriptive telemetry are not silently converted into false cross-provider comparisons;
- scores one opportunity at a time only; P6.3 retains collection conflict/dedupe/suppression/prioritization, P6.4 explanation generation, and P6.5 actionability classification;
- preserves the legacy opportunity-engine `{ demand, proximity, confidence, evidence }` score unchanged.

Certification:
- base SHA/tree: `70137fa940a9f4a733cfe4506efca351813e47db` / `377a6a5b48ce948baf9516b95c82cc18b7d16fc5`;
- initial PR head `f5f4267ed330769531a25e0e35b5a2766ae914d9`, CI #454 / run `35430506731`: workspace validation exposed an over-broad static anti-persistence test that falsely matched `crypto.createHash(...).update(...)`; no merge occurred;
- exact tested implementation head: `e2bdcead7aa9603305ade20ed86c62a10afcb2c5`;
- PR CI #455 / run `35430608270`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.2, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `0bc3745e978fd57b944123283d3f54dd7e1dd3fb`;
- implementation tree: `d20788070aecd9732fe5857e69e8b1baf354b3da`;
- post-merge CI #456 / run `35430704830`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked, with no Replit-only commit or non-Git mutation;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal build chunk-size warning only.

P6.2 is **unpublished**. It performed no provider enrollment/purchase/credential use/request, public-site read/write, Task #67 Production source admission or refresh-plan mutation, Task #64/#70 execution, observation/evidence/score persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation or publication.

Adjacent review: `plausible/analytics` was inspected as requested. Its main application is AGPL-3.0-or-later, while `tracker/npm_package` carries an MIT license. No Plausible code was imported. Funnel/goal, UTM/referrer, filtered breakdown/time-series and lightweight first-party event concepts are potentially useful later in P10 measurement/learning; any direct reuse remains a separate licensing/architecture decision.

Detailed record:
- `.agents/memory/p6-2-opportunity-scoring-closeout.md`
- `docs/p6-2-opportunity-scoring.md`

At the P6.2 checkpoint, the default next safe milestone was **P6.3 — conflict/dedupe/suppression/prioritization**; that milestone is now complete as recorded above.

## Previous engineering state — P6.1 complete

Roadmap **P6.1 — unified opportunity types across technical/content/query/competitor/link/AI** is complete under issue #243 / PR #244.

P6.1 adds a pure deterministic classification/provenance layer over existing evidence families without changing the legacy opportunity engine:
- defines six canonical families: `technical`, `content`, `query`, `competitor`, `link`, and `ai`;
- assigns every P6.1 opportunity kind to exactly one family;
- maps the existing legacy `organic_ctr`, `striking_distance`, `technical_remediation`, `internal_link`, and `content_alignment` types without changing their score, confidence, risk, generation, persistence, OpenAPI or UI semantics;
- preserves caller-owned subject identity instead of silently recanonicalizing URL/domain/query/page identities from earlier modules;
- carries bounded evidence references across crawl/page, GSC query, technical issue, P5.2 SERP, P5.3 keyword, P5.4 trend, P5.5 backlink, P5.6 competitor, P5.8 telemetry and future AI visibility evidence;
- keeps exact duplicate evidence deterministic while conflicting metadata for one fingerprint fails closed;
- rejects contradictory non-null market/category scope and future/malformed evidence lineage;
- emits explicit semantic guards for P5 provider-specific/non-comparable and descriptive-only semantics, null-vs-zero and missing-evidence honesty;
- contains no impact/confidence/risk/effort/freshness score, combined priority, ranking or recommendation generation; P6.2 owns that next layer.

Certification:
- base SHA/tree: `5b5390220fb2ba2c4779d560f1066e3e028aca54` / `7b78237af4bf721245a66a94fab1656c14fc1555`;
- exact tested implementation head: `0a8befd87412bc50ec24658809402c79adf404cd`;
- PR CI #450 / run `35401511588`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P6.1, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `6d979eba38a56b629c9fe96d7921eac4449b8f60`;
- implementation tree: `af4be14b0d8827865ee3051dcb33c5c8596636eb`;
- post-merge CI #451 / run `35401722129`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal build chunk-size warning only.

P6.1 is **unpublished**. It performed no provider enrollment/purchase/credential use/request, public-site read/write, Task #67 Production source admission or refresh-plan mutation, Task #64/#70 execution, observation/evidence persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p6-1-unified-opportunity-types-closeout.md`
- `docs/p6-1-unified-opportunity-types.md`

At the P6.1 checkpoint, the default next safe milestone was **P6.2 — impact × confidence × risk × effort × freshness scoring**; that milestone is now complete as recorded above.

## Previous engineering state — P5.8 complete

Roadmap **P5.8 — source quality/cost/rate-limit telemetry** is complete under issue #240 / PR #241.

P5.8 adds a deterministic supplied-input-only telemetry report over exact Task #67 source descriptors and the existing dated P5.1 provider review:
- validates exact Task #67 source ID/fingerprint by reconstructing each descriptor;
- defines one telemetry stream per source fingerprint + signal type + optional P5.1 provider key;
- preserves Task #68 success/partial/empty/error completeness and confidence semantics;
- reports transparent success/usable/error/completeness/confidence/positive-evidence statistics without a proprietary source rank;
- accepts numeric monetary/billing-unit cost only when explicitly supplied on telemetry events;
- preserves null cost vs zero cost, rejects mixed currencies/units and performs no FX;
- never derives numeric spend from P5.1 prose pricing;
- joins P5.1 pricing model, relative-cost class, reliability evidence class and review freshness as metadata only;
- classifies supplied rate-limit capacity as unavailable/available/elevated/constrained/exhausted with transparent utilization;
- never uses rate-limit telemetry to throttle, retry, schedule, execute or reorder Task #67 work;
- emits deterministic diagnostics for missing/partial telemetry and stale provider review;
- enforces hard source/stream/event/snapshot bounds and deterministic report lineage.

Certification:
- base SHA/tree: `cce0217f3c3c8158ae3a7f6836244eba39db8a74` / `6ad6ed0486e743cc491d65f80c5ac857b5718b65`;
- exact tested implementation head: `24a28000e11bf9de67313904652a4fc65b48927b`;
- PR CI #446 / run `35396675109`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests including P5.8, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `56b2f8e9dd4e6cc4934c2ab55c549ea6284d59d3`;
- implementation tree: `f3d749819741d502e42c4059798109bc05b0b770`;
- post-merge CI #447 / run `35396903363`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal build chunk-size warning only.

P5.8 is **unpublished**. It performed no provider enrollment/purchase/credential use/request, public-site read/write, Task #67 Production source admission, Task #67 refresh-plan mutation, Task #64/#70 execution, observation/evidence persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p5-8-source-telemetry-closeout.md`
- `docs/p5-8-source-quality-cost-rate-limit-telemetry.md`

At the P5.8 checkpoint, the default next safe milestone was **P6.1 — unified opportunity types across technical/content/query/competitor/link/AI**; that milestone is now complete as recorded above.

## Previous engineering state — P5.7 complete

Roadmap **P5.7 — category/market competitor intelligence UI** is complete under issue #237 / PR #238.

P5.7 replaces the existing `/search-intelligence` placeholder with a deterministic, read-only/default-off frontend workspace over a synthetic P5.6-shaped report fixture:
- preserves the existing Discover → Search Intelligence navigation and route;
- exposes market/category/owned-target/reference-time/report-lineage context;
- provides searchable/sortable competitor visibility, exact-topic gap, page structural semantic-difference and P5.5 link-gap DataGrids;
- preserves provider-native authority nullability and cross-provider non-comparability;
- preserves P5.4 request-frame trend non-comparability;
- explicitly states observed-topic visibility is not market share;
- explicitly states page differences do not prove a missing owned page;
- keeps topic/link gaps descriptive rather than recommendations;
- emits no opportunity score; P6 retains cross-signal prioritization;
- adds responsive desktop/tablet/mobile styling plus Search Intelligence keyboard, browser-network and serious/critical axe coverage;
- adds no competitor API endpoint, generated runtime hook or Production data binding.

Certification:
- base SHA/tree: `4395d7d52c0956524f547122bdf34ba6081d2824` / `372e0afcba07d36a466a47c0a421f22bf5a71eca`;
- initial PR head `4d0d292c24575f7f681512d15190945b2da5926a`, CI #441 / run `35393246928`: legacy schema/Task/P3.6/workspace tests and P5.7 browser interaction passed, but the new axe scan correctly rejected insufficient scoped secondary-text contrast; no merge occurred;
- exact tested implementation head: `78cbe084166936674c1793018bf0bf6cfc6c6259`;
- the corrective change darkened only scoped P5.7 secondary text; global design tokens and runtime semantics were unchanged;
- PR CI #442 / run `35393447051`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests, Playwright Chromium/P4.10 including P5.7 interaction + axe, typecheck and build;
- implementation merge: `64947e7662af1fadb389d9dd94f98a2e803d8911`;
- implementation tree: `229e2152db2128853a70fd3b39e7cfabdab47291`;
- post-merge CI #443 / run `35393653860`: success across the same full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed; existing non-fatal build chunk-size warning only.

P5.7 is **unpublished**. It performed no provider enrollment/credential use/request, public-site read/write, Task #67 Production source admission, competitor target mutation, Task #64/#70 execution, observation/evidence persistence, Production DB read/write/DDL/DML, scheduler/worker activation, environment/secret/config mutation or publication.

Detailed record:
- `.agents/memory/p5-7-competitor-intelligence-ui-closeout.md`
- `docs/p5-7-category-market-competitor-intelligence-ui.md`

At the P5.7 checkpoint, the default next safe milestone was **P5.8 — source quality/cost/rate-limit telemetry**; that milestone is now complete as recorded above.

## Previous engineering state — P5.6 complete

Roadmap **P5.6 — competitor visibility/page/topic-gap operational pipeline** is complete under issue #234 / PR #235.

P5.6 adds a deterministic, descriptive operational report over already-normalized supplied Task #58/Task #66/P5.2/P5.3/P5.4/P5.5 artifacts:
- requires 1–10 explicitly manually reviewed competitor targets;
- defines a reporting-only target alias that removes one leading `www.` while preserving all other subdomains;
- joins Task #58 competitor pages to P5.2 SERP rows with a deterministic reporting page key;
- derives per-competitor observed visibility summaries without ranking competitors or claiming market share;
- derives Task #58 structural semantic differences without treating them as missing-page proof or recommendations;
- builds exact-keyword topic rows with separate SERP and semantic states;
- carries P5.3 keyword context without consuming its opportunity score;
- carries P5.4 trend context while retaining `crossFrameComparable=false`;
- re-projects P5.5 backlink authority/gap evidence without changing provider-native authority or gap classifications;
- emits explicit coverage, missing-data diagnostics and deterministic lineage;
- produces no cross-signal opportunity score or recommendation; P6 retains that responsibility.

Certification:
- base SHA/tree: `e1c20db8849c41b8751a4f2285ccc6cc68338a22` / `320b57a2c1f108c96f941944d8dafb9da697ddf5`;
- initial PR head `c5dd8c9af0eba6a70c255e9a1a748d2088350437`, CI #435 / run `35382916747`: schema/task/workspace/browser tests passed and typecheck exposed a test-helper narrowing defect; no merge occurred;
- corrective head `42ab06eabe3b84d3e0acc44e5365f20d9ba692a1`, CI #436 / run `35383164990`: a test-only literal `\\n` patch typo caused a transform failure; no merge occurred;
- exact tested implementation head: `ccc101cd95ab3a6bc99fa61b91fa0f00261accee`;
- PR CI #437 / run `35383388840`: success across legacy schema, Task tests, P3.6 migration test, all workspace tests, Playwright/P4.10 browser suite, typecheck and build;
- implementation merge: `e0cf3758be1dff24f443a0a42fa19d2a4110b82b`;
- implementation tree: `a2095f34919adebfa3839cf3449815fb0fb111af`;
- post-merge CI #438 / run `35383645713`: success across the full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P5.6 is **unpublished**. It performed no provider enrollment/credential use/request, Task #67 Production source admission, target-registration mutation, Task #64/#70 execution, observation/evidence persistence, Production DB read/write/DDL/DML, scheduler/worker activation, provider/public-site mutation, config/secret change or publication.

Detailed record:
- `.agents/memory/p5-6-competitor-visibility-gap-closeout.md`
- `docs/p5-6-competitor-visibility-page-topic-gap-pipeline.md`

At the P5.6 checkpoint, the default next safe milestone was **P5.7 — category/market competitor intelligence UI**; that milestone is now complete as recorded above.

## Previous engineering state — P5.5 complete

Roadmap **P5.5 — backlink authority/link-gap adapter(s)** is complete under issue #231 / PR #232.

P5.5 adds a dedicated `backlink` signal plus deterministic provider-neutral backlink supplied-fixture normalization and a Task #68-compatible manual-import adapter without activating any provider/runtime capability:
- canonical domain identity uses normalized hostnames without silently collapsing `www` or subdomains;
- absolute HTTP(S) URLs are canonicalized deterministically while preserving path/scheme semantics and retaining sorted query parameters;
- `observedAt` and caller-supplied `referenceTime` are explicit, with UTC timestamp normalization and no `Date.now()` dependency;
- freshness is derived deterministically as fresh/recent/aging/stale/unavailable from `lastSeenAt`;
- authority is provider/method/metric/scale-bound, null remains distinct from zero, and cross-provider comparability is explicitly false;
- anchor rows normalize deterministically, duplicate equivalent identities merge, and classification conflicts fail closed;
- complete supplied profiles must exactly reconcile normalized referring-domain/backlink/dofollow/nofollow/sponsored/UGC totals;
- new/lost 30-day totals require explicit row-level change evidence and are never inferred from provider timestamps;
- deterministic synthetic fixtures cover baseline, null-vs-zero, anchor, freshness/churn, and owned + three-competitor link-gap cases;
- one-owned + 1–10 competitor bundles derive only descriptive owned/shared/single/shared-gap/universal-gap classifications;
- input order cannot change normalized profile/bundle fingerprints;
- rich backlink/gap evidence remains outside the bounded Task #68 aggregate stream;
- no backlink opportunity score is created; P6 remains responsible for cross-signal prioritization.

Public DataForSEO Backlinks Summary, Referring Domains, Anchors and Domain Intersection documentation was reviewed as a future mapping candidate only. Their current Live/billable endpoints were not implemented or called.

Certification:
- base SHA/tree: `edfffa86a52b5fea591b303e8568bf908e6026b3` / `b3c7bf68f2200149819ebd6adcb98ef8f8c4882b`;
- initial PR head `f09db6719d0c9b857dd4ed7d63ceca8dd5d3128d` reached CI #430 / run `35378061427`: all schema/task/workspace/browser tests passed, but typecheck correctly rejected one stale test assertion; no merge occurred;
- corrective commit removed only that invalid test assertion;
- exact tested implementation head: `99c5938aa6dcfa01b01e7bd71e75101b027707a7`;
- PR CI run `35378394021` / CI #431: success across schema/task/workspace tests, Playwright Chromium + P4.10 browser suite, typecheck and build;
- implementation merge: `605cf9133da8a26ddf9989cab005ec91161c033f`;
- merge tree: `e45536adbe78a7ef7b379c5805e77aeb8bd345f4`;
- post-merge push CI run `35378641628` / CI #432: success across the same full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P5.5 is **unpublished**. It did not authorize or perform provider enrollment/purchase, credential creation/use, DataForSEO/provider requests, Task #67 Production source admission, Task #70 execution, observation/evidence persistence, Production DB reads/DDL/DML, scheduler/worker activation, Task #53/#54/#64 execution, provider/public-site writes, secret/config changes or publication.

Detailed record:
- `.agents/memory/p5-5-backlink-fixture-closeout.md`
- `docs/p5-5-backlink-authority-link-gap-adapter.md`

At the P5.5 checkpoint, the default next safe milestone was **P5.6 — competitor visibility/page/topic-gap operational pipeline**; that milestone is now complete as recorded above.

## Previous engineering state — P5.4 complete

Roadmap **P5.4 — trends/source adapter(s)** is complete under issue #227 / PR #228.

P5.4 adds provider-neutral request-frame trend semantics plus a deterministic DataForSEO Google Trends Explore Standard-task supplied-result adapter without activating any provider/runtime capability:
- Explore-style trend values are modeled as `relative_0_100_request_frame`, not absolute search volume;
- exact frame identity binds provider method/source/market/category/keywords/location/language/property/provider-category/date range/scale;
- cross-frame comparability is explicitly false;
- relative index `0` remains explicit insufficient-data evidence rather than literal zero search demand;
- explicit missing graph points remain distinct from zero and are excluded from usable-point calculations;
- per-keyword summaries include usable/missing/zero-insufficient counts, latest/mean/peak relative index, early/recent means, signed velocity, positive momentum, volatility, coverage and rising/falling/flat/unavailable direction;
- signed-velocity direction threshold is ±0.05 and derived values remain descriptive rather than forecast/absolute-demand claims;
- DataForSEO Standard task POST/GET paths are inert metadata only;
- request contract is internally bounded to 1–5 keywords, <=80 chars / <=10 words each, exact location/language, Google/all-device scope, web property, provider category code 0 and explicit 30–366-day frame;
- only the Google Trends graph item is modeled; Live execution, callbacks/pingbacks/postbacks, polling, related topics/queries and map expansion are excluded;
- supplied completed-result normalization produces a rich frame-bound projection plus bounded Task #68 aggregate metrics with no fabricated per-keyword Task #68 stream;
- official Google Trends API alpha remains a separate future source/method and its consistently-scaled model is not treated as equivalent to Explore-style 0–100 data.

Certification:
- base SHA/tree: `27ca612842e87ae0f34b9825783b2ecf030c6b1b` / `0456bea8ba09acbc5c05b617f3a6408c42181487`;
- exact tested PR head: `f291b15a060c6dc784ad485ea72d3baf18a6c991`;
- PR CI run `35373732089` / CI #425: success across schema/task/workspace tests, Playwright Chromium + P4.10 browser suite, typecheck and build;
- implementation merge: `1680969b64f767552262494f1586fac26b77475b`;
- merge tree: `32d5bc8a19ff7ccefde8cf7f32c113e1a347b6ac`;
- post-merge push CI run `35373952663` / CI #426: success across the same full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P5.4 is **unpublished**. It did not authorize or perform DataForSEO signup/enrollment/purchase, credential creation/use, provider requests, official Google Trends alpha access, Task #67 source admission, Task #70 execution, observation/evidence persistence, Production DB reads/DDL/DML, scheduler/worker activation, provider/public-site writes, secret/config changes or publication.

Detailed record:
- `.agents/memory/p5-4-trends-adapter-closeout.md`
- `docs/p5-4-provider-neutral-trends-dataforseo-adapter.md`

At the P5.4 checkpoint, the default next safe milestone was **P5.5 — backlink authority/link-gap adapter(s)**; that milestone is now complete as recorded above. Live provider enrollment/credentials/requests remain separately unauthorized.

## Previous engineering state — P5.3 complete

Roadmap **P5.3 — keyword volume/difficulty/opportunity adapter(s)** is complete under issue #224 / PR #225.

P5.3 adds provider-neutral keyword measurement semantics plus a deterministic DataForSEO Google Keyword Overview supplied-result adapter without activating any provider/runtime capability:
- strict null-vs-zero semantics for search volume, organic difficulty, CPC, paid competition and bid fields;
- provider-native organic difficulty remains method-bound and explicitly non-comparable across providers without later calibration;
- paid competition remains advertiser pressure only and is never treated as organic ranking difficulty;
- CPC retains USD/provider derivation provenance with no invented midpoint or implicit FX conversion;
- deterministic cohort-relative keyword metric opportunity requires volume + organic difficulty + at least one commercial signal, exact homogeneous measurement basis and at least 10 eligible unique keywords;
- opportunity uses mid-rank percentiles with demand 45%, attainability 35%, commercial 20%; confidence stays separate;
- DataForSEO Keyword Overview endpoint is retained as inert reference metadata only; no Live execution path exists;
- request contract is internally capped at 50 keywords, 80 characters / 10 words each, exact location/language, Google/all-device scope, clickstream off and SERP expansion off;
- provider-omitted requested keywords become explicit missing-data projections rather than zero;
- rich per-keyword projections remain separate from the bounded Task #68 aggregate observation;
- exact Task #68 round-trip compatibility and anti-network/static safety are covered by deterministic tests.

Certification:
- base SHA/tree: `d965bffe07ee3d26f6c8ff139bbe13c9327fd205` / `e0a546ab39519fd455137c769ddefe6bf0843c1b`;
- exact tested PR head: `5b6698085806ae0c7cd8426c5c1815db0fa7884f`;
- PR CI run `35369123343` / CI #421: success across schema/task/workspace tests, Playwright Chromium + P4.10 browser suite, typecheck and build;
- implementation merge: `2c8dc3c8d46fbe0563a8083548b6b2bbf87e1e76`;
- merge tree: `e7bcd45b306eca161f50e2f5d0292f4a5b1b17bf`;
- post-merge push CI run `35369360893` / CI #422: success across the same full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P5.3 is **unpublished**. It did not authorize or perform DataForSEO signup/enrollment/purchase, credential creation/use, provider requests, Task #67 source admission, Task #70 execution, observation/evidence persistence, Production DB reads/DDL/DML, scheduler/worker activation, provider/public-site writes, secret/config changes or publication.

Detailed record:
- `.agents/memory/p5-3-keyword-metrics-adapter-closeout.md`
- `docs/p5-3-keyword-metrics-dataforseo-adapter.md`

At the P5.3 checkpoint, the default next safe milestone was **P5.4 — trends/source adapter(s)**; that milestone is now complete as recorded above. Live provider enrollment/credentials/requests remain separately unauthorized.

## Previous engineering state — P5.2 complete

Roadmap **P5.2 — SERP/ranking adapter(s)** is complete under issue #221 / PR #222.

P5.2 adds a deterministic DataForSEO Google Organic SERP/ranking adapter foundation without activating any provider/runtime capability:
- exact canonical P5.1 review/freshness binding and requirement that the dual-purpose engineering selection remains `dataforseo`;
- exact Task #68 source/request/market/category lineage binding;
- expected source key `dataforseo-google-organic-serp` as an adapter contract only, with no Task #67 source admission;
- inert standard-task endpoint metadata for task-post + advanced result;
- keyword/location/language/device validation;
- internal depth bound 10–100 in 10-result increments;
- normal priority `1` only;
- deterministic provider tag and request fingerprint;
- conservative `depth / 10` billed-page-unit upper-bound metadata;
- supplied-result-only normalization with no transport execution;
- bounded provider-neutral ranking projection retaining only rank/page/domain/URL;
- correct separation of organic `rank_group` from absolute SERP-element `rank_absolute`;
- tracked-domain/subdomain match metrics including best rank/top-10/top-20;
- explicit no-match success, empty result and bounded provider/task-error semantics;
- exact Task #68-compatible adapter results and round-trip normalization tests;
- raw titles/snippets/XPath/status messages/arbitrary provider fields are discarded.

Certification:
- base SHA/tree: `c352ac4e8c60dfc3ded33aaa63faff3bb43d6be0` / `0c8138ee1134dec9f6846fe97dfaf6a93e97a68e`;
- exact tested PR head: `184706ae549be75a19d22e15acbc1f280962785b`;
- PR CI run `35365076296` / CI #417: success across schema/task/workspace tests, Playwright Chromium + P4.10 browser suite, typecheck and build;
- implementation merge: `873aebeae798e61b2c313dfbe5e618c09c6a7f75`;
- merge tree: `9136828ed85cbcd3b548a8532e0e452c2bb2f9f7`;
- post-merge push CI run `35365310166` / CI #418: success across the same full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit non-browser recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P5.2 is **unpublished**. It did not authorize or perform DataForSEO signup/enrollment/purchase, credential creation/use, provider/search-engine requests, Task #67 source admission, Task #70 execution, observation/evidence persistence, Production DB reads/DDL/DML, scheduler/worker activation, Task #53/#54/#64 execution, provider/public-site writes, secret/config changes or publication.

Detailed record:
- `.agents/memory/p5-2-dataforseo-serp-adapter-closeout.md`
- `docs/p5-2-dataforseo-serp-ranking-adapter.md`

Default next safe milestone: **P5.3 — keyword volume/difficulty/opportunity adapter(s)**, default-off/network-free engineering using deterministic supplied fixtures only. Live DataForSEO enrollment/credentials/requests remain separately unauthorized.

## Previous engineering state — P5.1 complete

Roadmap **P5.1 — provider selection/cost/reliability review for SERP + keyword data** is complete under issue #218 / PR #219.

P5.1 adds a dated, deterministic external-provider review/selection contract without activating any provider/runtime capability:
- review date `2026-09-18T00:00:00.000Z`, with a 90-day re-review boundary or earlier review on material provider/API/pricing/terms/reliability change;
- `dataforseo` is the initial dual-purpose P5.2/P5.3 **engineering target** for SERP + keyword adapters;
- `serpapi` is the independent SERP benchmark/fallback candidate;
- `google_ads_keyword_planner` is the official keyword-reference candidate under a separately reviewed Google Ads account/developer-token/OAuth boundary;
- `ahrefs` and `semrush` are deferred broad-suite candidates;
- role selection uses explicit ordered policy plus hard capability/evidence gates rather than an opaque weighted score;
- pricing/reliability/source provenance is explicit and dated;
- Task #67 external-source admission is not performed and remains separate;
- no executable provider transport, provider SDK, environment-secret binding, DB client, scheduler/worker or publication path is introduced.

Certification:
- base SHA/tree: `52e697b08868e546b8edea8083df8ff1bf60d5ec` / `91414019e43141c74a490a134f213b989a326111`;
- exact tested PR head: `193c517bcefbfac2b1726e59fb33521cd0d45b18`;
- PR CI run `35361361888` / CI #413: success across schema/task/workspace tests, Playwright Chromium + P4.10 browser suite, typecheck and build;
- implementation merge: `1d1ee1b5284b62fe9cb446a7ad6d79a35db53259`;
- merge tree: `573d1ec33cd1c5d84868fe29c8f1cbab6f24636a`;
- post-merge push CI run `35361587686` / CI #414: success across the same full matrix;
- Replit exact-synced to that merge/tree at `0/0`, clean, zero untracked;
- Replit non-browser recursive workspace tests, full typecheck, full build and `git diff --check`: passed.

P5.1 is **unpublished**. It did not authorize or perform provider signup/enrollment/purchase, API-key/OAuth/developer-token creation/use, any provider request, Task #67 external-source admission, Task #70 execution, observation/evidence persistence, Production DB reads/DDL/DML, scheduler/worker activation, Task #53/#54/#64 execution, public/provider writes, secret/config changes or publication.

Detailed record:
- `.agents/memory/p5-1-provider-selection-review-closeout.md`
- `docs/p5-1-serp-keyword-provider-selection-review.md`

At the P5.1 checkpoint, the next safe milestone was **P5.2 — SERP/ranking adapter(s)**; that milestone is now complete as recorded above. Live DataForSEO enrollment/credentials/requests remain separately unauthorized.

## Previous engineering state — P4.10 complete

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

P4.10 was subsequently merged/certified and exact-synced before P5.1 began. The current exact Replit checkpoint is recorded in the P5.1 section above. Neither P4.10 nor P5.1 has been published.

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
- **P5.1 — external SERP/keyword provider selection review:** dated deterministic provider-role review with explicit pricing/reliability provenance and re-review bounds; DataForSEO initial dual-purpose engineering target, SerpApi SERP benchmark/fallback, Google Ads Keyword Planning official keyword reference, Ahrefs/Semrush deferred; zero provider enrollment/credentials/network/source admission/runtime/persistence/publication.
- **P5.2 — DataForSEO SERP/ranking adapter foundation:** deterministic standard-task request contract, P5.1 + Task #68 lineage, bounded provider-neutral ranking projection and strict Task #68 result mapping; zero provider enrollment/credentials/network/source admission/runtime/persistence/publication.

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

Certified engineering foundations through this checkpoint include P1.1/P1.2, P2.1–P2.8, P3.1–P3.6, P4.1–P4.8/P4.10 and P5.1–P5.2. P4.9 remains optional/unselected. P1 live-provider activation remains separately authorized. P3.6 establishes schema only; P4.1–P4.8/P4.10 establish product/browser foundations; P5.1 establishes provider-selection guidance; P5.2 establishes a network-free SERP/ranking adapter contract only. None implies live full-site crawl execution, sitemap fetching, provider enrollment/requests, Task #67 source admission, application observation/evidence Production reads or persistence, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable long-term plan. Its mutable P2/P3/P4 status tables must reflect these completed foundations; historical task/release evidence elsewhere must not be rewritten.

## Next boundary — P5.3 safe by default; live providers only if deliberately authorized; P4.9 optional

With P5.2 certified, the next default safe engineering boundary is **P5.3 — keyword volume/difficulty/opportunity adapter(s)**. Based on P5.1, the first engineering target may again be DataForSEO, but generic `continue` authorizes only default-off/network-free request/result contracts, normalization/bounds/readiness integration and deterministic supplied-fixture tests. It must not enroll a provider, create/use credentials, make provider requests, admit a Task #67 external source, execute Task #70, persist evidence, activate a scheduler/worker, mutate Production data/schema, write to a provider/public site, or publish.

A separately authorized **P1.4–P1.8 live GSC path** may be chosen instead only with explicit bounded authorization for the exact credential/consent/property/read step.

**P4.9 — Storybook/component documentation** remains optional/unselected and may be taken deliberately later; it is not required before P5.3.

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
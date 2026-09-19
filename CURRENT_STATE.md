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

Tasks #74, #75, roadmap P2 engineering foundations, P3.1–P3.6, P4.1–P4.8/P4.10, P5.1–P5.8 and P6.1–P6.2 have **not** been published as application releases. P3.6 changed only the separately authorized Production schema; P4.1–P4.8/P4.10 change engineering-source product navigation/design-system/workbench/evidence-inspection/Command-Center/audit-explorer/responsive/accessibility/browser-regression code only; P5.1–P5.8 are external-intelligence research/adapter/operational-report/frontend/telemetry engineering only; P6.1 is unified opportunity classification/evidence engineering only; P6.2 is deterministic transparent opportunity-scoring engineering only. P4.9 remains optional and unselected. Git synchronization, engineering merges and database DDL do not change the separately attested published application source.

## Current engineering state — P6.2 complete

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

Default next safe milestone: **P6.3 — conflict/dedupe/suppression/prioritization**, deterministic/default-off engineering over certified P6.1/P6.2 records; no live execution.

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

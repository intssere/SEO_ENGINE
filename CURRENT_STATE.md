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

Tasks #74, #75, roadmap P2 engineering foundations, P3.1–P3.6, P4.1–P4.8/P4.10, P5.1–P5.8, P6.1–P6.7, P7.1–P7.7, P8.1–P8.2 and P9.1–P9.3 have **not** been published as application releases. P3.6 changed only the separately authorized Production schema; P4.1–P4.8/P4.10 change engineering-source product navigation/design-system/workbench/evidence-inspection/Command-Center/audit-explorer/responsive/accessibility/browser-regression code only; P5.1–P5.8 are external-intelligence research/adapter/operational-report/frontend/telemetry engineering only; P6.1 is unified opportunity classification/evidence engineering only; P6.2 is deterministic transparent opportunity-scoring engineering only; P6.3 is deterministic collection conflict/dedupe/suppression/prioritization engineering only; P6.4 is deterministic explanation/evidence projection engineering only; P6.5 is deterministic actionability-classification engineering only; P6.6 is deterministic current-vs-proposed preview/diff engineering only; P6.7 is deterministic opportunity lifecycle/history engineering only; P7.1 is deterministic supplied-evidence AI crawler/bot accessibility-audit engineering only; P7.2 is deterministic supplied-definition prompt/topic-set modeling only; P7.3 is deterministic provider-neutral supplied-observation answer/brand/citation normalization engineering only; P7.4 is deterministic supplied-evidence citation/domain/competitor comparison engineering only; P7.5 is deterministic evidence-bound AI visibility scoring/history engineering only; P7.6 is deterministic P7→P6 AI/GEO opportunity-lineage integration engineering only; P7.7 is deterministic synthetic/read-only AI Visibility frontend workspace engineering only; P8.1 is deterministic/read-only governed opportunity → proposal → approval workspace engineering only; P8.2 is deterministic/read-only evidence/risk/preview/verification-availability/rollback-plan action-card engineering only; P8.3 is review/contract documentation only with implementation blocked; P9.1 is deterministic/default-off read-work scheduler/queue architecture engineering only; P9.2 is deterministic/default-off first-party refresh materialization-review engineering only; P9.3 is deterministic/default-off scheduled full/incremental crawl-policy review engineering only. P4.9 remains optional and unselected. Git synchronization, engineering merges and database DDL do not change the separately attested published application source.

## Current engineering state — P9.3 complete

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

Default next safe boundary: **P9.4 — bounded external intelligence refresh**. Generic continuation may compose existing P5 external-intelligence adapters/telemetry with Task #67/#68 and P9.1 `signal_refresh` semantics using deterministic supplied/fake provider results only. It does **not** authorize provider enrollment, credentials, live provider/network reads, Task #69/#70 execution, durable queue materialization, workers/retries, persistence, Production DB writes, provider/public-site writes, deployment or publication.

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

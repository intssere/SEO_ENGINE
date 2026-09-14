# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. If it conflicts with older mutable release wording in `PROJECT_HANDOFF.md`, use this file for the current release position and `PROJECT_HANDOFF.md` for historical/architectural context.

## Current production application release

The currently published production application remains the Task #65 application bundle:

- Task #65: **One-Target Pilot Preparation & Authorization Packet Foundation v1**
- Issue: #93
- PR: #94
- exact tested PR head: `e90295abf49003deae7801081da0bbbb548991bc`
- certified application merge/source: `1f2a2a9cefd07676b0569b93401bd116ff995fa4`
- certified application tree: `33b049d3bc35acaaef508db3432aabd8b2522de8`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`

GitHub `main` and the Replit workspace contain newer engineering/docs commits. Do **not** treat those newer Git SHAs as newer published runtime bundles unless a later explicit publication is separately certified.

## First real competitor pilot — completed and restored

The first real one-target competitor dry-run completed successfully against:

- competitor: Triple Traders
- target: `https://tripletraders.com/collections/fragrance`
- category: fragrance / Arabian fragrance
- intended market: United States / English
- pilot ID: `cpr-073e715d5661b885292142cf`
- pilot fingerprint: `073e715d5661b885292142cf49de5a9fb6b37caad906c4a31315e1be7279bad8`
- deterministic Task #64 job ID: `799e8813-6769-5a62-b64f-aec0e03762ff`

Certified result:

- exactly 1 production Task #64 job
- status/phase: completed/completed
- attempts: 1
- terminal/replay-locked: yes
- exact target receipts: 1
- redirects: 0
- raw competitor body retained: false
- competitor evidence persisted: 0
- configured competitor targets: 0
- target configuration mutation: false
- provider/public-site writes: none
- no automatic transition
- no second Task #64 job or second Triple Traders request observed

After the pilot, the temporary Task #64 execution gate was restored to false and the application was republished. Post-restoration health/auth and safety certification passed.

Detailed closeout: `.agents/memory/first-live-competitor-pilot-closeout.md`.

## Completed competitor-intelligence control chain

Tasks #58-#65 plus the first live pilot now form a proven bounded chain:

- Task #58: normalized competitor evidence contract/read projection
- Task #59: bounded acquisition/persistence foundation, default-off
- Task #60: competitor discovery/planning foundation
- Task #61: controlled target-registration/preflight foundation
- Task #62: hardened outbound transport with DNS-rebinding/SSRF protections
- Task #63: one-target pilot readiness + exact authorization contract
- Task #64: durable single-use one-target dry-run execution foundation
- Task #65: one-target pilot preparation + dual authorization packet
- first live pilot: exactly one real external request, zero persistence/mutation, replay lock proven, gate restored

## Task #66 — engineering complete

Task #66 — **Market-Aware Category Competitor, Trend & Keyword Intelligence Architecture v1** — is implemented, merged, CI-certified, and synchronized to Replit **without publication**.

Canonical engineering release:

- Issue: #96
- PR: #99
- exact tested PR head: `01a00a6757a6c5355824e39b8b4d0730c4712557`
- merged GitHub main: `47105c6a2667edc37aece69307c001d535ea5c4a`
- merged tree: `0521dff83b1805782a541af646421e23eb76a504`
- PR CI #191: success
- post-merge main CI #193: success
- Replit HEAD/cached origin/main after engineering sync: same merged SHA
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- publish/redeploy for Task #66: **not performed**

Task #66 added exactly three files:

1. `artifacts/api-server/src/lib/market-category-intelligence.ts`
2. `artifacts/api-server/src/lib/market-category-intelligence.test.ts`
3. `docs/task66-market-category-intelligence-architecture.md`

No existing route, schema, migration, provider connector, environment/configuration, target configuration, scheduler, worker, or execution file was changed.

### Task #66 architecture now available

The pure control-plane model is:

`MarketProfile -> CategoryContext -> category-specific competitor relation + first-party/external SignalSnapshot -> advisory opportunity synthesis`

The system now has deterministic pure contracts for:

- market identity
- category identity
- first-party vs external signal snapshots
- market/category-specific competitor relevance
- trend/keyword opportunity synthesis

Competitor relevance is explicitly per market × category. A competitor may therefore be strong for Arabian Fragrance in one market and weak for Designer Fragrance or another market.

Task #66 relevance weights:

- category match: 30
- keyword overlap: 25
- page-type match: 15
- entity overlap: 10
- market match: 10
- freshness: 10

Task #66 opportunity synthesis weights:

- first-party support: 30
- external support: 15
- competitor gap: 20
- trend velocity: 15
- intent fit: 10
- confidence: 10

Raw search volume alone is explicitly insufficient evidence. Synthesized opportunities remain `advisory` or `blocked`; they never become executable automatically.

Detailed engineering closeout: `.agents/memory/task66-engineering-closeout.md`.

## Task #67 — engineering complete

Task #67 — **Market/Category Signal Source Registry & Refresh Planning Foundation v1** — is implemented, merged, CI-certified, and synchronized to Replit **without publication**.

Canonical engineering release:

- Issue: #101
- PR: #102
- first PR head `1648d6b3e919b04471231e179c7fd4b46fdf4d29`: rejected by CI because typecheck correctly detected an incomplete return shape
- corrected exact tested PR head: `d5207bbe17f3c9b277addc3d524dcd38256da5fc`
- merged GitHub main: `444b22747ea537735e4778f6fd63bb39919f6a67`
- merged tree: `09cf5eaa76a2ea422600c904ee2f0a85c54754df`
- corrected PR CI #197: success
- post-merge main CI #198: success
- Replit HEAD/cached origin/main after engineering sync: `444b22747ea537735e4778f6fd63bb39919f6a67`
- Replit tree: `09cf5eaa76a2ea422600c904ee2f0a85c54754df`
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- publish/redeploy for Task #67: **not performed**

Task #67 added exactly three files:

1. `artifacts/api-server/src/lib/signal-source-registry.ts`
2. `artifacts/api-server/src/lib/signal-source-registry.test.ts`
3. `docs/task67-signal-source-registry-refresh-planning.md`

No existing route, provider connector, schema, migration, environment/configuration, target configuration, scheduler, worker, execution path, or production persistence path was modified.

### Task #67 source/refresh planning now available

Task #67 composes Task #66 market/category identities into a deterministic source-registry and refresh-planning layer.

The system now has pure contracts for:

- stable source descriptors and source fingerprints
- source class separation: first-party vs external
- source coverage by market/category/signal type
- explicit wildcard coverage only when declared
- source trust/provenance/quality metadata
- manual-review admission for external sources
- source-specific freshness windows
- freshness states: `missing`, `fresh`, `stale`, `critical`
- volatility-aware urgency scoring
- bounded refresh budgets
- deterministic selected/deferred refresh items
- unsupported coverage blockers
- deterministic refresh plan fingerprint/ID

External sources fail eligibility unless manually reviewed. Incomplete provenance fails eligibility. Market/category/signal mismatches fail closed. Duplicate source descriptors and duplicate observation state fail closed.

Refresh planning remains descriptive only: a selected refresh item does **not** contact a source, persist evidence, enroll a provider, activate a scheduler, or authorize an execution.

Task #67 dedicated deterministic tests cover 13 safety/planning cases. The corrected full workspace CI also completed successfully after the initial typecheck defect was fixed.

Detailed engineering closeout: `.agents/memory/task67-engineering-closeout.md`.

## Product direction

The final product requirement remains:

SEO ENGINE must discover, maintain, and re-score relevant competitors **separately for each Diamond Shelf category and selected market**, monitor keyword/query demand and trend velocity, compare SERP/entity/GEO/AIO evidence, detect gaps, generate evidence-backed opportunities, and eventually act through the existing bounded authorization/verification/rollback/measurement framework.

Target long-term loop:

1. observe selected markets
2. refresh first-party and approved external signals
3. discover/re-score category competitors
4. normalize evidence
5. detect category/keyword/trend/SERP/entity gaps
6. synthesize/rank opportunities
7. generate bounded proposals
8. authorize through policy/human gates as required
9. execute through controlled connectors
10. verify and measure
11. retain/adjust/rollback
12. feed measured outcomes back into ranking

Observation may eventually become autonomous. Mutation must remain separately gated and auditable.

## Current safety state

Unless separately and explicitly authorized:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED` effective false
- configured competitor targets = 0
- Task #61 active registration/config mutation inactive
- no autonomous competitor discovery/collection worker
- no competitor scheduler/batch/retry loop
- no Task #53 execution
- no Task #54 preflight/apply
- no production DB DDL
- no secret/credential/OAuth-scope changes

Task #67 capability specifically remains:

- registry/refresh planning only
- network collection authorized: false
- provider enrollment authorized: false
- credential mutation authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler/batch/autonomous worker/retry loop: false
- provider/public-site writes: false
- automatic transition: false
- schema mutation required: false

Sanitized Replit verification after Task #67 engineering sync confirmed:

- Task #64 one-target dry-run execution gate: false
- configured competitor targets: 0
- Task #59 collection gate: false
- Task #59 evidence persistence gate: false
- public-site write gate: false
- no publish/redeploy during verification
- no state modification during verification

## Persistent Task #54 remains separately gated

The previously diagnosed possible first persistent candidate remains Unisex Fragrance:

- Plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- Proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- field: `meta_description`
- diagnosed current value: `null`
- proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- evaluator risk: medium
- lifecycle at diagnosis: approval_ready
- approvals/actions/deployments at diagnosis: `0 / 0 / 0`

Tasks #56-#67 do not approve or authorize it.

## Next safe milestone — Task #68

Recommended next milestone:

**Task #68 — Source Adapter Contract & Signal Observation Normalization Foundation v1**

Goal: move from Task #67 source eligibility/refresh planning to deterministic adapter/result contracts and normalized observation envelopes, still with zero live source collection and zero persistence.

Safe Task #68 scope under generic `continue`:

- pure source-adapter request/response contracts derived from Task #67 selected refresh items
- canonical normalized signal observation envelope
- provenance and source-lineage binding
- market/category/signal identity validation
- deterministic observation fingerprints
- partial/empty/error result semantics
- duplicate/deduplication rules
- bounded payload/metric normalization
- source-quality/confidence carry-forward rules
- fail-closed cross-market/category/signal mixing checks
- deterministic network-free tests/docs

Generic `continue` still does **not** authorize:

- any real source/provider/competitor DNS/HTTP/API request
- external provider enrollment
- credential/API-key/OAuth changes
- recurring collection
- signal or competitor evidence persistence
- active target configuration
- scheduler/batch/worker/retry-loop activation
- production DB DDL
- provider/public-site writes
- Task #53/#54 execution
- Task #64 gate enablement or another live pilot
- publication/redeploy

## Resume rule

At the beginning of a new chat, resolve current GitHub `main` SHA/tree first, then read:

1. `CURRENT_STATE.md`
2. `AGENTS.md`
3. `PROJECT_HANDOFF.md`
4. `ARCHITECTURE.md`
5. `.agents/skills/seo-engine-project/SKILL.md`
6. `.agents/memory/MEMORY.md`
7. relevant linked memory notes

Stop rather than improvise on schema mismatch, missing auth objects, unexpectedly open write/AI/competitor/Task #53/#54/#64 gates, unexplained Replit drift, failed validation, or unexpected external/provider/public-site mutation activity.

# P12.2 — Diamond Shelf bounded-pilot preflight v1 (proposal only)

**Status:** repository-only conditional fallback design, not executable authority. **First evaluate reuse of the already-executed full-site Packet 014 baseline and an incremental/reconciliation path; a 20-page pilot is not presumed necessary.**
**Base:** `a19cd21da5d60dbb1862867ce0cdade4746791be` (PR #1064 push-to-main CI `38079304319`: SUCCESS).
**Target:** `https://diamondshelf.us`; exact source site ID `eb1da9ee-539c-4200-8f04-f64ccaea7768`.
**Source anchors:** `artifacts/api-server/src/lib/first-party-crawl-manual.ts`, `p12-2-l2-one-shot-operator-caller.ts`, `p12-2-l6-3-live-operator.ts`, `first-party-live-adapters.ts`.
**Prerequisite:** `docs/p12-2-diamondshelf-first-controlled-run-go-no-go.md`.
**Policy:** `AGENTS.md`; no generic continuation authorizes Production SQL, writes, crawling, config, deployment or provider requests.

## Critical historical full-crawl checkpoint and route selection

The real Diamond Shelf Packet 014 full-site crawl already ran on October 6, 2026 (see `docs/p12-2-l10-17-packet-014-post-run-certification.md` and `docs/p12-2-l10-19-expected-absence-disposition.md`). Exact run ID `p12-2-diamond-shelf-post-0010-full-014` finalized 3,044/3,044 URLs: 3,043 successful fetches and one raw 404 at `/blogs/news`. An authorized expected-absence disposition/reconciliation leaves zero **effective** unresolved terminal failures, but the legacy `wholeSiteCertified=false` flag and absence of a `completed_run` row must remain untouched. Do not imply the original crawl never happened or label it clean-certified.

**Route A is currently BLOCKED by source contract:** `p12-2-l6-2-incremental-material-binding.ts` calls `assertSource()` for both `before` and `after`, which rejects any source with `certification.certification.wholeSiteCertified !== true` (`p12_2_l6_2_before_not_whole_site_certified` or `...after...`). It also requires completed checkpoints, intact full-site certification/inventory/execution-plan lineage, **two different run IDs** and increasing observedAt. Packet 014 retains raw `wholeSiteCertified=false` and no certified completed-run row, so its expected-absence reconciliation cannot be passed into this incremental executor as a certified `before` source. Do not forge or rewrite certification, synthesize an `after` run, or claim incremental GO.

**Route A next engineering research:** Determine whether a separately designed, audited compatible `certified_with_expected_absence` baseline adapter could safely support comparison without falsifying raw certification. This requires independent source/test review, an explicit new comparison contract and safety tests; it does not follow automatically from the reconciliation disposition. The existing `incremental-recrawl-planner.ts` additionally requires a complete current sitemap inventory and warns of missing per-URL outcome comparisons. If the adapter cannot be proven safe, keep current incremental execution blocked and choose Route B or C after separate validation.

**Use route B conditionally:** A new 20-page `bounded_pilot` only if compatibility/evidence requirements establish a need for a post-release smoke or an incremental path is not yet certifiable. Do not execute it by default; do not replay the old Packet 014.

**Route C:** Fresh full-site run only if the baseline is unusable/stale by documented criteria or a full recrawl is otherwise justified and separately authorized. Never silently promote the historical false certification flag to true.

## Discovery

- `executeP12_2BoundedPilotCrawl` exists and calls `runBoundedPilotCrawlBridge`; a bounded run can be scoped by `hardPageLimit`, `absolutePageCeiling`, sitemap inventory and execution policy.
- `buildP122L2Packet` supports phase `bounded_pilot` and requires site/origin binding, a new valid run ID, ISO observedAt, strict fingerprint, all readiness flags and exact packet authorization. `executeP122L2OneShotDurable` is wired through `executeP122L3LiveOperator` and a durable Postgres claim store.
- Operator packet fixes max attempts = 1, automatic whole-run retry = false, scheduler/autonomous-worker/provider/public-site writes = false.
- `p12-2-l10-15-packet-014-live-cli.ts` is **not** a pilot launcher: it is frozen for historical full_initial Packet 014, with a 5,000-page hard limit, fixed historical run ID and timestamp. Do not replay it.
- Latest verified Railway image is `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`, app `seo-engine-shadow`, deployment `11362736-c4ea-43a0-9e4b-f6627acdee24`; no source-to-runtime compatibility proof has yet been completed for the fresh pilot.
- Railway-managed Postgres and restored instance passed bounded metadata and nine-table comparison, but the normative `docs/p8-8-w09c2y-railway-database-architecture-decision.md` still selects external Neon as authoritative Production target. Site row contents and active durable crawl claims have not been inspected.

## Conditional fallback: proposed bounded envelope (requires independent code-backed validation)

| Field | Proposed value | Gate |
| --- | --- | --- |
| Phase | `bounded_pilot` | Exact packet fingerprint and authorization |
| Origin | `https://diamondshelf.us` | Strict HTTPS same-origin |
| Root sitemap | `https://diamondshelf.us/sitemap.xml` | Verify actual live availability separately |
| Site ID | `eb1da9ee-539c-4200-8f04-f64ccaea7768` | Database-side binding unproved |
| Run ID | New unique ID, generated/frozen only after preflight | Must not collide with prior runs/claims |
| Hard page limit | 20 | Engineering proposal, not live permission |
| Absolute page ceiling | 20 | Must not exceed max in source |
| Sitemap inventory URL limit | 20 | Source requires no greater than hard page limit |
| Batch size / concurrency | 5 / 1 | Must pass source limits |
| Request rate | 12 per minute | Must respect robots policy and platform limits |
| Per-request timeout | 10,000 ms | Confirm live adapter behavior |
| Attempts per URL | 1 | No URL retry for initial pilot; one attempt per packet |
| Redirects per request | 3 maximum | Same-origin redirects only |
| Transient page bytes | 262,144 | Bounded metadata extraction |
| Persistence | Durable claim and crawl evidence required by current operator | Explicit DB writes authorization needed |
| Whole-run retry | Disabled | Fail closed |
| Public/provider mutations | Disabled | No Shopify/Google/public site writes |

**Do not treat this partial limits table as an executable `P12_2ManualConfig`.** Additional mandatory source fields (sitemap maxDocuments/depth/documentBytes/path segments, execution retry delays/URL/path limits, incremental limits) must be populated and validated from exact current source and covered by focused tests before packet fingerprint is frozen. Do not invent missing values at runtime.

## Ordered GO gates

1. **Architecture and database:** independently resolve whether this is a Production run using C2Y Path A/Neon, a formally approved Path B/Railway authority, or a segregated non-authoritative trial. If unresolved, NO-GO for Production-backed execution.
2. **Source and executable:** freeze canonical SHA/tree and confirm the exact immutable Railway image contains the required bounded-pilot operator/runner (or request separately governed image release and deployment). No historical Packet 014 CLI reuse.
3. **Binding/claims:** separately authorize bounded SELECT-only checks for exact organizations/sites identity and active/incomplete crawl or L2 invocation claims. Require matching origin and zero conflicting active claims. Do not infer from table counts.
4. **Live safety:** independently verify effective `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`, `PILOT_INGESTION_QUEUE_RESUME_ENABLED=false`, workers/schedulers off; avoid credential exposure.
5. **Traffic policy:** validate robots/sitemap and allowlist behavior with separately authorized read requests. Confirm bounded requests, request failure accounting, timeout, redirection, rate and abort semantics.
6. **Packet verification:** build fresh `bounded_pilot` packet with all source-required fields, deterministic fingerprint, unique run ID, stable observedAt, scoped resource/database identity, one-shot claim and receipt. Test in isolated fixture and require CI success.
7. **Authorization:** obtain explicit action-specific, single-use authorization for the exact packet fingerprint, network requests and separately identified durable database writes, duration, rollback/abort policy and redacted evidence destination. Generic `continue` is insufficient.
8. **Execution review:** one operator invocation maximum, no automatic retries, no reusing frozen Packet 014. Preserve all raw failure and claim evidence. Any unexpected mismatch is terminal BLOCKED, not repaired inline.
9. **Post-run proof:** independently verify durable receipts, completed/failed URLs, robots decisions, crawl freshness and no provider/public-site writes. Expand to full-site only after a separate approval.

## Open blocker disposition

**NO-GO** for a live Production-backed pilot until steps 1–7 are evidenced. This doc constitutes only a preflight specification and is not a claim that a 20-page pilot was built, authorized, deployed or executed.

**Next increment:** write isolated tests for current incremental rejection of Packet-014-style `wholeSiteCertified=false` and assess a separate expected-absence-aware comparison design. Independently certify DB authority and deployed image before choosing a new pilot/full run. Never mark incremental eligible from reconciliation status alone. An inert pilot packet builder is conditional fallback, not the mandatory next crawl. No changes to historical Packet 014.

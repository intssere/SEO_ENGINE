# Task #20 — Diamond Shelf Pilot Certification v1

## Purpose
Certify the first end-to-end SEO ENGINE pilot against Diamond Shelf (`diamondshelf.us`) without confusing software readiness with live-site results. This gate defines what must be proven before the pilot can progress from read/analysis mode to controlled production optimization.

## Certification states
- `NOT_STARTED` — required live connections or baseline evidence are not available.
- `READ_ONLY_READY` — live read connections and baseline collection are proven; no public writes are authorized.
- `CONTROLLED_WRITE_READY` — read-only certification plus write-scope validation, approval workflow, precondition checks, rollback capture, and verification are proven in a controlled test.
- `PILOT_CERTIFIED` — at least one explicitly authorized low-risk pilot action has completed the full plan -> authorize -> deploy -> verify -> measure chain with no unresolved regression.

A CI pass alone can never produce `PILOT_CERTIFIED`.

## Target
- Site: `https://diamondshelf.us`
- Platform: Shopify
- Catalog expectation: approximately 3,000 products; exact inventory/page counts must be measured rather than assumed.
- Pilot scope: product and collection SEO, internal linking, indexing/technical evidence, search performance, analytics, AI visibility, and controlled low-risk Shopify actions supported by Task #15.

## Phase A — Software baseline
Required before live credentials are used:
- Tasks #1–#19 merged and CI green.
- PostgreSQL migration applies cleanly with 29 core tables.
- all package regression tests pass.
- web build/typecheck pass.
- `PUBLIC_SITE_WRITES_ENABLED=false` remains the default.

## Phase B — Read-only connection certification
Must be performed with runtime secrets supplied through the deployment environment, never committed to Git.

### Shopify
- normalize and verify the Diamond Shelf `*.myshopify.com` identity.
- verify `read_products` and `read_content`.
- reject unexpected write scopes in the read-only connector.
- inventory product/page surfaces required by the pilot.

### Google Search Console
- verify access to the exact Diamond Shelf property.
- ingest a baseline window sufficient for ranking/CTR/decay analysis.
- record clicks, impressions, CTR, average position, query, page, country, device and date provenance.

### GA4
- verify the intended Diamond Shelf property ID.
- ingest landing-page sessions, active users, engaged sessions, key events and revenue for the same baseline window where available.

### SEO data provider
- validate the configured OpenSEO/provider transport and exact tool mappings before live use.
- collect keyword/SERP/domain/rank/backlink research through the provider-neutral adapter.

## Phase C — Crawl and evidence baseline
Run a bounded crawl sized to cover the live site safely. Because the crawler currently defaults to 500 pages, a Diamond Shelf pilot must explicitly configure an appropriate hard maximum and verify crawl completeness before treating it as a whole-site audit.

Record at minimum:
- crawl/page count and coverage
- HTTP/indexability/canonical/title/meta/H1/schema/image-alt evidence
- internal-link graph
- content hashes/snapshots
- duplicate-title and broken-known-internal-link findings
- evidence provenance and observation timestamps

Do not certify whole-site coverage from a partial crawl.

## Phase D — Opportunity certification
Run the read-only analytical chain:
`evidence -> technical findings -> ranking opportunities -> unified opportunities -> internal-link intelligence -> AI visibility -> search intelligence`.

Acceptance evidence:
- opportunities are deterministic and deduplicated.
- high-value striking-distance and CTR opportunities can be traced to source metrics.
- technical opportunities can be traced to page snapshots.
- internal-link recommendations expose source/target/relevance evidence.
- AI visibility signals retain provider/model/query/citation provenance.
- policy/search-intelligence signals retain authority tier and cannot be overridden by learned weights.

## Phase E — Planner and approval certification
For a selected opportunity:
- produce an Action Plan.
- show `why -> evidence -> expected impact -> risk -> proposed action`.
- verify AUTO/APPROVAL/BLOCK classification.
- confirm approval-required actions cannot execute without an explicit approved record.
- confirm blocked actions cannot execute.
- keep global public writes disabled during dry-run certification.

## Phase F — Controlled write readiness
This phase requires explicit operator authorization and appropriate Shopify write scopes. It is not automatically authorized by merging Task #20.

Before any real mutation:
- `PUBLIC_SITE_WRITES_ENABLED=true` must be an intentional runtime change.
- the exact action type must be supported by the Shopify writer.
- current Shopify state must match the action precondition.
- exact before-state/rollback payload must be captured.
- approval proof must exist when disposition is `approval`.
- the mutation must not use arbitrary GraphQL supplied by an action payload.

Initial pilot mutation should be one reversible, low-risk item, preferably product SEO metadata or media alt text, not URL/navigation/deletion/theme/schema changes.

## Phase G — Verification, experiment and learning
After an authorized pilot action:
- fetch/crawl fresh state.
- compare actual state to expected state.
- mark verified/failed/regressed.
- if regression is detected, require review and use captured rollback state only.
- where statistically appropriate, create treatment/control cohorts and baseline/measurement windows.
- record outcomes and bounded learning signals.
- learning may adjust prioritization but never override official policy authority or safety gates.

## Phase H — Dashboard live-data cutover
Task #19 currently contains presentation fixtures. Before production pilot certification:
- replace fixture KPI values with persisted/aggregated Diamond Shelf data.
- display explicit empty/loading/stale/error states.
- display `last updated` and source freshness.
- never present estimated impact as verified impact.
- distinguish AUTO eligibility from actually executed actions.
- show approvals, deployments, verifications, experiments and learning from persisted records.

## Pilot baseline report
The live certification run should capture a signed/dated report containing:
- exact Git commit/deployment version
- site and connection identities (non-secret)
- crawl coverage
- indexed/non-indexed counts where available
- GSC clicks/impressions/CTR/position baseline
- GA4 sessions/conversions/revenue baseline where available
- top-3/top-10/top-20 query counts
- technical finding counts by severity
- top ranked opportunities with evidence
- internal-link/orphan/underlinked counts
- AI mention/citation baseline by provider/model
- Search Intelligence operating mode
- action-plan counts by AUTO/APPROVAL/BLOCK
- deployment/verification/rollback status
- experiment status and learning signals

## Certification blockers
Any of the following blocks `PILOT_CERTIFIED`:
- credentials committed to repository/logs
- incomplete crawl represented as whole-site coverage
- fixture dashboard values represented as live metrics
- unsupported Shopify mutation path
- bypassed approval or global kill switch
- missing before-state for a real mutation
- failed post-deployment verification
- unresolved regression
- policy tier D–G used as autonomous executable authority
- learning signal overriding official policy/safety
- untraceable opportunity or action without source evidence

## Current status at merge time
Task #20 code/documentation can certify **software readiness only**. Live Diamond Shelf certification remains pending until runtime connections and real observations are supplied. No live mutation is authorized by this task.

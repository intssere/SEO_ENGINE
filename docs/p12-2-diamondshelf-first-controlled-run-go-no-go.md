# P12.2 — Diamond Shelf first controlled live run: evidence-backed GO/NO-GO audit

**Status:** NO-GO for execution; repository-only audit and preflight handoff. No crawl, Production SQL, DB migration, deployment, provider writes or public-site mutations authorized by this document.
**Audit source base:** GitHub `main` `d60ad942d8d1cd983ad217eb7d1b8edd2fe8f751`.
**Target origin:** `https://diamondshelf.us`.
**Normative:** `AGENTS.md`, `CURRENT_STATE.md`, `MASTER_COMPLETION_ROADMAP.md`.

## Observed runtime evidence (read-only Railway control plane)

- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`, Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`; environment had no staged change.
- App `seo-engine-shadow` (`1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`), latest deployment `11362736-c4ea-43a0-9e4b-f6627acdee24` SUCCESS, image `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`. Presence of variable names `DATABASE_URL`, `AI_PROPOSAL_GENERATION_ENABLED`, `PUBLIC_SITE_WRITES_ENABLED` observed, **not values or effective permissions**.
- Original `Postgres` (`b69e0633-7ab9-40ab-85f3-c9edd6acb031`) deployment `9927392d-4e12-4266-a831-148ffe970d75` SUCCESS, no staged change.
- Earlier operator-authorized PostgreSQL metadata established database `railway`, PostgreSQL 18.6, 43 public tables, one `organizations` and one `sites` row; **not** site identity/site URL or active crawl eligibility.
- Recent PITR restore into separate `Postgres-restored-20261010-1701` succeeded; 43 table-name parity, nine selected table-count parity, recovery target configured `2026-10-10 17:01:28.777688+00`. Neither recovery nor counts establish current crawl readiness.

## Source-backed historical evidence

- `CURRENT_STATE.md`: historical Packet 014 3,044/3,044 finalized; one raw terminal failure `/blogs/news`, disposed expected absence, zero effective unresolved failures; raw `wholeSiteCertified=false` remains immutable. Historical results are **not** a fresh first-run permission or current crawl baseline.
- `docs/p12-2-l10-29-packet-014-production-readonly-readiness.md`: L10.26 supplies three ordered generated SELECT statements for historical Packet 014 state. The tests are localhost ephemeral, not live Production evidence. Never hand-reconstruct SQL or interpret raw history as certified.
- `docs/p12-2-l10-16-packet-014-production-preflight.md`: older Packet-014 **absence** guard applies to a pre-run state and expected 41 tables. It cannot be reused on the observed 43-table post-run database. Avoid rerunning same Packet 014 identity.
- `artifacts/api-server/src/index.ts`: startup conditionally checks `ensureDiamondShelfIdentity()` if `DATABASE_URL` exists. Startup/health does not establish exact Diamond Shelf site ID, crawl eligibility or effective default-off gates.
- `docs/p8-8-w09c2y-railway-database-architecture-decision.md`: current canonical architecture chooses external Neon Production authority, not automatic promotion of Railway-managed Postgres. `docs/p12-2-l10-56h-2-db-authority-recovery-cert-design.md` keeps this decision unresolved.

## Gate matrix (fail closed)

| Gate | Status | Required evidence to advance |
| --- | --- | --- |
| GitHub source and tests | PARTIAL PASS | Exact planned pilot entry point, source SHA/tree, bounded execution semantics and release provenance |
| Live Railway app/deployment identity | PASS CONTROL PLANE | Exact runtime capabilities for immutable deployed image; health/flags and no scheduler activation |
| Intended Production database authority | BLOCKED | Explicitly resolve Neon Path A versus Railway Path B with reviewed data-lineage/binding decision |
| Exact `diamondshelf.us` site/org binding | UNKNOWN | Separately authorized read-only exact identity, no data payload or secrets |
| Existing crawl run/invocation state | UNKNOWN | Separately authorized new-run freshness, in-flight/replay/claim guard and account/site concurrency preflight |
| Historical Packet 014 compatibility | HISTORICAL ONLY | Do not consume old absence guard; define new limited pilot identity and fresh preflight |
| Safe crawler image and network limits | UNKNOWN | Independently prove entry point, page cap, robots and rate limits, timeout, retry ceilings, sitemap handling |
| Public/provider-write and AI proposal gating | UNKNOWN EFFECTIVE STATE | Read-only verification of effective gates; no mutations, automatic scheduler or write capability in pilot |
| Isolated PITR recovery | PARTIAL PASS | Enough to support rollback preparedness, not full disaster-recovery certification |
| Fresh live crawl approval | NOT GRANTED | Specific single-use bounded authorization after GO review |

## Fastest safe execution sequence

1. Repository-only source audit: select the **new** limited-pilot execution entry point; do not replay Packet 014. Pin image/canonical-code compatibility, exact site selector, bounded page budget and one-shot idempotency/replay semantics. Prefer 10–30 pages only when proven safe by actual code.
2. Decide database authority or explicitly certify an isolated **non-authoritative** rehearsal against a separate safe fixture database. Do not silently treat Railway Postgres as canonical Production.
3. Propose exact sanitized *read-only* database queries for site identity and in-flight/previous crawl state, bound to service/database/source fingerprints, timeout and expected cardinalities. Obtain separate Production SQL authorization before execution.
4. Independently inspect current runtime flags/health and immutable image provenance without disclosing secrets. Confirm write gates and queue-resume state are effectively off.
5. Prepare a fresh limited run packet including origin, new run ID, page cap, crawl rate/robots, time budget, no external/provider writes, no auto-repeat, failure handling, evidence sink and abort conditions. Require explicit authorization to initiate the crawl and **any** persistence it would perform.
6. Observe first run using read-only status/receipts, preserve raw failure history; independently certify successful URLs, failure classifications and audit evidence.
7. Only then expand to new full-site crawl and recurring operation with distinct gates.

## Go/no-go conclusion

**NO-GO for a new live Diamond Shelf crawl now**, due to unresolved Production database data authority, no independently established current site identity / run-state and no bound, proven execution entry point or single-use live authorization.

**GO for repository-only source audit and bounded preflight packet design.** Do not conflate historical completed URL counts or an online Railway container with authorization to run.

No SQL, provider requests, Railway mutations, deployments or public-site activities were undertaken in this audit.

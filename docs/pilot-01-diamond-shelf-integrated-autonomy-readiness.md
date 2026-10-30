# PILOT-01 — Diamond Shelf integrated autonomous pilot readiness and acceptance

**Status:** SOURCE-ONLY PLAN / NO LIVE ACTIVATION  
**Decision:** Owner selected autonomous **analysis and recommendations**, with **separate approval before every live DiamondShelf.us change**. This document does not grant autonomous execution, crawl, Google consent, credential persistence, provider access, deployment, or publishing authority.  
**Baseline:** canonical main `d4ba2bbdba099c0d8d12a36c70cc9b4eb67098cb`, 2026-10-30.  
**Related:** #1181 (bounded pilot), #1190 (GSC), #1159 (DB), #1143 (CVI security), #1152 (startup), #1061 (UGP job transport), #1101 (Customer Home preview).  
**Scope:** exact Diamond Shelf domain `https://diamondshelf.us`, historically associated with site UUID `eb1da9ee-539c-4200-8f04-f64ccaea7768` (must be independently reverified).

## 1. Component integration matrix

The following statuses describe **evidence currently available**, not asserted deployed functionality. Offline tests and PR CI are not equivalent to live certification.

| Capability | Source / offline basis | Live acceptance gap | Initial pilot disposition |
| --- | --- | --- | --- |
| Identity, onboarding, Customer Home | Source and browser CI exist; Customer Home PR #1150 remains draft/unmerged | Authenticate actual isolated tenant, browser journey and immutable deployment provenance | Isolated preview first |
| UGP organization/site registry and adapters | UGP source workstream exists; UGP job transport compatibility #1061 open | Establish exact version, read adapters, tenant isolation, persistence/worker claim fencing, bounded budget | Offline integration test; no unattended workers |
| CVI content intelligence and review lifecycle | CVI security and startup issues #1143/#1152 open; CVI-OPS-02 PR #1234 is a draft targeting `initiative-universal-growth-platform` at inspection | Approve scoped edit/review grants, default-deny authentication, DB lock/migration handling, startup fail-closed policy and deployed provenance | Proposal/review workflow offline; no live changes |
| Crawler and technical SEO analysis | Existing offline crawl/accounting contracts; #1181 real pilot acceptance open | Robots, scope, URL cap, rate limits, immutable collector release, persistence/lineage and stop tests | Bounded real crawl only after separate approval |
| GSC/Search Analytics | Dedicated readonly OAuth design #1190 and offline safeguards | Exact Google consent, isolated refresh-token custody, real property confirmation, DB evidence write and GSC query grants | No live GSC calls until approved |
| SEO/GEO/authority intelligence | Source modules and staged studies | Real data provenance, provider cost, licensing, quota caps, claim fidelity and separately approved external reads | Offline/synthetic only until sources certified |
| Orchestration / CVI / UGP coordination | Source contracts and tests | Durable idempotent jobs, fencing, cancellation, retry quarantine, audit log and kill-switch test across services | No autonomous live scheduling until certified |
| Reporting and outcomes | User interface/analysis code | Real crawl/GSC timestamped baseline, reproducible snapshots, separated synthetic/live labels | Show synthetic vs live truthfully; no impact claims without observed data |
| Shopify changes and publishing | Existing governed provider write workflows | Distinct per-change user approval, exact diff/site/fingerprint, rollback, independent verification | **Never autonomous in initial pilot** |

## 2. Intended end-to-end behavior

Diamond Shelf identity → safe source acquisition → UGP evidence indexing → CVI/SEO/GEO reasoning → prioritized proposals and evidence links → user approval queue → separately authorized change execution → independent verification → outcome measurement. Each transition must have a verifiable grant and audit receipt; missing components fail **closed**, never silently skip a control.

**Default-off operational switches:** `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`; no unattended external acquisition, provider calls or evidence persistence without separate approval. The owner's desired future autonomy is **not** permission to flip either flag.

## 3. Phased acceptance gates

**P0 — integration inventory (this document):** verify exact source branches and merged status, interface contracts, environment boundaries, disabled defaults, test evidence and component ownership. Record blockers; no live work.

**P1 — isolated integration rehearsal:** separately approved non-Production environment, disposable isolated DB/fixtures, seeded Diamond Shelf surrogate, exact immutable source/image provenance; test UGP↔CVI↔crawler↔reporting using mocks, including tenant separation, fail closed, cancellation, replay and stop semantics. Synthetic data must be visibly labeled. No Production credentials or callbacks.

**P2 — first *real* read-only Diamond Shelf acquisition:** separately authorize exact domain and site UUID, time window, authorized max URLs, per-host requests/concurrency, robots and exclusions, data sanitation/retention and verified isolated evidence destination. Independent reviewer validates zero provider/site mutations. This does **not** authorize database writes on uncertified Production schema.

**P3 — Google Search Console evidence:** after DB G1–G5 (or separately certified isolated persistence), authorize dedicated readonly Google consent, exact property selection, credential custody and separate one-shot Search Analytics read. Define baseline date range, source timestamps, dimensions/row caps and truthful data-quality labels. OAuth consent is never an implied consequence of P2.

**P4 — bounded autonomous evidence loop:** only after each source, tenancy, queue/lease fencing, security grant, persistence and kill switch is certified, authorize scheduled read-only acquisition, UGP/CVI recommendations and reporting with defined quotas/periodicity, one-run suspension and independent monitoring. Require manual owner approval on any proposed Diamond Shelf change.

**P5 — effect measurement and pilot exit:** verify reproducible baseline and follow-up periods; report crawl reachability, index coverage where available, technical issue closure, GSC impressions/clicks/CTR/position, site conversions only if separately connected, cost per cycle, errors/retries, security incidents, approval-to-publish lineage. Do not attribute observed SEO changes to the engine without a defensible evaluation design.

## 4. Minimum acceptance evidence

For each component, record: source commit and PR; test/CI result; immutable deployed image digest; actual runtime version; environment/tenant/site identity; secrets and permissions boundary (attestation, not values); worker scheduling state; exact external read and DB write authorization; snapshot provenance; independent reviewer and UTC timestamp. Use four explicit classifications: `SOURCE_IMPLEMENTED`, `OFFLINE_TESTED`, `DEPLOYED_VERIFIED`, `LIVE_AUTHORIZED`. **Never promote a status because another status is true.**

Failure drills before autonomy: startup with missing DB, expired or absent OAuth, site UUID mismatch, two job workers claiming same item, lease expiry, network timeout, duplicate callback, provider rate limit, request budget exhaustion, unverified rollback, customer tenant mismatch and disabled auth/AI flags. Observe zero external mutation under every failure.

## 5. Blocking critical path

1. Independently reconcile UGP branch and CVI draft PR #1234 with canonical main; neither draft is assumed deployed or approved.
2. Certify safe isolated staging image, tenant and DB source/lineage; #1159 Production G1/G2–G5 remains blocked.
3. Complete CVI #1143/#1152 security, permission, lock order, startup fail-closed and rollback decisions before any autonomous runtime.
4. Establish real bounded crawler run with explicit approval and isolated evidence; #1181 remains open.
5. Complete dedicated GSC #1190 authorization and verified measurement pipeline before claiming search-performance outcomes.
6. Activate recurrent analysis only through a new, exactly scoped approval; later per-change website publication must require owner approval and verification.

## 6. Governance and stop rules

No GitHub PR merge, Railway resource change/deployment, Postgres connection/SQL/migration, token access, OAuth consent, external crawl, job activation, AI proposal activation or Shopify/site mutation follows from this plan. Keep public-site writes off; initial pilot *may* autonomously analyze and generate recommendations **only after** explicit live activation of each verified subcomponent. Every website-changing operation remains owner approved. Halt on target/tenant ambiguity, provenance mismatch, missing grant, schema uncertainty, data leakage, lost fencing, quota breach or inability to revert/verify.

**Immediate next engineering deliverable after independent review:** source-only cross-repo/branch interface and test matrix for UGP/CVI integration, followed by a separately scoped disposable P1 rehearsal proposal—not a Production deployment.

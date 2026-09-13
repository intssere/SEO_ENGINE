# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. If it conflicts with older mutable release wording in `PROJECT_HANDOFF.md`, use this file for the current release position and `PROJECT_HANDOFF.md` for historical/architectural context.

## Current production release — Task #59 fully production-certified

Task #59 — Bounded Competitor Evidence Acquisition Foundation v1 — is fully merged, published, runtime-certified, reconciled, and ready to be treated as closed.

Canonical implementation:

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/75`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/76`
- exact tested PR head: `f5c2ed87cda413489bf324ed6037c8658188c279`
- application merge / certified release source: `d5c7471a4bc788d7b0dbd63720ebe3b5f532c1b1`
- certified release tree: `e4e57b7da4dcbfc6e2db3f93c701e5155c6773f3`
- PR CI #156: success
- post-merge main CI #157: success
- Replit deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`
- publication status: success

## Task #59 behavior

Task #59 extends Task #58 with a bounded acquisition/persistence foundation while remaining default-off and non-autonomous.

The v1 contract includes:

- explicit configured competitor/source target allowlist
- callers select only configured target IDs; no arbitrary crawler frontier
- public-network / SSRF checks before every fetch hop
- same-host and path-bounded redirects
- HTTPS downgrade rejection
- strict timeout, redirect-count, response-size, and HTML content-type limits
- robots/policy gate
- transient extraction of public structural signals only
- raw competitor title/meta/H1/body copy is not retained
- every observation normalized through Task #58
- deterministic evidence IDs from `(siteId, Task58 fingerprint)`
- migration-free idempotency through the existing `evidence` primary key and `ON CONFLICT (id) DO NOTHING`
- Task #59 POST routes inherit existing API authentication, admin role enforcement, CSRF protection, and sensitive-mutation rate limiting
- no scheduler
- no autonomous worker
- no opportunity/action/proposal/execution creation
- no approval-to-execution transition

Task #59 does **not** mean competitor acquisition is currently active. The runtime gates remain closed.

## Task #59 engineering and production certification

Before publication:

- GitHub/Replit exact-synced to `d5c7471a4bc788d7b0dbd63720ebe3b5f532c1b1`
- tree `e4e57b7da4dcbfc6e2db3f93c701e5155c6773f3`
- ahead/behind `0/0`
- working tree clean
- dedicated Task #59 tests: `13/13` pass
- API typecheck: pass
- frontend typecheck: pass
- isolated API production build: pass
- isolated frontend production build: pass
- source and compiled safety markers verified
- development DB: 31 public base tables
- production DB: 31 public base tables
- Task #55 auth tables present in both
- Task #55 auth indexes: 6/6 in both
- competitor evidence: 0 in development / 0 in production
- all observed operational counters unchanged
- no real competitor page, robots.txt, acquisition route, provider mutation, or database write was invoked during certification

The user explicitly authorized publication only for the certified source above while preserving all safety gates and forbidding DDL, provider/public-site mutation, Task #53/#54 execution, scheduler/batch/autonomous-worker enablement, and secret/config/OAuth-scope changes.

Post-publication certification passed:

- `/api/healthz`: HTTP 200 / ok
- `/api/auth/status`: HTTP 200
- authentication configured and enforced
- provider: Google OIDC
- allowlist-only access enabled
- public registration disabled
- development/prod schema: 31/31 public base tables
- Task #55 auth indexes: 6/6 in both
- Task #59 collection: false
- Task #59 evidence persistence: false
- configured competitor targets: 0
- Task #59 scheduler: false
- Task #59 autonomous worker: false
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- Task #53/#54 provider dispatch disabled
- Task #53/#54 schedulers disabled
- Task #54 batch disabled
- total evidence unchanged: development 0 / production 922
- `competitor_page_observation` unchanged: development 0 / production 0
- action plans/actions/approvals/deployments/rollbacks/verifications/jobs: zero delta
- no unsafe mutation/execution markers
- no scheduler/batch activity markers
- no provider/public-site write markers
- no unexpected Task #59 acquisition/collection/persistence/robots activity
- no PostgreSQL `42883`
- no fatal/crash errors

Transient healthcheck 500 responses occurred only during process startup before the API port became ready. The deployment initialized normally and the live health endpoint returned HTTP 200 afterward.

## Replit/Git state after Task #59 publication

Publication created one empty Replit-generated metadata commit:

- SHA: `154edfe5643778395571653e09b6918f8c7d2546`
- subject: `Published your App`
- parent: `d5c7471a4bc788d7b0dbd63720ebe3b5f532c1b1`
- changed files: none
- tree: `e4e57b7da4dcbfc6e2db3f93c701e5155c6773f3`, exactly equal to the canonical parent tree

The metadata-only commit was removed without republishing.

Final reconciled Replit state before this documentation closeout:

- branch: `main`
- HEAD: `d5c7471a4bc788d7b0dbd63720ebe3b5f532c1b1`
- tree: `e4e57b7da4dcbfc6e2db3f93c701e5155c6773f3`
- `origin/main`: same
- GitHub `main`: same
- ahead/behind: `0/0`
- tracked changes: 0
- untracked files: 0
- working tree: clean
- no second publish during reconciliation

Do **not** republish solely because a documentation-only merge or metadata reconciliation advances Git history without changing the application runtime tree.

## Prior completed milestones

- Task #58 — Competitor Evidence Ingestion Foundation v1 — fully production-certified and closed. It defines the normalized competitor evidence contract and authenticated read-only projection.
- Task #57 — Measurement & Attribution Foundation v1 — fully production-certified and closed. Its advisory measurement loop remains available for future verified persistent Task #54 changes.
- Task #56 — Risk Semantics Alignment & Effective-Risk Diagnostics v1 — fully production-certified and closed.
- Task #55 — Authentication/RBAC — production-certified: Google OIDC, allowlist-only access, viewer/operator/admin roles, PostgreSQL sessions, CSRF protection, and auth auditing.
- Task #53 reversible live pilot was previously proven and rolled back successfully.
- No first persistent Task #54 live apply has occurred.

Detailed closeouts are linked from `.agents/memory/MEMORY.md`.

## Current safety state

Unless separately and explicitly authorized:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- configured competitor target count remains 0 unless intentionally changed through a reviewed engineering/configuration step
- ordinary Shopify/Google operational integrations remain read-only
- isolated write-capable credential presence is not authorization
- no autonomous public-site/provider mutation worker
- no autonomous competitor-collection worker
- no automatic approval -> execution transition
- no Task #53 execution
- no Task #54 preflight/apply
- no Task #53/#54 scheduler execution
- no Task #54 batch execution
- no production DB DDL
- no secret/credential change or OAuth-scope broadening
- no real external competitor collection run
- no production competitor-evidence persistence run

A generic `continue` advances safe engineering/documentation work only. It never authorizes external competitor collection, evidence persistence, provider/public-site mutation, production DDL, or publication.

## Current engineering milestone

The project is now at the **competitor discovery + collection planning stage**.

Task #58 supplies the normalized evidence contract. Task #59 supplies the bounded default-off collector and idempotent persistence path. The next engineering problem is deciding **which competitors and which public pages are worth observing**, and producing deterministic collection plans before any network or persistence gate is opened.

### Task #60 — Competitor Discovery + Collection Planning Foundation v1

Safe initial scope:

1. Define a canonical competitor candidate model with domain, source/reason, confidence, category/page-type relevance, provenance, and freshness.
2. Define a deterministic candidate normalization/deduplication/fingerprinting contract.
3. Accept safe candidate inputs from already-held/internal sources or manually supplied candidates in v1; no external discovery fetch is required for the first implementation.
4. Exclude the owned domain and its subdomains, malformed/credential-bearing URLs, private/local hosts, and invalid domains.
5. Rank candidates deterministically using transparent factors such as relevance, source confidence, coverage diversity, freshness, and duplication penalties.
6. Convert eligible candidates into bounded **collection plans** compatible with Task #59 allowlisted target semantics.
7. Keep planning advisory-only: no automatic target-config mutation, no network collection, no evidence persistence, no scheduler, and no autonomous worker.
8. Expose read-only planning diagnostics or an authenticated dry-run planning route if useful.
9. Add deterministic tests for normalization, dedupe, owned-domain exclusion, scoring/ranking, plan-budget bounds, and no-execution safety markers.
10. Preserve the existing 31-table schema if feasible; prefer pure planning contracts over new persistence unless a durable registry is demonstrably required later.

Task #60 should separate **discovery/planning** from **collection execution**. A candidate becoming recommended does not authorize a Task #59 network request or persistence operation.

### Likely future Task #60+ progression

After the pure planning foundation is proven safely, later separately scoped work may add discovery inputs such as:

- existing GSC/query/category signals
- search/SERP research providers
- merchant/category overlap
- user-approved competitor seeds
- backlink/citation/entity sources
- taxonomy/schema/entity comparisons

Any third-party search API, external SERP query, competitor HTTP request, recurring scheduler, or automatic target-list mutation should remain separately gated until its source, cost, rate limit, terms, provenance, and failure behavior are explicitly designed and tested.

## Persistent Task #54 remains separately gated

A previously diagnosed possible first persistent candidate remains Unisex Fragrance:

- Plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- Proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- field: `meta_description`
- diagnosed current value: `null`
- proposed value: `Unisex Fragrance groups Gift Set, Perfume & Cologne, and Perfume Oils in one collection, keeping these related product types together for comparison.`
- proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- evaluator risk: `medium`
- plan-control risk: `blocked`
- effective execution risk: `medium`
- lifecycle at diagnosis: `approval_ready`
- approvals/actions/deployments at diagnosis: `0 / 0 / 0`

Tasks #56/#57/#58/#59 do not approve or authorize it.

Before any first persistent Task #54 apply, preserve the existing multi-gate sequence: verify current GitHub/Replit/runtime state, obtain exact proposal approval and Task #51 authorization, separately authorize write-gate opening and Task #54 preflight, generate a fresh preflight fingerprint, obtain exact `APPLY_AND_VERIFY_TASK54` authorization, execute one bounded mutation, read-after-write verify, and then enter Task #57 measurement mode. Never collapse those gates.

## Exact next project stage

Task #59 is closed. The next safe work is **Task #60 engineering** for competitor discovery and collection planning with no external collection, no competitor evidence persistence, no scheduler/autonomy, and no public-site/provider mutation.

The intended sequence is:

1. formalize Task #60 issue and invariants
2. branch from exact current `main`
3. implement pure candidate normalization/ranking/planning contracts
4. add network-free deterministic tests
5. PR + exact-head CI
6. merge exact tested head
7. post-merge main CI
8. exact-sync Replit
9. certify default-off/no-network/no-persistence behavior
10. obtain separate publication authorization if runtime code changes are to be published

## Resume rule

At the beginning of a new chat, resolve current GitHub `main` SHA/tree first, then read:

1. `CURRENT_STATE.md`
2. `AGENTS.md`
3. `PROJECT_HANDOFF.md`
4. `ARCHITECTURE.md`
5. `.agents/skills/seo-engine-project/SKILL.md`
6. `.agents/memory/MEMORY.md`
7. relevant linked memory notes

Stop rather than improvise on schema mismatch, missing auth objects, unexpectedly open write/AI/competitor/Task #53/#54 gates, unexplained Replit code drift, failed validation, or unexpected external/provider/public-site mutation activity.
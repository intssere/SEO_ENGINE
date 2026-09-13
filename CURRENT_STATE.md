# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. If it conflicts with older mutable release wording in `PROJECT_HANDOFF.md`, use this file for the current release position and `PROJECT_HANDOFF.md` for historical/architectural context.

## Current production release — Task #60 fully production-certified

Task #60 — Competitor Discovery + Collection Planning Foundation v1 — is fully merged, published, runtime-certified, reconciled, and closed.

Canonical Task #60 release:

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/78`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/79`
- exact tested PR head: `3b4ec7e97633cff5c1b4bbd3461c5a35d0c86139`
- certified application merge/source: `06e90582082b9e850af25add3ce6dc9d83a2b7cd`
- certified tree: `76a5974fbd75c5267bdf78d6747aa0a6d90da504`
- PR CI #160: success
- post-merge main CI #161: success
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`
- publication status: success

## Task #60 behavior

Task #60 is a pure advisory planning layer. It accepts already-held/manual competitor candidate inputs and deterministically produces bounded proposed targets compatible with Task #59 semantics.

It provides:

- canonical candidate normalization
- owned-domain/subdomain rejection
- malformed, credential-bearing, unsupported scheme/port, IP-literal and special-use-host rejection
- deterministic SHA-256 fingerprints and stable deduplication
- explainable confidence/relevance/freshness/coverage/overlap scoring
- deterministic ranking
- diversity-aware selection across competitor domains
- hard budgets for competitors, URLs per competitor and total proposed targets
- provenance and diagnostics
- Task #59-compatible proposed target structures
- fixed safety markers showing advisory-only/no-network/no-persistence/no-target-mutation/no-scheduler/no-worker/no-public-write/no-execution state

Task #60 added no API route, HTTP client, DNS resolver, database client, migration, runtime-readiness dependency, scheduler, worker, or target-config mutation path.

## Task #60 certification

Engineering certification before publication:

- GitHub/Replit exact-synced at `06e90582082b9e850af25add3ce6dc9d83a2b7cd`
- tree `76a5974fbd75c5267bdf78d6747aa0a6d90da504`
- clean `0/0`
- dedicated tests: `13/13` pass
- API/frontend no-emit typechecks: pass
- isolated API/frontend production builds: pass
- isolated compiled Task #60 safety-value verification: pass
- development/prod schema: 31/31 public base tables
- Task #55 auth tables present; auth indexes 6/6 in both
- all competitor/public-write/execution gates closed
- no operational counter deltas

The user explicitly authorized publication only for certified canonical source `06e90582082b9e850af25add3ce6dc9d83a2b7cd`, while requiring external discovery, Task #59 collection, evidence persistence, target-config mutation, public writes, Task #53/#54 execution, schedulers/batch/workers, DDL, and secret/config/OAuth changes to remain disabled/prohibited.

Post-publication certification passed:

- `/api/healthz`: HTTP 200 / ok
- `/api/auth/status`: HTTP 200
- Google OIDC configured/enforced
- allowlist-only access enabled
- public registration disabled
- development/prod schema: 31/31
- Task #55 auth indexes: 6/6 in both
- Task #60 network collection authorization: false
- Task #60 target-config mutation: false
- Task #60 scheduler/autonomous worker: false
- Task #59 collection: false
- competitor evidence persistence: false
- configured competitor targets: 0
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- Task #53/#54 provider dispatch disabled
- Task #53/#54 schedulers disabled
- Task #54 batch execution disabled
- evidence/action-plan/action/approval/deployment/rollback/verification/job counts: zero delta
- `competitor_page_observation`: 0 in development / 0 in production
- no unsafe mutation/execution activity
- no scheduler/batch/autonomous activity
- no unexpected competitor discovery/collection/persistence
- no provider/public-site writes
- no PostgreSQL `42883`
- no fatal/crash errors

Transient startup healthcheck 500s stopped once the API was ready; current production health returned HTTP 200.

Publication created one empty Replit metadata commit `679ec76333cd4eb938ddcd9fbc7230c9c9520915` with zero changed files and the exact canonical tree. It was removed without republishing.

Final reconciled Replit state before this documentation closeout:

- branch: `main`
- HEAD/origin/main/GitHub main: `06e90582082b9e850af25add3ce6dc9d83a2b7cd`
- tree: `76a5974fbd75c5267bdf78d6747aa0a6d90da504`
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean
- no second publish

## Prior completed milestones

- Task #59 — bounded competitor acquisition/persistence foundation — production-certified and closed. Runtime collection and persistence remain disabled by default.
- Task #58 — normalized competitor evidence contract/read projection — production-certified and closed.
- Task #57 — measurement and attribution foundation — production-certified and closed.
- Task #56 — risk semantics alignment — production-certified and closed.
- Task #55 — authentication/RBAC — production-certified: Google OIDC, allowlist-only access, viewer/operator/admin roles, PostgreSQL sessions, CSRF and auth auditing.
- Task #53 reversible live pilot was proven and rolled back successfully.
- No first persistent Task #54 live apply has occurred.

Detailed closeouts are linked from `.agents/memory/MEMORY.md`.

## Current safety state

Unless separately and explicitly authorized:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- configured competitor targets remain 0
- Task #60 planning does not authorize target activation
- no automatic Task #60 plan -> Task #59 active-target transition
- no autonomous competitor discovery/collection worker
- no scheduler/batch collection
- no Task #53 execution
- no Task #54 preflight/apply
- no Task #53/#54 scheduler execution
- no Task #54 batch execution
- no production DB DDL
- no secret/credential change or OAuth-scope broadening
- no real external competitor discovery/collection
- no production competitor-evidence persistence

A generic `continue` advances safe engineering/documentation work only. It never authorizes target activation, external collection, persistence, provider/public-site mutation, production DDL, or publication.

## Current engineering milestone — Task #61

The project is now at the **controlled target registration + live-discovery preflight stage**.

Task #58 defines what competitor evidence looks like. Task #59 can perform bounded collection/persistence but remains default-off. Task #60 can decide which competitor candidates/pages are worth observing but cannot activate them. The missing layer is an auditable bridge from an advisory Task #60 plan to a reviewed target-registration/preflight contract without automatically changing runtime target configuration or making any network request.

### Recommended Task #61 — Controlled Competitor Target Registration & Collection Preflight Foundation v1

Safe v1 scope:

1. Define a deterministic target-registration proposal derived from a Task #60 proposed target.
2. Preserve source plan fingerprint, candidate fingerprint, provenance, score/diagnostics, requested target URL/path prefix, confidence, page type and review timestamp.
3. Produce a stable registration fingerprint and stable proposal ID.
4. Validate that the proposed target still satisfies Task #59 structural target constraints and Task #60 safety rules.
5. Add lifecycle states such as `proposed`, `review_ready`, `authorized_for_registration`, `expired`, `rejected`, while keeping actual target-config mutation out of scope initially.
6. Add explicit expiry/TTL and stale-plan rejection.
7. Define an exact authorization string for a future registration step, but do not treat generic `continue` as that authorization.
8. Provide dry-run/read-only preflight diagnostics only in the first implementation.
9. No automatic plan -> registered target transition.
10. No external HTTP/robots/SERP request, no Task #59 collection, no evidence persistence, no scheduler/worker, no public-site/provider mutation.
11. Preserve the existing 31-table schema if feasible; prefer pure contracts over persistence in v1.
12. Add deterministic network-free tests.

### Critical security review before any real Task #59 collection

Task #59 validates DNS results as public before each native fetch, but native fetch can re-resolve the hostname. That leaves a DNS TOCTOU/rebinding risk because the transport is not pinned to the already validated IP.

Before any real competitor HTTP request is authorized, Task #61 or a dedicated security-hardening milestone should ensure the outbound connection cannot resolve to a private/special-use address after validation. Acceptable designs include a validated-IP-pinned transport or an equivalent connection-level SSRF control, with redirect-hop revalidation and TLS hostname verification preserved.

Real collection remains separately prohibited until this is reviewed and certified.

## Persistent Task #54 remains separately gated

The previously diagnosed possible first persistent candidate remains Unisex Fragrance:

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

Tasks #56-#60 do not approve or authorize it.

Before any first persistent Task #54 apply, preserve the existing multi-gate sequence and never infer live-write permission from `continue`.

## Exact next project stage

Task #60 is closed. Safe next work is Task #61 engineering only:

1. formalize Task #61 issue/invariants
2. branch from exact current `main`
3. implement pure target-registration proposal/preflight contracts
4. add TTL/staleness/fingerprint/authorization tests
5. keep target configuration unchanged and collection/persistence disabled
6. PR + exact-head CI
7. merge exact tested head
8. post-merge main CI
9. exact-sync Replit
10. certify no-network/no-persistence/no-target-mutation behavior
11. obtain separate publication authorization if runtime code changes are to be published

## Resume rule

At the beginning of a new chat, resolve current GitHub `main` SHA/tree first, then read:

1. `CURRENT_STATE.md`
2. `AGENTS.md`
3. `PROJECT_HANDOFF.md`
4. `ARCHITECTURE.md`
5. `.agents/skills/seo-engine-project/SKILL.md`
6. `.agents/memory/MEMORY.md`
7. relevant linked memory notes

Stop rather than improvise on schema mismatch, missing auth objects, unexpectedly open write/AI/competitor/Task #53/#54 gates, unexplained Replit drift, failed validation, or unexpected external/provider/public-site mutation activity.
# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. If it conflicts with older mutable release wording in `PROJECT_HANDOFF.md`, use this file for the current release position and `PROJECT_HANDOFF.md` for historical/architectural context.

## Current production release — Task #62 fully production-certified

Task #62 — Secure Competitor Collection Transport & DNS-Rebinding/SSRF Hardening Foundation v1 — is fully merged, published, runtime-certified, reconciled, and closed.

Canonical Task #62 release:

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/84`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/85`
- exact tested PR head: `e3a3a1572cd4dc3fbae7eba629aa21f9d60a5a8d`
- certified application merge/source: `e96563d093902dc115eb2d0747d414dec1cef4ee`
- certified tree: `f50f4364c2a7870b02823127e70a3de577810d67`
- PR CI #170: success
- post-merge main CI #171: success
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`
- publication status: success
- pre-publication certification comment: issue #84 comment `5654790826`
- production certification comment: issue #84 comment `5654866625`

## Task #62 behavior

Task #62 hardens the existing Task #59 competitor-acquisition network path against DNS TOCTOU/rebinding and SSRF bypass at connection establishment.

It provides:

- controlled hostname resolution
- rejection if any resolved address is private, loopback, link-local, reserved, multicast, documentation, or otherwise non-public
- validated-IP pinning into the actual TCP connection target
- no connection-time hostname re-resolution after validation
- preservation of the original hostname for HTTP `Host`
- preservation of the original hostname for TLS SNI and certificate hostname verification
- TLS certificate verification retained
- no ambient HTTP/HTTPS proxy routing for the hardened request path
- fresh resolution and pinning per request
- revalidation/repinning on every existing Task #59 redirect hop
- existing redirect limits, same-host checks, allowlisted-path checks, HTTPS-downgrade rejection, timeout, response-size, content-type, and robots/policy controls retained
- rejection of credential-bearing URLs and sensitive forwarding headers
- explicit capability markers for controlled resolution, public-address validation, connection pinning, rebinding mitigation, TLS verification, redirect-hop revalidation, and disabled ambient proxy routing

Task #62 does **not** activate collection, target registration, target mutation, persistence, scheduling, or autonomous work.

## Task #62 production certification

Engineering certification before publication:

- dedicated Task #62 tests: `11/11` pass
- full workspace tests: pass
- API/frontend no-emit typechecks: pass
- isolated API/frontend production builds: pass
- compiled secure-transport capability verification: pass
- GitHub/Replit exact-synced to `e96563d093902dc115eb2d0747d414dec1cef4ee`
- tree `f50f4364c2a7870b02823127e70a3de577810d67`
- clean `0/0`
- development/prod schema: 31/31 public base tables
- Task #55 auth tables present; auth indexes 6/6 in both
- all competitor/public-write/execution gates closed
- configured competitor targets: 0
- no operational counter deltas
- no real competitor HTTP, DNS, robots, SERP, or acquisition route invoked during certification

The first Task #62 CI head passed functional tests but exposed a TypeScript-only test assertion issue. The test helper was corrected without changing transport behavior; exact head `e3a3a157...` then passed complete CI before merge.

The user explicitly authorized publication only for certified canonical source `e96563d093902dc115eb2d0747d414dec1cef4ee`, while keeping target registration inactive, target mutation disabled, real competitor discovery/collection disabled, Task #59 collection/persistence disabled, schedulers/workers/batch disabled, public/provider writes disabled, Task #53/#54 execution disabled, DDL prohibited, secrets/config/OAuth unchanged, and no real competitor HTTP/DNS/robots/SERP request during certification.

Post-publication certification passed:

- `/api/healthz`: HTTP 200 / ok
- `/api/auth/status`: HTTP 200; authentication enforcement enabled
- development/prod schema: 31/31
- Task #55 auth indexes: 6/6 in both
- Task #59 collection: false
- competitor evidence persistence: false
- configured competitor targets: 0
- Task #61 target registration inactive
- Task #61 target-configuration mutation disabled
- `networkCollectionReady=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- Task #53/#54 provider dispatch disabled
- Task #53/#54 schedulers disabled
- Task #54 batch disabled
- Task #59 scheduler/autonomous worker disabled
- evidence/action-plan/action/approval/deployment/rollback/verification/job counts: zero delta
- `competitor_page_observation`: 0 in development / 0 in production
- no competitor acquisition/collection/persistence/robots/SERP/provider/public-site activity observed
- no fatal/crash/panic/unhandled runtime errors observed
- no PostgreSQL `42883` errors observed

Production counts remained:

- evidence: 922
- competitor evidence: 0
- action_plans: 30
- actions: 1
- approvals: 4
- deployments: 1
- rollbacks: 2
- verifications: 3
- jobs: 22

Publication created one empty Replit metadata commit `ae4fad14a55bfed3f1f08fb786139364702bb715` with the exact canonical tree. It was removed without republishing.

Final reconciled Replit state before this documentation closeout:

- branch: `main`
- HEAD/origin/main/GitHub main: `e96563d093902dc115eb2d0747d414dec1cef4ee`
- tree: `f50f4364c2a7870b02823127e70a3de577810d67`
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean
- no cleanup republish

Detailed closeout: `.agents/memory/task62-production-closeout.md`.

## Prior completed milestones

- Task #61 — controlled target-registration/collection-preflight foundation — production-certified and closed; no target activation occurred.
- Task #60 — competitor discovery/planning foundation — production-certified and closed.
- Task #59 — bounded competitor acquisition/persistence foundation — production-certified and closed; runtime collection and persistence remain disabled.
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
- Task #61 target registration remains inactive
- Task #61 cannot mutate active target configuration
- `networkCollectionReady=false`
- no automatic Task #60 plan -> Task #61 proposal -> Task #59 active-target transition
- no real external competitor discovery/collection
- no production competitor-evidence persistence
- no autonomous competitor discovery/collection worker
- no scheduler/batch collection
- no Task #53 execution
- no Task #54 preflight/apply
- no Task #53/#54 scheduler execution
- no Task #54 batch execution
- no production DB DDL
- no secret/credential change or OAuth-scope broadening

A generic `continue` advances safe engineering/documentation work only. It never authorizes target activation, external collection, persistence, provider/public-site mutation, production DDL, or publication.

## Security status after Task #62

The previous DNS TOCTOU/rebinding gap is now closed in the hardened Task #62 transport: the actual connection target is bound to a validated public address while the original hostname is retained for TLS SNI, certificate hostname verification, and Host semantics.

This security improvement removes the prior transport blocker, but it is **not itself collection authorization**.

Therefore:

- a valid Task #60 proposed target is still not an active target
- an authorization-ready Task #61 registration proposal is still not an active target
- Task #59 collection remains disabled
- no real competitor request should occur under generic `continue`
- a one-target pilot must have its own deterministic preflight and separate exact authorization
- persistence remains a later, separate authorization boundary

## Current engineering milestone — Task #63

The project is now at the **controlled one-target pilot-readiness stage**.

### Recommended Task #63 — Controlled One-Target Competitor Collection Pilot Readiness Foundation v1

Safe v1 scope:

1. Define a deterministic one-target pilot plan/preflight contract derived from a reviewed Task #61 registration proposal or equivalent validated Task #59-compatible target.
2. Preserve exact lineage to source plan/proposal/target fingerprints.
3. Revalidate target structure and Task #62 transport capability without performing a real external request.
4. Require an explicit pilot TTL and reject stale/tampered plans.
5. Encode a bounded one-target/one-run/zero-persistence budget.
6. Require collection mode to remain dry-run/read-only and prevent evidence persistence.
7. Define an exact future live-dry-run authorization string bound to pilot ID + fingerprint.
8. Do not consume that authorization in v1 unless separately scoped and reviewed.
9. Keep configured active targets unchanged and do not mutate `COMPETITOR_COLLECTION_TARGETS_JSON` or equivalent runtime configuration.
10. Keep `COMPETITOR_COLLECTION_ENABLED=false`, evidence persistence false, and `networkCollectionReady=false` throughout engineering.
11. Add deterministic network-free tests for lineage, TTL, tampering, target mismatch, budget violations, transport-capability mismatch, and authorization-string determinism.
12. Add no scheduler/worker, no DB migration, no target activation, no external competitor request, no robots/SERP request, and no public/provider mutation.
13. Publication remains a separate explicit authorization boundary.
14. After Task #63 is production-certified, a **real one-target dry-run** must still require separate explicit authorization and must initially remain non-persistent.

Task #63 should prepare the control plane for a pilot; it must not silently turn the hardened transport into autonomous crawling.

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

Tasks #56-#62 do not approve or authorize it.

Before any first persistent Task #54 apply, preserve the existing multi-gate sequence and never infer live-write permission from `continue`.

## Exact next project stage

Task #62 is closed. Safe next work is Task #63 engineering only:

1. formalize Task #63 issue/invariants
2. branch from exact current canonical GitHub `main`
3. implement deterministic one-target pilot-readiness/preflight logic only
4. add network-free deterministic tests
5. keep target configuration unchanged and collection/persistence disabled
6. PR + exact-head CI
7. merge exact tested head
8. post-merge main CI
9. exact-sync Replit
10. certify no real network collection and no state mutation
11. obtain separate publication authorization if runtime code changes are to be published
12. after production certification, separately authorize any real one-target dry-run; do not infer live pilot authorization from Task #63 publication

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
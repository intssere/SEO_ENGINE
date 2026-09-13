# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. If it conflicts with older mutable release wording in `PROJECT_HANDOFF.md`, use this file for the current release position and `PROJECT_HANDOFF.md` for historical/architectural context.

## Current production release — Task #61 fully production-certified

Task #61 — Controlled Competitor Target Registration & Collection Preflight Foundation v1 — is fully merged, published, runtime-certified, reconciled, and closed.

Canonical Task #61 release:

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/81`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/82`
- exact tested PR head: `7200e416a45ed1dc3102075b62d6d8c6a1731fff`
- certified application merge/source: `e9a1ba7a769368356f0f7e9d2a741fba5e477d18`
- certified tree: `6c85ec058182a554a1a8e2c77de2b21861b86afc`
- PR CI #165: success
- post-merge main CI #166: success
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`
- publication status: success

## Task #61 behavior

Task #61 is a pure, deterministic, network-free bridge from Task #60 advisory competitor plans to reviewed target-registration / collection-preflight proposals.

It provides:

- deterministic Task #60 source-plan lineage fingerprinting
- deterministic registration proposal fingerprinting and stable proposal IDs
- candidate/score/target lineage preservation
- strict Task #59-compatible structural target validation
- owned-domain/subdomain rejection
- special-use host and IP-literal rejection
- credential/query/fragment/unsupported target rejection
- allowed-path-prefix validation
- proposal TTL and source-plan staleness checks
- tamper detection
- advisory lifecycle states: proposed, review-ready, authorization-ready, expired, rejected
- exact future registration authorization wording bound to proposal ID + fingerprint
- fixed safety markers that authorize no registration/config/network/persistence/scheduler/worker/public-write/execution action
- explicit `networkCollectionReady=false`
- explicit `transportHardeningRequired=true`

Future exact registration authorization namespace:

`AUTHORIZE_COMPETITOR_TARGET_REGISTRATION:<proposalId>:<registrationFingerprint>`

Task #61 v1 does **not** consume that authorization and does **not** mutate active target configuration.

## Task #61 production certification

Engineering certification before publication:

- dedicated Task #61 tests: `13/13` pass
- API/frontend no-emit typechecks: pass
- isolated API/frontend production builds: pass
- compiled Task #61 safety-marker verification: pass
- GitHub/Replit exact-synced to `e9a1ba7a769368356f0f7e9d2a741fba5e477d18`
- tree `6c85ec058182a554a1a8e2c77de2b21861b86afc`
- clean `0/0`
- development/prod schema: 31/31 public base tables
- Task #55 auth tables present; auth indexes 6/6 in both
- all competitor/public-write/execution gates closed
- no operational counter deltas

The first PR CI attempt passed tests but exposed a TypeScript-only test-helper narrowing issue. The test helper was corrected; exact head `7200e416...` then passed complete CI before merge.

The user explicitly authorized publication only for certified canonical source `e9a1ba7a769368356f0f7e9d2a741fba5e477d18`, while keeping target registration inactive, target mutation disabled, real competitor discovery/collection disabled, Task #59 collection/persistence disabled, schedulers/workers/batch disabled, public/provider writes disabled, Task #53/#54 execution disabled, DDL prohibited, and secrets/config/OAuth unchanged.

Post-publication certification passed:

- `/api/healthz`: HTTP 200 / ok
- development/prod schema: 31/31
- Task #55 auth indexes: 6/6 in both
- Task #59 collection: false
- competitor evidence persistence: false
- configured competitor targets: 0
- Task #61 targetRegistrationAuthorized: false
- Task #61 targetConfigurationMutationAuthorized: false
- Task #61 networkCollectionReady: false
- Task #61 transportHardeningRequired: true
- Task #61 scheduler/autonomous worker/public-site writes/execution authorization: false
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- Task #53/#54 provider dispatch disabled
- Task #53/#54 schedulers disabled
- Task #54 batch execution disabled
- evidence/action-plan/action/approval/deployment/rollback/verification/job counts: zero delta
- `competitor_page_observation`: 0 in development / 0 in production
- no competitor collection route/provider/site/DNS/robots/SERP contact during certification
- no unsafe mutation/execution activity

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

Publication created one empty Replit metadata commit `b94d569e7191f7023957774dba3739b97c217786` with the exact canonical tree. It was removed without republishing.

Final reconciled Replit state before this documentation closeout:

- branch: `main`
- HEAD/origin/main/GitHub main: `e9a1ba7a769368356f0f7e9d2a741fba5e477d18`
- tree: `6c85ec058182a554a1a8e2c77de2b21861b86afc`
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean
- no cleanup republish

Detailed closeout: `.agents/memory/task61-production-closeout.md`.

## Prior completed milestones

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
- `transportHardeningRequired=true`
- no automatic Task #60 plan -> Task #61 proposal -> Task #59 active-target transition
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

## Critical security boundary before any real competitor collection

Task #59 validates DNS results as public before native fetch, but native fetch may independently re-resolve the hostname. This leaves a DNS TOCTOU/rebinding risk because connection establishment is not bound to the previously validated public address.

Therefore:

- a valid Task #60 proposed target is not enough
- an authorization-ready Task #61 registration proposal is not enough
- enabling Task #59 collection is not permitted yet
- no real competitor HTTP request may be authorized until connection-level SSRF hardening is implemented, reviewed, and certified

The hardened design must preserve TLS hostname/SNI verification and must revalidate/rebind safely on every redirect hop.

## Current engineering milestone — Task #62

The project is now at the **secure outbound transport / SSRF hardening stage**.

### Recommended Task #62 — Secure Competitor Collection Transport & DNS-Rebinding Hardening Foundation v1

Safe v1 scope:

1. Introduce a transport abstraction that separates target validation from connection establishment.
2. Resolve target hostnames through a controlled resolver and reject any non-public/special-use result.
3. Bind the outbound connection to a validated address or equivalent connection-level control so DNS rebinding/TOCTOU cannot redirect the connection into private/special-use space.
4. Preserve TLS certificate/hostname verification and SNI for HTTPS requests even when the validated address is pinned.
5. Re-run validation and establish a newly pinned/controlled connection for every redirect hop.
6. Continue enforcing same-host/allowlisted-path/HTTPS-downgrade/redirect-count rules from Task #59 unless explicitly tightened.
7. Prevent ambient proxy, environment proxy, alternate dispatcher, or other runtime networking behavior from bypassing the transport guard.
8. Keep response-size, timeout, content-type, and robots/policy controls bounded and fail-closed.
9. Keep `COMPETITOR_COLLECTION_ENABLED=false`, evidence persistence false, configured targets 0, and `networkCollectionReady=false` throughout Task #62 engineering.
10. Add deterministic network-free unit tests plus local mocked transport tests for rebinding, multiple A/AAAA answers, redirect hops, TLS hostname handling, private/special-use address rejection, timeout, and proxy bypass attempts.
11. Add no scheduler/worker, no target activation, no external competitor request, no evidence persistence, no schema migration, and no public/provider mutation.
12. Publication remains a separate explicit authorization boundary.

A later one-target real dry-run pilot must be separately authorized after Task #62 is production-certified. Persistence must remain a later separate authorization step.

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

Tasks #56-#61 do not approve or authorize it.

Before any first persistent Task #54 apply, preserve the existing multi-gate sequence and never infer live-write permission from `continue`.

## Exact next project stage

Task #61 is closed. Safe next work is Task #62 engineering only:

1. formalize Task #62 issue/invariants
2. branch from exact current canonical GitHub `main`
3. implement connection-level SSRF/DNS-rebinding hardening behind default-off collection gates
4. add deterministic network-free/mock-transport tests
5. keep target configuration unchanged and collection/persistence disabled
6. PR + exact-head CI
7. merge exact tested head
8. post-merge main CI
9. exact-sync Replit
10. certify no real network collection and no state mutation
11. obtain separate publication authorization if runtime code changes are to be published
12. after production certification, separately scope a one-target dry-run live collection pilot; do not infer pilot authorization from Task #62 publication

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
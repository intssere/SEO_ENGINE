# SEO ENGINE — Agent Operating Contract

This file is the normative operating contract for any human or AI agent working in this repository. Read it before changing code, data, configuration, deployments, or provider state.

The durable full-path program plan is `MASTER_COMPLETION_ROADMAP.md`, tracked by GitHub program issue #139. The roadmap is planning/continuity only and never overrides the execution and authorization rules in this contract.

## 1. Canonical systems

- Canonical source repository: `intssere/SEO_ENGINE` on GitHub.
- Canonical development history: GitHub branches, pull requests, and GitHub Actions.
- Replit app: `SEO_ENGINE`, replId `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`.
- Production URL: `https://dsseoengine.replit.app`.
- Replit is a deployment/runtime target, not the source of truth.
- Never preserve a Replit-generated commit merely because Replit created it. Compare its tree with GitHub first. Metadata-only publish commits and incidental `.replit` module edits should normally be discarded after certification unless intentionally required.

## 2. Mandatory engineering workflow

For every engineering change:

1. Confirm the current canonical GitHub `main` SHA and clean baseline.
2. Create a dedicated GitHub task branch from that exact SHA.
3. Implement only the scoped task.
4. Run focused tests, full relevant tests, typechecks, generated-code checks, build checks, and `git diff --check`.
5. Push the task branch.
6. Open a PR against `main`.
7. Require PR CI to complete successfully.
8. Merge the exact tested PR head SHA; do not merge a moved head without rechecking CI.
9. Require post-merge `main` CI to complete successfully.
10. Exact-sync the merged GitHub `main` to Replit.
11. Rebuild and certify tests/typechecks/bundles/runtime markers in Replit.
12. Publish only when publication is actually required and explicitly authorized when the current workflow requires authorization.
13. Runtime-certify the live deployment using the least-privileged checks possible.
14. Reconcile Replit-only publish/configuration commits back to canonical GitHub state without republishing merely for reconciliation.
15. Do not begin the next engineering task until the current task is certified.

A short user message such as `continue` authorizes continuation of the current safe engineering workflow. It does **not** authorize provider writes, public-site mutation, Task #53/#54 execution, credential changes, database DDL, or destructive recovery steps unless those actions were already explicitly authorized.

## 3. Permanent safety invariants

Unless the user gives exact, specific authorization for a bounded action:

- `PUBLIC_SITE_WRITES_ENABLED=false` must remain effective.
- `AI_PROPOSAL_GENERATION_ENABLED=false` must remain effective.
- Ordinary Shopify and Google connections stay read-only.
- The isolated Task #53/#54 Shopify credential may retain its existing write scope; possession of that scope is not execution authorization.
- Do not broaden provider scopes or supported mutation fields casually.
- No autonomous scheduler/worker may perform public-site or provider mutations.
- No automatic transition from proposal/approval to execution.
- Do not invoke Task #53/#54 preflight, execute, or apply from a generic `continue` instruction.
- Do not mutate Shopify or the public site merely to test a code path.
- Do not overwrite production plan data merely to make labels or reporting fields agree.
- Fail closed on stale state, incomplete evidence, schema mismatch, unknown authorization, ambiguous target identity, or verification uncertainty.

- P9.6 worker-control artifacts are review-only. A generic `continue` never activates a worker, scheduler, retry loop, durable pause/kill state, queue claim, provider/crawl request, persistence, deployment, or publication.
- Worker-control precedence is `kill > drain > pause > running`. Pause/drain may allow already in-flight work to continue, but cannot admit new claims or reset P9.5 history.
- A killed worker state cannot ordinary-resume. Started or outcome-uncertain killed work requires manual-intervention reconciliation; dead-letter/no-work items must never be revived through resume.
- Pause/drain/kill/resume must never reset P9.5 attempts/backoff/idempotency, extend the original P9.1 work window, or create catch-up/backfill.

- P9.7 recommendation-generation artifacts are review-only. They must use deterministic supplied/synthetic P6 lineage; do not call the AI proposal runtime, enable `AI_PROPOSAL_GENERATION_ENABLED`, persist proposals, grant approval, create Task #51 authorization, or execute provider/site changes from generic continuation.
- P9.7 `proposal_review` is not a ProposalRecord and is not approval-ready by implication. A changed P6.6 preview is a prerequisite for approval-class review, not proof that the proposed state is better, safe, approved, or executable.
- P9.8 autonomous-mutation architecture review is complete, but implementation remains blocked. Generic `continue` does not authorize P9.8 implementation/activation, Task #51/#53/#54 execution, new write credentials/scopes, public-site/provider mutation, Production DB writes, deployment, or publication.
- The first future P9.8 autonomous canary class is limited to Shopify **product SEO `meta_description`** under the existing isolated `write_products` authority. Collection metadata, SEO title, media alt, visible content, handles and new provider scopes remain outside that initial class.
- A future autonomous worker must consume exact P9.7 `proposal_review` lineage through a separately certified governed-proposal materialization bridge. P9.7 review artifacts must never be treated directly as ProposalRecords or executable actions.
- A future policy grant must be explicit, immutable/versioned, expiring/revocable and created outside the worker. The worker must never create, broaden, renew or self-approve its own mutation authority.
- Future policy authorization must remain distinct from human approval provenance. Do not fabricate an `approvals` row or human actor to satisfy Task #51, and do not fabricate the current Task #54 `APPLY_AND_VERIFY_TASK54` confirmation to simulate human confirmation.
- Mutation pause/drain/kill blocks new forward writes. If a provider side effect may already have occurred, independent reconciliation and the single bounded rollback path remain mandatory safety closure; uncertain closure enters manual intervention and blocks further autonomous mutation.

- P10.1 unified-change-timeline artifacts are deterministic/read-only chronology and direct-lineage projections only. Do not infer missing page/query/category association, execution success, impact or causality from timestamp proximity or event ordering.
- P10.1 unknown/unavailable facts must remain null/unavailable; exact source replay may dedupe, but conflicting replay for the same source identity must fail closed. Timeline ordering must never be treated as priority, risk, quality or execution preference.
- P10.2 direct action attribution is deterministic/read-only. Only the same explicit non-null P10.1 `lineage.actionId` may bind page/query/category facts to an action; shared plan/opportunity/proposal, matching URL/path, timestamp proximity, event order or metric movement must never fill missing association.
- P10.2 unavailable associations must remain unavailable. Direct page identity conflicts fail closed, and multiple explicit query/category values remain provenance-bound sets rather than confidence-ranked or semantically expanded associations.
- P10.2 association is lineage, not causality or impact.
- P10.3 window/confounder analysis is deterministic/read-only. It must independently verify exact P10.1→P10.2 lineage, bind to one exact action ID, and accept an anchor only from exact same-action `verified_change_retained_live` evidence.
- P10.3 window bounds are caller-supplied only. Missing anchors/windows remain unavailable; never infer duration, lag, cooldown, significance threshold or causal frame from timestamps.
- P10.3 observations may enter before/after membership only when every supplied non-null site/page/query/category scope dimension directly matches exact P10.2 association. Fuzzy URL/path matching, semantic query/category expansion, shared upstream lineage and timestamp proximity must not broaden scope.
- P10.3 confounder flags are direct descriptive evidence only. Same-action uncertainty/rollback/manual-intervention and overlapping directly associated actions do not establish that a confounder affected an outcome and do not perform causal adjustment.
- P10.3 must not calculate metric deltas, confidence, recommendation, causal effect or impact. Chronology, association, window membership, confounder overlap and future experiment/causal analysis remain separate layers.
- P10.4 experiment/holdout analysis is deterministic/read-only. It must independently verify exact P10.1→P10.2→P10.3 treatment lineage and reuse the exact P10.3 retained-live anchor and supplied before/after windows.
- P10.4 holdouts are caller-supplied analysis definitions only. The engine must never create a live assignment, invent a pseudo-control, broaden holdout scope, or infer a holdout from unrelated observations.
- P10.4 assignment-basis labels are provenance only. `externally_randomized` and `externally_matched` do not mean the engine verified randomization, balance, matching quality, comparability or exchangeability.
- P10.4 holdout observations must match exact declared unit scope. Cross-arm overlap, other-action overlap, treatment confounders and missing coverage are descriptive structural flags only and do not perform causal adjustment.
- P10.4 must not calculate treatment effect, metric delta, confidence intervals, p-values/significance, experiment success/failure, winner/loser or rollout/retain/rollback recommendations. Chronology, association, window membership, confounders, experiment structure and future outcome/causal analysis remain separate layers.
- P10.5 expected-vs-actual tracking is deterministic/read-only. It must independently verify exact P10.4 integrity, preserve the exact P10.1–P10.4 lineage chain and bind outcomes only to exact supplied metric/target/scope/after-window facts.
- P10.5 numeric values must remain bounded canonical decimals with exact arithmetic. Signed difference is `actual - expected`; above/equal/below is numeric order only. Do not calculate percentage change, uplift, treatment effect, difference-in-differences or other inferred impact.
- Missing expected/actual values remain unavailable. Multiple actual records stay independent; never average, select, aggregate, smooth, impute or infer a trend unless a later explicitly scoped task defines that operation.
- P10.5 metric direction is metadata only. Do not transform it or outcome differences into success/failure, good/bad, favorable/unfavorable, recommendation quality, winner/loser, retain/replace/rollback or rollout advice.
- P10.5 upstream P10.4 structural flags and P10.3 confounders are context only; they do not weight arithmetic, create confidence or establish cause.
- P10.6 recommendation calibration is deterministic/read-only. It must independently verify exact P10.5 integrity and resolve the calibration subject only through exact same-action recommendation ID/fingerprint lineage.
- P10.6 calibration definitions are caller-supplied exact recommendation/treatment-expectation/role/source records. Holdout expectations must not directly calibrate the treatment recommendation in v1.
- P10.6 roles are metadata only. Per-actual directional signals may state only `same_as_declared_direction`, `opposite_declared_direction`, `equal_expected`, `neutral_direction`, or `unavailable`; they are not recommendation quality, reward, success/failure, causal impact or rollout advice.
- P10.6 must keep multiple actual signals independent. Never select, average, vote, build win/loss scorecards, infer trends/confidence, or aggregate metrics into an overall recommendation grade.
- P10.6 must not calculate reward/recommendation scores, recalculate rank, update model parameters/weights, mutate policy, change prompts/templates, persist recommendation updates, perform causal attribution or generate autonomous transitions.
- Generic continuation into P10.7 may define deterministic/read-only Impact workspace v2 projection/frontend presentation over exact P10.1–P10.6 supplied artifacts only; it does not authorize live provider/outcome loading, Production loaders/writes, recommendation/model/policy mutation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

## 4. Explicit execution boundaries

### Task #51 — Controlled Execution Foundation

Task #51 converts an explicitly approved proposal into a bounded executable action. It requires exact confirmation and time-bounded authorization. It does not by itself authorize a provider write.

### Task #52 — Shopify write/verification/rollback foundation

Task #52 supplies bounded connector mechanics, stale-state checks, fingerprints, read-after-write verification, and rollback mechanics. Dry-run/self-tests must remain network-safe unless a later task explicitly authorizes live provider interaction.

### Task #53 — Controlled single-action production pilot

A Task #53 live pilot requires its own fresh preflight plus exact execute-and-rollback confirmation. Historical fingerprints are single-use and must never be reused.

### Task #54 — Verified persistent single-action production apply

A Task #54 persistent apply requires a fresh preflight and separate exact confirmation naming the action/preflight target. Successful apply intentionally leaves one verified bounded change live. Do not invoke it without explicit user authorization.

## 5. Authentication and RBAC

Task #55 authentication is live in production.

- Provider: Google OIDC authorization-code flow with state, nonce, and PKCE.
- Public registration: disabled.
- Access: allowlist only.
- Roles: `viewer`, `operator`, `admin`.
- Sessions: server-side PostgreSQL.
- Absolute session lifetime: 12 hours.
- Idle timeout: 30 minutes.
- Rotation threshold: 15 minutes.
- Unsafe authenticated requests require CSRF protection.
- Anonymous protected API access must fail with 401.
- Role checks are enforced server-side; never trust frontend visibility as authorization.
- Do not expose client secrets, session secrets, token hashes, CSRF material, allowlisted identity values, or provider tokens in logs, PRs, issues, docs, or chat.

Production authentication has been certified end-to-end: anonymous denial, Google admin sign-in, admin server session creation, protected GET access, CSRF-protected logout, and session revocation.

## 6. Database discipline

Current intended Production schema is 34 public base tables, including:

- `auth_sessions`
- `auth_audit_events`
- `seo_observation`
- `seo_evidence`
- `seo_observation_evidence`

with the six Task #55 auth indexes and the P3.6 observation/evidence constraints, keys and indexes defined by canonical migration `lib/db/migrations/0003_observation_evidence_schema.sql`.

Before any Replit publish, development and production schemas must be aligned. A prior manual publish demonstrated that Replit may synchronize the development schema toward production; publishing while development was 29 tables and production 31 removed the production auth tables. That incident was recovered by applying the approved auth migration to both environments.

Rules:

- Compare development and production schema shape before publish.
- Never identify a Neon target only by database/user names; use the bound environment and read-only data/schema fingerprints.
- Do not run future production DDL unless specifically authorized; completion of P3.6 is not standing authorization for another schema change.
- Capture a read-only production fingerprint before authorized DDL/recovery.
- Use `ON_ERROR_STOP` for manual migration execution and certify resulting tables/indexes/constraints afterward.
- Never republish solely because a manual DB migration succeeded.

## 7. Risk semantics

Do not conflate these domains:

- Evaluator/impact risk: `low | medium | high | critical` (opportunity/proposal impact classification).
- Plan-control risk: `auto | approval | blocked` (`action_plans.risk_level`).
- Effective execution risk: the exact risk evaluated by Task #51.

Task #51 currently resolves effective risk using evaluator-first precedence:

`COALESCE(o.impact_estimate->>'riskClassification', ap.risk_level, 'blocked')`

and rejects `blocked`, `high`, and `critical` at the risk gate. A dry-run plan may therefore legitimately have evaluator risk `medium`, plan-control risk `blocked`, and effective execution risk `medium`.

Task #56 exists to make this distinction explicit in API/UI diagnostics without weakening fail-closed execution semantics.

## 8. Testing and generated code

The repository is a pnpm workspace. Generated API clients/types must be regenerated from `lib/api-spec/openapi.yaml`; do not hand-edit generated files as the source of truth.

Typical validation includes, as applicable:

- API specification code generation.
- API server tests.
- focused frontend tests.
- API and frontend typechecks.
- API production build and bundle-marker verification.
- frontend production build.
- `git diff --check`.
- GitHub Actions PR CI.
- GitHub Actions post-merge main CI.

If a test command fails because a binary is package-scoped, run it from the package that owns that dependency rather than installing ad-hoc tooling.

## 9. Production certification principles

- Prefer GET/HEAD and SELECT-only verification.
- Authentication tests may legitimately create auth audit/session records when the user has explicitly authorized login/logout certification.
- Do not call mutation-capable operational endpoints just to inspect their metadata.
- After deployment, verify health, auth state, safety gates, Task version markers, schema alignment, and absence of unexpected provider/public-site/autonomous activity.
- Treat successful build/publish as insufficient until runtime certification passes.

## 10. Continuity documents

Before resuming a task, read in this order:

1. `CURRENT_STATE.md` — authoritative mutable release/engineering checkpoint and exact next boundary.
2. `MASTER_COMPLETION_ROADMAP.md` — durable full path from the current checkpoint through application completion; use its stable roadmap IDs in future issues.
3. `ARCHITECTURE.md` — system architecture and trust boundaries.
4. `PROJECT_HANDOFF.md` — narrative continuation context and older operational details; mutable SHA wording may be historical.
5. `.agents/skills/seo-engine-project/SKILL.md` — procedural execution skill.
6. `.agents/memory/MEMORY.md` and linked memory notes — durable implementation lessons and task closeouts.
7. The active GitHub issue/PR — exact current task scope and acceptance criteria.

Every new chat/agent/tool must independently resolve current GitHub `main`, current Replit state, and the separately published production application source before acting. Never infer that a later documentation/engineering commit was published merely because it is current `main`.

When the project state changes materially, update `CURRENT_STATE.md`; when architecture or invariant behavior changes, update `ARCHITECTURE.md` and this contract in the same PR. Every material task closeout must also update the relevant status in `MASTER_COMPLETION_ROADMAP.md` so the program can be resumed through final completion without relying on chat memory alone.

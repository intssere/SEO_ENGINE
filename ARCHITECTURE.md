# SEO ENGINE Architecture

## Purpose

SEO ENGINE is the control plane for evidence-driven SEO/GEO/AIO analysis and progressively bounded execution for Diamond Shelf (`diamondshelf.us`). It is designed to automate research, opportunity discovery, proposal generation, approval workflows, measurement, and eventually tightly controlled site changes without allowing ambiguous state or broad autonomous mutation.

The architecture deliberately separates **observation**, **reasoning/proposal**, **authorization**, **provider mutation**, and **verification**. A capability existing in one layer never implies authorization in the next.

## System map

```text
Google Search Console ─┐
Google Analytics      ├──> ingestion / normalized evidence ──> findings + opportunities
Shopify read APIs     ┘                                      │
                                                             v
                                              deterministic opportunity engine
                                                             │
                                                             v
                                              dry-run action planner
                                                             │
                                      quality/evidence gate + human review
                                                             │
                                                             v
                                   Task #51 controlled authorization foundation
                                                             │
                                                             v
                                   Task #52 connector/verify/rollback mechanics
                                                             │
                                    ┌────────────────────────┴──────────────────────┐
                                    v                                               v
                         Task #53 reversible pilot                    Task #54 persistent single apply
                                    │                                               │
                                    └──────────────> verification / measurement <───┘

Browser/UI <──> Express API <──> PostgreSQL
     │              │
     │              ├── Google OIDC / RBAC / CSRF / server sessions
     │              └── bounded provider connectors
     │
     └── React/Vite frontend
```

## Repository topology

The repository is a pnpm workspace. The primary runtime surfaces are:

- `artifacts/api-server` — Express/Node API, operational data, auth/RBAC, opportunity/planning/execution foundations, provider adapters, tests, production bundle verification.
- `artifacts/seo-engine` — React/Vite operator UI.
- `lib/api-spec/openapi.yaml` — source API contract.
- `lib/api-client-react` — generated React/API client artifacts.
- `lib/api-zod` — generated validators/types.
- `lib/db/migrations` — PostgreSQL schema migrations.
- `.agents/memory` — durable implementation lessons and guardrails.
- `.agents/skills/seo-engine-project/SKILL.md` — agent execution procedure.
- `AGENTS.md` — normative repository operating contract.
- `PROJECT_HANDOFF.md` — current continuation checkpoint.

Generated API files are downstream artifacts; `openapi.yaml` is the contract source of truth.

## Runtime topology

### GitHub

GitHub is the canonical source-control and CI system.

- Repository: `intssere/SEO_ENGINE`.
- Engineering work occurs on dedicated branches.
- PR CI is a release gate.
- Merged `main` CI is a second release gate.

### Replit

Replit hosts the application runtime and production deployment.

- App: `SEO_ENGINE`.
- replId: `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`.
- Production: `https://dsseoengine.replit.app`.
- Deployment target: autoscale.

Replit is **not** canonical source control. Replit may create local metadata/configuration commits during publication; after certification, reconcile those against GitHub rather than pushing them upstream blindly.

### PostgreSQL

The application uses PostgreSQL for operational state, evidence, plans, approvals, execution records, provider connections, and authentication sessions/audit.

Current intended public schema: **31 base tables**.

Task #55 adds:

- `auth_sessions`
- `auth_audit_events`

and six dedicated auth indexes.

Development and production schema shape must match before publication. Publishing while they diverge can cause Replit schema synchronization to remove production-only objects.

## Evidence and opportunity layer

The system ingests bounded, persisted provider/site evidence and produces findings/opportunities. Opportunity candidates contain evidence-backed scoring, confidence, and evaluator risk. Durable rules include:

- Never treat provider discovery/count success alone as complete access/certification.
- GSC headline metrics require property-level aggregates; bounded crawl evidence certifies only the bounded scope.
- Opportunity generation must be traceable to persisted query/page/finding evidence.
- Stale opportunities are history, not silently reused live candidates.

## Proposal layer

The action planner produces reviewable dry-run proposals.

A dry-run proposal intentionally begins with:

- `dryRun=true`
- `executionAuthorized=false`
- `publicSiteWrites=false`
- `automaticTransition=false`
- plan-control `riskLevel=blocked`

while preserving the opportunity evaluator risk separately in proposal outcome metadata.

Quality gates verify evidence sufficiency, bounded target, proposed field/action, rollback metadata, quality score, warnings/blocking reasons, and fingerprint/revision state before a proposal can become approval-ready.

Approval itself is audited and non-executable. It does not grant provider-write permission.

## Risk model

SEO ENGINE contains multiple deliberately separate risk domains.

### Evaluator / impact risk

Values such as `low`, `medium`, `high`, `critical`. This describes the potential impact/risk classification of an opportunity/proposal.

### Plan-control risk

`action_plans.risk_level` uses the control-state domain `auto | approval | blocked`. Dry-run plans are deliberately persisted as `blocked` until the execution workflow establishes stronger authorization state.

### Effective execution risk

Task #51 resolves the risk used by execution authorization with evaluator-first fallback:

```sql
COALESCE(
  o.impact_estimate->>'riskClassification',
  ap.risk_level,
  'blocked'
)
```

The risk gate rejects `blocked`, `high`, and `critical`. Task #56 makes all three risk semantics explicit in reporting/API/UI without changing this policy.

## Controlled execution architecture

### Task #51 — Controlled Execution Foundation v1

Purpose: convert an explicitly approved proposal into a bounded internal executable action under exact confirmation and a short authorization window.

Core properties:

- exact proposal fingerprint binding
- freshness/TTL checks
- evaluator-first risk gate
- no automatic provider write
- provider-write permission remains false at authorization creation
- user confirmation is explicit and single-context

### Task #52 — Shopify Write Connector + Verification/Rollback Foundation v1

Purpose: implement the bounded mechanics needed for a safe provider write.

Core properties:

- bounded fields/actions
- stale-before-state verification
- idempotency/fingerprints
- provider receipts
- read-after-write verification
- deterministic rollback
- network-free dry-run/self-test mode
- manual-intervention outcome for uncertainty

### Task #53 — Controlled Single-Action Production Pilot v1

Purpose: one live mutation followed by verification and rollback.

Core properties:

- isolated provider write account
- fresh preflight
- exact `EXECUTE_AND_ROLLBACK_TASK53:<actionId>:<preflightFingerprint>` confirmation
- one bounded write
- verification
- rollback to original state
- manual-intervention state if rollback cannot be proven

The historical Home Fragrance pilot completed successfully and restored its original null meta description.

### Task #54 — Verified Persistent Single-Action Production Apply Foundation v1

Purpose: one persistent bounded live change, verified and intentionally left live on success.

Core properties:

- separate preflight and apply routes
- exact `APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>` confirmation
- exactly one forward mutation
- read-after-write verification
- leave verified change live on success
- rollback on verification failure
- manual-intervention if state becomes uncertain
- scheduler and batch execution disabled

No first persistent Task #54 live apply has occurred yet.

## Authentication and trust boundary

Task #55 provides production application authentication.

### Google OIDC

- Authorization-code flow.
- State, nonce, and PKCE S256.
- Exact production callback: `https://dsseoengine.replit.app/api/auth/google/callback`.
- Scopes: `openid email profile`.
- Allowlist-only accounts.
- Public registration disabled.

### Roles

Role hierarchy:

```text
admin > operator > viewer
```

GET/HEAD/OPTIONS operational access requires viewer or above. Selected approval/preflight operations require operator. Higher-risk mutations require admin. Server-side middleware is authoritative.

### Sessions

- Stored server-side in PostgreSQL.
- Session cookie plus separate CSRF cookie.
- 12-hour absolute expiration.
- 30-minute idle expiration.
- rotation threshold after 15 minutes.
- logout revokes server session.
- audit events record login/logout/denial outcomes.

Authentication has been production-certified through anonymous denial, allowlisted admin Google login, protected GET access, CSRF-protected logout, and revocation.

## Provider boundaries

### Shopify

Ordinary connections are read-only. A separate isolated write-capable credential exists for controlled Task #53/#54 flows. Its scope does not grant autonomous permission.

Current bounded execution support is centered on product/collection title and meta-description operations. Do not expand fields/resources without a task-specific design, tests, verification strategy, and rollback strategy.

### Google

Google provider connections are used for evidence/measurement. Authentication OIDC is a distinct application-auth concern and should not be conflated with Search Console/Analytics provider authorization.

## Safety gates

The strongest global invariant is that public-site/provider mutation remains disabled by default.

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- Task #53/#54 dispatch disabled unless explicitly opened for a bounded authorized operation.
- scheduler/worker execution disabled.
- no implicit approval-to-execution transition.

Multiple independent gates are intentional. Removing a single gate must never make a mutation automatically possible.

## Deployment architecture

The release path is:

```text
task branch
  -> focused/full validation
  -> GitHub PR
  -> PR CI green
  -> exact-head merge
  -> main CI green
  -> exact GitHub main sync to Replit
  -> Replit tests/typecheck/build/bundle verification
  -> publish when required
  -> live read-only certification
  -> reconcile Replit-only Git metadata
```

Before publish, certify development and production schema parity. After publish, certify health/auth/write gates/version markers and absence of unexpected mutation activity.

## Safe automation control-plane architecture

P9.1–P9.6 deliberately separate deterministic control-plane review artifacts from runtime execution.

### P9.1–P9.5 foundations

- P9.1 defines schedule identity, due windows and proposed read-work intents without a live timer or durable queue.
- P9.2–P9.4 bind first-party, crawl and external-intelligence review candidates to exact P9.1 lineage without executing provider/crawl work.
- P9.5 binds exact P9.1–P9.4 artifacts into deterministic idempotency identities and supplied attempt history. Only explicit transient/throttled failures can produce bounded retry-review intent; success and dead-letter states are terminal for that history.

### P9.6 worker control and observability

P9.6 adds review-only worker control semantics over supplied/fake state.

Control precedence is:

`kill > drain > pause > running`

Permanent semantics:
- pause blocks new admission/claims/retry dispatch but permits work already in flight to continue;
- drain has the same admission closure, permits in-flight completion and becomes effectively drained only when in-flight count reaches zero;
- kill blocks admission, retry dispatch and in-flight continuation and requires deterministic reconciliation;
- confirmed-not-started killed work may only return to review after a future recovery step while its original P9.1 window remains open;
- execution-started or outcome-uncertain killed work requires manual intervention and is never automatically retried;
- killed state cannot ordinary-resume; a future recovery boundary must reconcile uncertain work first;
- resume never resets P9.5 attempts/backoff/idempotency, extends an original work window, creates catch-up/backfill or revives dead-letter/no-work items;
- in-flight claim eligibility is checked against canonical P9.5 state at claim time;
- heartbeat freshness and worker health are projections from caller-supplied timestamps only.

P9.6 has no live worker, timer, scheduler, retry loop, durable control-state/queue/DLQ mutation, network request, Task #69/#70 execution, credential use, evidence persistence, Production DB operation or provider/public-site mutation.

### P9.7 recommendation-generation review

P9.7 adds deterministic/default-off recommendation generation above the canonical P6 opportunity pipeline and P9.6 control state.

Permanent semantics:
- exact P6.7 input/report must rebuild successfully, which transitively validates P6.1–P6.6;
- P7.6 AI/GEO opportunities enter only through their canonical P6 integration; P9.7 never reaches into provider/model observations directly;
- only P9.6 `running` permits recommendation generation review;
- `recommend` opportunities in observed/active lifecycle may emit advisory review;
- `approval` opportunities in observed/active lifecycle require at least one exact changed P6.6 preview before proposal-review guidance can be emitted;
- informational/blocked actionability is withheld, deferred lifecycle is held, and dismissed/closed/superseded lifecycle remains terminal;
- templates are deterministic internal review guidance, not customer-facing content, freeform model output, approval, execution, or outcome claims;
- recommendation identity binds exact upstream opportunity/explanation/actionability/lifecycle/evidence/preview lineage and remains stable across temporary pause/resume or later observation of unchanged lineage;
- P6.3 priority is preserved only as lineage; P9.7 serialization creates no new priority or worker-dispatch order;
- the P8 governance handoff is projection-only and never creates a ProposalRecord, approval, execution authorization, Task #51 authorization, or public-write permission.

P9.7 has no AI/model call, AI proposal runtime, live worker, timer/scheduler/retry loop, durable queue, recommendation/proposal persistence, database operation, Task #69/#70 or Task #51/#53/#54 execution, provider/crawl network request, or provider/public-site mutation.

P9.8 remains a separate autonomous-mutation policy boundary. A generic continuation after P9.7 may review/define that policy architecture, but must not implement or activate autonomous mutation without a separate bounded authorization decision.

### P9.8 autonomous-mutation policy review

P9.8 is architecture review only and is not an autonomous execution implementation.

Review decision:
- first future autonomous canary class is one Shopify **product SEO `meta_description`** at a time;
- collection metadata, SEO title, media alt, visible content, handles, inventory/price/status, theme changes and any new write scope remain excluded from the initial class;
- media alt remains separately blocked because current Shopify `fileUpdate` requires `write_files` or `write_themes`, outside the isolated `write_products` Task #53/#54 credential;
- autonomous admission must originate from exact P9.7 `proposal_review` lineage and a deterministic changed preview, never from advisory review;
- a worker may operate only under a separately created immutable/versioned policy grant and may never create, expand, renew or self-authorize that grant;
- policy authorization must remain distinct from human approval provenance; future code must not fabricate human approval rows;
- future autonomous execution must use a distinct policy-authorized execution namespace; it must not spoof the existing Task #54 human confirmation string;
- the initial autonomous class requires deterministic/non-AI proposal material, no missing evidence, quality pass with proposed canary threshold >=90, low effective execution risk, exact provider stale-state match and zero unresolved site-level mutation incident;
- durable policy decision/idempotency reservation is required before any provider write;
- pause/drain/kill block new forward writes; after a possible/accepted side effect, mandatory provider/storefront verification and bounded rollback are safety closure and may continue so the system does not abandon an uncertain mutation;
- kill does not retroactively roll back already completed/verified historical actions, but an in-flight write observed after kill should default to restoration unless it was already terminal before kill;
- any unresolved write/rollback uncertainty blocks further autonomous mutation for the site.

P9.8 implementation remains blocked pending a deterministic P9.7→governed-proposal bridge, durable policy grants/provenance/idempotency, policy-aware Task #51/#54-compatible authorization/execution contracts, mutation-control persistence, P8.4–P8.6 certification and separately authorized schema/config work.

Initial future blast-radius proposal is shadow-only first, then at most one product-meta-description forward action per 24 hours/site with one active site mutation and a 14-day same-target cooldown. Expansion requires a new policy version and separate authorization; no stage automatically unlocks new fields/resources/scopes.

P9.8 review completion does not authorize implementation or activation.

### P10.1 unified change timeline

P10.1 adds a deterministic/read-only chronology and lineage layer over caller-supplied facts from already-certified opportunity, recommendation, proposal, execution and measurement models.

Permanent semantics:
- event classes are bounded to opportunity, recommendation, proposal, execution and measurement;
- every event binds canonical caller-supplied time plus exact source system/version/event identity and fingerprint when available;
- opportunity/recommendation/action-plan/proposal/approval/action/deployment/verification/rollback/target/query/category lineage is carried only when directly supplied;
- unknown or unavailable facts remain null and are never filled from temporal proximity;
- exact replay for one source identity collapses deterministically, while conflicting replay for that same identity fails closed;
- P6.7 lifecycle projection independently rebuilds the supplied P6.7 report and emits only explicit lifecycle transition IDs/fingerprints;
- timeline ordering is timestamp, equal-time event-kind precedence and final event fingerprint only; it creates no priority, quality, risk or execution preference;
- provider-write, verification, rollback, manual-intervention and retained-live states are descriptive only when directly evidenced;
- measurement markers are descriptive eligible/pending/unavailable state only;
- temporal proximity creates neither lineage nor attribution, metric movement is not attributed to an action, and P10.1 calculates no impact.

P10.1 has no Production/live database loader, network/provider runtime, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, proposal/approval/execution authority, schema change, route activation, deployment or publication.


### P10.2 direct action attribution

P10.2 adds deterministic/read-only action-to-page/query/category direct association over an exact certified P10.1 report.

Permanent semantics:
- the supplied P10.1 report must rebuild exactly before P10.2 association;
- explicit non-null `lineage.actionId` is the only action join key;
- page association consumes only same-action `target.pageId` / `target.url`;
- query/category association consumes only same-action `associations.query` / `associations.category`;
- each association retains exact P10.1 event and source provenance;
- absent direct evidence remains unavailable and never becomes “likely” or inferred;
- page identity may enrich a missing ID/URL counterpart only through the same explicit page ID or same explicit URL;
- contradictory direct page identity fails closed;
- multiple explicit query/category values are deterministic sets, not ranked or semantically expanded;
- shared opportunity, recommendation, action-plan, proposal, URL/path/resource kind, metric movement, timestamp proximity or event ordering cannot create association without the same explicit action ID;
- direct association is lineage only and never establishes causal effect, impact, confidence or recommendation quality.

P10.2 has no Production/live database loader, network/provider runtime, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, proposal/approval/execution authority, schema change, route activation, deployment or publication.

### P10.3 before/after windows and confounder flags

P10.3 adds deterministic/read-only supplied-window membership and descriptive confounder evidence over exact certified P10.1 chronology and P10.2 direct association.

Permanent semantics:
- supplied P10.2 attribution must rebuild exactly from the supplied P10.1 timeline before P10.3 analysis;
- analysis is bound to one exact P10.2 action ID;
- the only supported measurement anchor is an exact same-action `verified_change_retained_live` timeline event fingerprint;
- before/after window bounds are caller-supplied canonical timestamps; no duration, lag, cooldown, significance threshold or preferred frame is inferred;
- before ends strictly before the anchor, after begins strictly after it, and the anchor belongs to neither window;
- missing anchor/window facts remain unavailable rather than inferred;
- observation membership requires every supplied non-null site/page/query/category scope dimension to match exact P10.2 direct association;
- fuzzy URL/path matching, semantic query/category expansion, shared opportunity/action-plan/proposal and temporal proximity cannot create scope association;
- exact same-action uncertain-write, rollback and manual-intervention events may create descriptive confounder flags only when inside a supplied window;
- another action creates an overlap flag only when it has exact retained-live evidence inside the window and at least one exact shared direct P10.2 page/query/category association;
- external supplied confounders require explicit source identity, canonical interval, explicit exact-compatible scope and window overlap;
- exact source replay dedupes and conflicting replay fails closed;
- chronology, association, window membership and confounder overlap are four distinct descriptive layers and none establishes causal effect;
- P10.3 calculates no metric delta, confidence, score, recommendation, causal adjustment or impact.

P10.3 has no Production/live database loader, SQL, network/provider runtime, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, proposal/approval/execution authority, schema change, route activation, deployment or publication.

### P10.4 supplied experiment/holdout framework

P10.4 adds deterministic/read-only experiment-design lineage and structural holdout evidence over exact certified P10.1 chronology, P10.2 direct association and P10.3 window/confounder analysis.

Permanent semantics:
- supplied P10.2 must rebuild exactly from the supplied P10.1 timeline before P10.4 analysis;
- supplied P10.3 treatment input must bind to that exact P10.1/P10.2 chain and its supplied report must equal the deterministic P10.3 rebuild;
- v1 contains exactly one treatment action and requires its exact P10.3 retained-live anchor plus available before and after windows;
- P10.4 reuses those exact P10.3 windows and never derives, shifts, re-anchors or aligns windows by timestamp proximity;
- holdouts are caller-supplied immutable analysis definitions, never assignments created by P10.4;
- zero holdouts remains `treatment_only`; P10.4 never manufactures a pseudo-control;
- each holdout has an exact unit ID, explicit assignment-source fingerprint and at least one page/query/category scope dimension;
- assignment basis is caller-declared provenance only: `externally_randomized`, `externally_matched`, `externally_selected` or `observational`;
- P10.4 never treats those labels as independent proof of randomization, matching quality, balance, comparability or exchangeability;
- holdout observation scope must exactly equal the declared holdout scope; fuzzy URL/path, semantic query/category or taxonomy expansion cannot broaden a unit;
- holdout observation membership is only before/after/outside against the exact treatment P10.3 windows;
- exact source replay dedupes and conflicting replay under one source identity fails closed;
- cross-arm scope overlap, exact holdout-action overlap, treatment P10.3 confounder presence and missing holdout window coverage are descriptive structural flags only;
- holdout presence does not establish comparability, scope disjointness does not establish exchangeability, before/after timing does not establish causality and contamination flags do not perform causal adjustment;
- P10.4 calculates no treatment effect, metric delta, confidence interval, statistical significance, experiment success/failure, winner/loser or rollout/retain/rollback recommendation.

P10.4 has no live experiment assignment, Production/live database loader, SQL, network/provider runtime, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, proposal/approval/execution authority, schema change, route activation, deployment or publication.

P10.5 may define deterministic supplied expected-vs-actual outcome tracking over exact P10.1–P10.4 lineage, but generic continuation does not authorize live outcome loading, causal attribution, Production/provider mutation or deployment/publication.

## Measurement architecture

Persistent changes must eventually feed a measurement loop rather than being judged on deployment success alone. Intended evidence includes:

- GSC pre/post impressions, clicks, CTR, average position, query/page segmentation.
- analytics sessions/conversions/revenue where attribution is valid.
- indexation/crawl observations.
- AI/GEO visibility/citation observations when supported by verifiable sources.
- deployment/action lineage and measurement windows.
- confidence and retain/replace/rollback decision.

Measurement must respect cooldown windows and avoid attributing unrelated site movement to one SEO action.

## Competitor intelligence architecture direction

Competitor research is an evidence input, not a copying engine. Future autonomous competitor modules may collect and compare:

- category/taxonomy structures
- titles/meta patterns
- SERP coverage
- entity/schema patterns
- internal-link structures
- keyword/content gaps
- backlink/citation signals
- AI-answer/citation visibility

The engine should derive gaps and strategies from evidence, never copy competitor text or mutate the site automatically merely because a pattern is common.

## Failure and recovery principles

- Fail closed on stale fingerprints, stale before-values, missing evidence, target ambiguity, auth/session uncertainty, provider verification failure, rollback uncertainty, or schema mismatch.
- Preserve audit history rather than rewriting history to make current state look clean.
- For an uncertain provider mutation, enter `manual_intervention_required`; do not guess success/failure.
- For DB recovery, fingerprint the target first, apply only an approved migration, verify schema/indexes/constraints, and do not republish solely because a migration ran.
- For Replit Git drift, compare commit trees and changed files; reset to canonical main without republishing when drift is metadata/incidental workspace configuration only.

## Current architectural checkpoint

The current engineering architecture checkpoint is **P10.4 complete**.

- P10.4 issue #328 / implementation PR #329.
- Exact tested implementation head/tree: `ce67cbbe5542e45ddd5f76204274555e2c5ea45a` / `d236693f98231e6aa991a3e39feb6a17e802187d`.
- Exact-head CI #571 / run `35510122006` and post-merge main CI #572 / run `35510239165` passed.
- Canonical implementation merge/tree: `50ef9fda7b9e0bdee2d48e1d2ba1400b8d9a5b7e` / `d236693f98231e6aa991a3e39feb6a17e802187d`.
- Replit was Git-only exact-synced to that merge/tree, origin/main exact, ahead/behind `0/0`, clean, and passed recursive workspace tests, full typecheck, full build and `git diff --check`.
- P10.1 chronology, P10.2 direct association, P10.3 window/confounder evidence and P10.4 experiment/holdout structure remain distinct deterministic/read-only layers.
- P10.4 records supplied design/assignment provenance and structural holdout evidence only; it does not verify randomization/matching, infer comparability/exchangeability, calculate treatment effect/statistics or make rollout recommendations.
- P9.8 remains review-complete but implementation-blocked; P10.4 does not unlock autonomous mutation or change Task #51/#53/#54 authorization boundaries.
- Published production remains the separately certified Task #73 application source; current engineering main is not implied to be published.
- Public-site/provider mutation remains disabled by default, `AI_PROPOSAL_GENERATION_ENABLED` remains disabled, and live execution still requires separate exact authorization.
- Default next safe program boundary is **P10.5 — expected-vs-actual outcome tracking**, limited initially to deterministic supplied outcome-definition/comparison semantics over exact P10.1–P10.4 lineage without live provider loading or causal claims.

For the exact mutable continuation state, use `CURRENT_STATE.md`.

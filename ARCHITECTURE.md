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

The P8.8 engineering foundation now implements the deterministic P9.7→governed-proposal bridge, pure policy grant/evaluation, provenance-distinct policy authorization, durable W04 reservation/idempotency, durable W05 mutation-control/claim persistence, mutation-free W06 preflight, default-off W07 single-action apply/safety closure, and pure caller-supplied W08 autonomous audit projection in engineering source. Live autonomous execution remains blocked pending W09 shadow certification, W10 separately authorized live activation, Production schema/config authorization and all provider/runtime gates.

Initial future blast-radius proposal is shadow-only first, then at most one product-meta-description forward action per 24 hours/site with one active site mutation and a 14-day same-target cooldown. Expansion requires a new policy version and separate authorization; no stage automatically unlocks new fields/resources/scopes.

P9.8 review completion does not authorize implementation or activation.

### P8.8 W08 autonomous audit projection

W08 is the policy-path audit counterpart to P8.6 and remains a pure/default-off projection layer rather than a new authority or persistence system.

Permanent architecture:
- exact W03 `policyActionId` is the audit root;
- policy-specific W01–W07 IDs/fingerprints remain distinct from human approvals/actions/deployments;
- W01–W07 caller-supplied artifacts are rebuilt or validated through existing certified contracts before projection;
- exact W07 append-only dispatch events are the transition-history source; event IDs/fingerprints, revisions and state transitions are integrity-checked;
- verified W07 terminal states require explicit caller-supplied exact provider plus independent storefront verification evidence; provider receipt or terminal label alone is insufficient;
- W04 reservation events are projected only when an authoritative timestamp exists; missing/manual-intervention transition times are not invented;
- W05 site-level control events attach only by exact claimed control revision/fingerprint, never site/time proximity;
- exact replay collapses and conflicting source replay fails closed;
- deterministic chronology is serialization only and does not create current state, authority, success, risk, priority, quality or causality;
- entries form a previous-fingerprint hash chain and the ledger has a deterministic integrity-bound fingerprint/summary;
- W08 has no database/provider/network/runtime adapter, no migration 0008, and no startup/route/scheduler/worker binding;
- W09 Stage 0 shadow certification and W10 live activation remain separate explicit gates.

### P8.8 W05 durable mutation-control bridge

W05 materializes the mutation-specific durable control prerequisite identified by P9.8 without activating autonomous execution.

Permanent architecture:
- durable current mutation control is isolated in `policy_mutation_control_state`;
- append-only transition provenance is isolated in `policy_mutation_control_events`;
- exact W03/W04 + accepted control-revision claim provenance is isolated in `policy_mutation_claims`;
- these tables never substitute for human `approvals`, human `actions`, Task #54 `deployments` or generic worker `jobs`;
- migration 0006 creates schema only and inserts no default running control state;
- missing durable mutation-control state therefore fails closed;
- control precedence remains `kill > drain > pause > running`;
- only durable `running` can admit a new W05 claim;
- every control+reservation transaction locks the control row before the W04 reservation row, serializing claim-vs-control races;
- exact W03/W04 pairing plus exact expected control revision/fingerprint is required before claim;
- one immutable W05 claim and W04 `authorized -> claimed` transition occur atomically;
- exact replay reuses the existing durable claim; a claimed W04 row without that claim is uncertain state;
- pause/drain/kill may release only exact paired unclaimed `authorized`; `claimed` and `manual_intervention` stay blocking;
- kill is a durable latch and ordinary resume is forbidden;
- new forward mutation remains distinct from required provider verification/rollback/manual-intervention safety closure after a possible side effect;
- W05 itself has no provider read/write, public-site write, Task #51/#53/#54 execution, scheduler/worker binding, automatic route/startup activation or deployment/publication authority.

The runtime schema recognizer may recognize the 41-table W05 engineering shape but does not apply migration 0006 automatically. Production migrations 0005/0006 and durable control initialization remain separate authorization boundaries.

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

### P10.5 expected-vs-actual outcome tracking

P10.5 adds deterministic/read-only supplied outcome definitions and exact descriptive arithmetic over exact certified P10.1–P10.4 lineage.

Permanent semantics:
- P10.5 must independently rebuild the supplied P10.4 report from its supplied P10.4 input before outcome tracking; mismatched P10.4 input/report fails closed;
- P10.4 remains responsible for exact P10.1→P10.2→P10.3 lineage verification, so P10.5 must not bypass or recreate weaker lineage paths;
- metric definitions are caller-supplied immutable key/unit/direction/source records;
- metric direction is metadata only and must never become good/bad, success/failure, winner/loser, rollout/retain/rollback or recommendation quality;
- expected outcomes bind to the exact P10.4 treatment action or exact holdout unit, exact scope and exact shared after window;
- treatment scope must match direct P10.2 treatment association; holdout scope must equal the declared P10.4 holdout scope exactly;
- actual records must bind exactly to one expectation's metric/target/scope and fall inside the exact P10.4 after window;
- numeric values use bounded canonical decimal strings and exact BigInt-aligned decimal subtraction;
- the only numeric derivation is `actual - expected`; the only relation is numeric order `above_expected`, `equal_expected` or `below_expected`;
- null/missing expected or actual values remain unavailable and are never imputed;
- multiple actual records remain independent deterministic observations; no selection, averaging, aggregation, smoothing or trend inference is permitted;
- exact source replay dedupes and conflicting replay fails closed;
- exact P10.4 structural-flag fingerprints/count and P10.3 treatment-confounder count may be preserved as context only;
- structural/confounder context must never alter arithmetic, create confidence or prove cause;
- expected values are not causal counterfactuals, actual values do not prove action impact, signed differences are arithmetic only and above/equal/below relations are descriptive only;
- P10.5 calculates no percentage change, uplift, treatment-vs-holdout effect, difference-in-differences, confidence interval, statistical significance, probability, causal attribution, recommendation or rollout decision.

P10.5 has no live outcome loading, live experiment assignment, Production/live database loader, SQL, network/provider runtime, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, proposal/approval/execution authority, schema change, route activation, deployment or publication.

### P10.6 recommendation calibration / learning signals

P10.6 adds deterministic/read-only directional calibration evidence over exact certified P10.1–P10.5 lineage.

Permanent semantics:
- P10.6 must independently rebuild the supplied P10.5 report from its supplied P10.5 input before calibration; mismatched P10.5 input/report fails closed;
- recommendation identity is resolved only from exact P10.1 events sharing the P10.5 treatment `actionId`;
- same-action recommendation lineage must carry non-null recommendation ID/fingerprint and must agree exactly; upstream P10.2 already rejects conflicting same-action recommendation identity, while P10.6 retains a defensive conflict guard;
- calibration definitions are caller-supplied immutable key/recommendation/expectation/role/source records;
- direct v1 calibration may reference only exact treatment expectations, not holdout expectations;
- calibration role is descriptive metadata only and never becomes weight, priority, score, rank, confidence or authority;
- one directional signal is projected per exact P10.5 actual record;
- bounded signal vocabulary is `same_as_declared_direction`, `opposite_declared_direction`, `equal_expected`, `neutral_direction`, or `unavailable`;
- a directional signal describes only declared metric direction versus exact P10.5 expected/actual arithmetic;
- definitions with no available actual comparison remain `signal_unavailable`; no synthetic observation may be fabricated;
- multiple actuals remain independent; do not select, average, vote, aggregate, build win/loss scorecards, infer trends, infer confidence or collapse metrics into an overall recommendation grade;
- exact replay dedupes and conflicting calibration-key/source/expectation replay fails closed;
- P10.4 structural flags and P10.3 confounders remain provenance-only context and never weight/suppress/promote signals or establish cause;
- directional signals are not recommendation quality, reward/penalty, action success/failure, causal effect, ranking weight or rollout advice;
- P10.6 calculates no reward score, recommendation score/rank, model parameter/weight update, policy update, prompt/template update, causal attribution or rollout recommendation.

P10.6 has no recommendation persistence/update, model training/fine-tuning, live outcome loading, live experiment assignment, Production/live database loader, SQL, network/provider runtime, credential use, timer, scheduler, live worker, retry runtime, mutation runtime, proposal/approval/execution authority, schema change, route activation, deployment or publication.

### P10.7 Impact workspace v2

P10.7 completes the Phase P10 safe frontend projection with a deterministic synthetic/read-only workspace over explicit P10.1–P10.6-shaped artifacts.

Permanent semantics:
- the `/impact` route must not depend on a live deployments/outcome API merely to present P10.7 evidence;
- initial P10.7 state is a deterministic synthetic presentation fixture only;
- the projection must visibly preserve P10.1 chronology, P10.2 direct association, P10.3 windows/confounders, P10.4 experiment/holdout structure, P10.5 expected-vs-actual arithmetic and P10.6 directional calibration as separate layers;
- supported layer versions, SHA-256 report fingerprints, parent-report chain and canonical UTC anchor/window timestamps must validate before projection;
- duplicate outcome/calibration identities and broken calibration→actual→expectation or recommendation lineage fail closed;
- unavailable expected/actual/comparison/calibration states remain unavailable; UI must not invent values or substitute zero;
- outcome rows remain independent and calibration rows remain independent;
- P10.5 signed differences and above/equal/below relations remain arithmetic only;
- P10.6 directional signals remain relationship evidence only and are not recommendation quality, reward/penalty, success/failure, ranking weight or rollout advice;
- chronology, association, temporal windows, holdout presence, structural flags and confounder counts never become causal conclusions merely because they are displayed together;
- summary cards may show availability/count/provenance facts but must not create an impact score, win/loss scorecard, confidence score or recommendation grade;
- the workspace must visibly retain non-causal/non-execution guardrails.

P10.7 has no generated API-client import on the Impact page, no live outcome/provider loader, Production/live database access, SQL, credential use, recommendation persistence/update, model training/weight update, ranking/policy/prompt mutation, timer/scheduler/live worker, retry runtime, Task #51/#53/#54 execution, provider/public-site write, P9.8 implementation, backend-route activation, deployment or publication.

P11.1 may define deterministic/offline production-performance budgets and profiling contracts over the current engineering tree. Generic continuation may inspect static artifacts and use synthetic/local browser fixtures, but it does not authorize live production load generation, deployment/runtime mutation, provider contact, Production DB mutation or publication.

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

The current engineering architecture checkpoint is **P11.4 complete**.

- P11.4 issue #351 / implementation PR #352.
- Final exact tested implementation head/tree: `7905b2db758e2af5e0187c238d121abb26927bcb` / `b50bdc0b8ad256fc7f022c9edbf933d660cb22ae`.
- Exact-head CI #607 / run `35586999609` and post-merge main CI #608 / run `35587257845` passed, including the canonical Ubuntu/Chromium browser suite.
- Canonical implementation merge/tree: `41329684f56f16e6da1645cd6c29339e038cf1c7` / `b50bdc0b8ad256fc7f022c9edbf933d660cb22ae`.
- P11.4 adds pure `p11.4-backup-recovery-v1` planning/certification over supplied synthetic fixtures: recovery inventory, supplied RPO/RTO, immutable manifest identity, exact migration/P3.6 schema lineage, ordered restore evidence and scenario classification.
- PostgreSQL backup scope is explicit: core, auth/audit and P3.6 observation/evidence state. Canonical source/migrations recover from Git; external secret values and provider/public-site state remain separate manual dependencies.
- Incomplete/unverified/stale/domain-incomplete/schema-lineage-invalid/post-incident-created backup evidence fails closed, as do restore-stage ordering/dependency violations.
- `certified_synthetic` is a fixture/runbook result only and does not certify production backup existence, retention/PITR/snapshot configuration or restore readiness.
- Replit is exact-synced to the implementation merge/tree, origin/main exact, ahead/behind `0/0`, clean, and passed 1,210 reported tests, full typecheck, full build/P11.1 budget gate and `git diff --check` using existing dependencies.
- No production backup discovery/read/export, restore/PITR/snapshot/storage operation, Production DB/storage mutation, secret/provider/runtime/failover/cutover mutation, deployment or publication occurred.
- P9.8 remains review-complete but implementation-blocked; P11.4 does not unlock autonomous mutation or change Task #51/#53/#54 authorization boundaries.
- Published production remains the separately certified Task #73 application source; current engineering main is not implied published.
- Public-site/provider mutation remains disabled by default, `AI_PROPOSAL_GENERATION_ENABLED` remains disabled, and live execution still requires separate exact authorization.
- P11.5 adds a deterministic/local-synthetic frontend certification layer over P4.8/P4.10: every routed surface plus not-found is included in the all-impact WCAG 2.2 A/AA axe gate, 320px document reflow, bounded target-size/spacing checks, focus visibility/transfer and reduced-motion verification.
- P11.5 keeps the browser harness network-closed: external origins and unmocked API requests fail closed; its synthetic proposal fixture is presentation/test data only and grants no provider, approval, execution or persistence authority.
- P11.5 bounded CSS remediation is presentation-only and does not alter API/schema/provider/runtime capability. GitHub Ubuntu/Chromium is the canonical browser runner; Replit remains valid for non-browser test/type/build/budget/diff certification when Chromium system libraries are unavailable.
- P11.5 certification applies only to the exact engineering tree and deterministic browser conditions; it does not certify published Task #73 production, every assistive-technology/browser/OS combination or future runtime content.
- P11.6 adds route-wide deterministic/local-synthetic product-quality certification over the P4.7/P11.5 frontend foundations: all explicit routes plus not-found are exercised at 1440/1024/768/390 viewport classes for document overflow, core geometry, unintended clipping, control overlap, internal table scrolling, compact-shell behavior and mobile touch ergonomics.
- P11.6 remediation remains presentation-only: shared mobile action links and compact Performance selects use 44px minimum targets; no API/schema/provider/runtime authority changed.
- The P11.6 test harness semantically excludes standard visually-hidden accessibility labels from visible-copy clipping checks while retaining P11.5's independent accessible-name/axe/focus contracts.
- GitHub Ubuntu/Chromium remains canonical for the 100-test browser matrix; Replit remains the exact-tree non-browser test/type/build/budget/diff verifier where browser system libraries are unavailable.
- P11.7 adds a deterministic synthetic/read-only reporting layer under Measure at `/reports`, backed by a pure report projection model with stable ordering/fingerprinting, local CSV/JSON/print serialization, spreadsheet-formula neutralization and bounded URL view-state only.
- P11.7 has no report API, persistence, server export job, email/Slack/webhook/cloud delivery or public-share publication path. Its capability contract explicitly denies production export, provider/DB activity, execution, deployment and publication.
- The `/reports` route is part of both P11.5 accessibility and P11.6 responsive certification matrices. Checkbox/radio product-touch evaluation may use an associated >=44px label as the effective target while P11.5's independent WCAG target-size contract remains unchanged.
- GitHub Ubuntu/Chromium is canonical for the 110-test browser matrix. Replit has since been Git-only reconciled through the P11.8 review merge; browser certification remains GitHub-canonical.
- P11.8 reviews the existing tenant/workspace hierarchy and selects **Organization = tenant/account** and **Site = SEO workspace/project** for v1. A separate Project entity is not justified without a real grouping requirement between organization and site.
- The durable schema is already multi-site-capable, but runtime isolation is not: current dashboard/readiness/OAuth flows bind Diamond Shelf directly, auth has no organization/site membership, API routes lack explicit site scope and the frontend has no workspace switcher.
- True multi-site activation therefore remains blocked behind server-authoritative membership, explicit site request scope, site-scoped loaders, site-bound OAuth/connection persistence, cross-site governance/execution validation, site-aware background identities, frontend context and deterministic isolation tests.
- P11.9 adds an engineering/provider-policy privacy and retention review boundary. It inventories auth identity, provider credentials, crawl/query/evidence/AI/log/job/backup data and identifies lifecycle obligations without activating deletion or provider operations.
- OAuth tokens are encrypted before persistence; session/CSRF tokens are hashed; auth IP/user-agent values are HMAC-hashed; application/structured logging has secret-redaction guards. Those controls do not substitute for lifecycle deletion and disclosure.
- P3.3 retention policy remains planning-only: operational history is modeled for archive after 30 days and prune after 180 days, while evidence/audit history has no automatic horizon and all archive/prune/destructive execution remains disabled.
- P3.6 evidence requires a separate erasure design because `seo_observation.site_id` is not an FK to `sites` and evidence relations are protected by restrictive foreign keys; deleting a core site alone does not satisfy future P3.6 erasure.
- Commercial/live activation remains blocked, where applicable, behind privacy/context disclosures, provider revoke/delete lifecycle, Shopify privacy-compliance handling, auth/audit retention, backup deletion semantics, provider/DPA/subprocessor register, outgoing-data classification and jurisdiction-specific legal review. P11.9 is not a legal-compliance certification.
- P11.10 adds a dedicated local/synthetic scale-certification gate over real pure functions at the current architectural envelope: 25,000 URLs/site, 100,000 page-query signals, 25,000 materialized candidates, 100 crawl batches and 100 read schedules. The final exact-head profile completed in 739.787 ms combined with 96.42 MiB maximum observed heap on the shared runner.
- P11.10 performance budgets are catastrophic-regression guards, not production SLOs. No production crawl, provider request, Production DB benchmark, scheduler/worker execution, mutation, deployment or publication is part of the certification.
- **P11 enterprise hardening is complete.**
- The P12 entry/readiness review is certified under issue #375 / PR #376 and maps all P12.1–P12.10 criteria to current engineering evidence and explicit missing production proofs.
- P12.1 is complete. Primary navigation is now operational-only; placeholder/fixture-only engineering routes remain mounted and certified but non-primary until they have a production-bound state contract.
- P12.1 deliberately separates **route availability** from **primary product exposure**: engineering routes may remain directly routable for deterministic certification without being represented as production-ready navigation destinations.
- P12.2 now includes a default-off Diamond Shelf first-party crawl runtime bridge. Network/sitemap/robots/page access, timing and persistence are explicit injected capabilities; no direct network/database/timer/scheduler implementation is bundled. The bridge reuses the exact P2.1–P2.6 planning, inventory, execution/checkpoint, certification, history and incremental contracts rather than opening their authorization fields.
- P12.2 persistence contracts deliberately retain checkpoint/lineage/accounting/receipt evidence only; raw page bodies, page content and raw sitemap XML are excluded. Concrete Production persistence remains a separately authorized runtime adapter decision.
- P12.2 engineering is complete but production certification is still live-proof gated: one real full crawl, interruption/resume evidence, repeat/reconciliation, bounded incremental execution and persisted inspectable evidence remain required.
- P12.3–P12.4 remain separate provider-activation lanes; P12.5 consumes real P12.2–P12.4 evidence; P12.6/P12.8 form the governed execution/outcome lane; P12.7 is the live read-automation lane; P12.9 is final release-candidate acceptance; P12.10 is explicit publication/runtime/program closeout.
- No P12 review or local prerequisite grants authority for provider/OAuth calls, production crawl, DB/storage mutation, persistence activation, provider/public-site writes, scheduler/worker activation, autonomous mutation, credentials, destructive retention, deployment or publication.

For the exact mutable continuation state, use `CURRENT_STATE.md`.
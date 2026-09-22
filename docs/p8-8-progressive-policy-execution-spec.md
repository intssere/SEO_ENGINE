# P8.8 — progressive policy-authorized low-risk execution specification

**Issue:** #406  
**Status:** SPECIFICATION / REVIEW ONLY — IMPLEMENTATION AND LIVE ACTIVATION BLOCKED

## Purpose

P8.8 defines the staged engineering contract for progressive policy-authorized low-risk execution after the successful P8.7 human-authorized live pilot.

P8.8 does not itself activate autonomous mutation. It converts the previously completed P9.8 architecture review into an implementation-ready sequence that preserves the exact P8.7 safety properties while introducing a provenance-distinct policy authorization path.

## Certified inputs

P8.8 relies on these already-certified foundations:

- P8.4 — independent provider + storefront verification adapters;
- P8.5 — deterministic rollback/manual-intervention semantics;
- P8.6 — action-specific tamper-evident audit/history projection;
- P8.7 — one persistent live Shopify mutation proven through the existing Task #51/#53/#54 path;
- P9.6 — pause/drain/kill/resume control semantics;
- P9.7 — deterministic recommendation/proposal-review lineage;
- P9.8 — autonomous mutation policy architecture review;
- P10.1–P10.7 — descriptive measurement/impact foundations.

P8.8 must reuse these contracts rather than invent parallel authority, verification, rollback, or measurement systems.

## Initial eligible autonomous class

The initial P8.8 class remains exactly the class selected by P9.8:

`shopify.product.seo.meta_description`

Exact scope:

- provider: Shopify;
- site: `diamondshelf.us`;
- resource kind: Product only;
- target URL: exact `https://diamondshelf.us/products/...` page;
- target identity: exact Shopify Product GID;
- action type: `update_meta_description`;
- field: `meta_description`;
- provider authority: existing isolated `write_products` credential only;
- one exact before value/fingerprint;
- one exact after value/fingerprint;
- no wildcard target;
- no query-selected batch;
- no title, collection, handle, description HTML, inventory, price, status, publication, theme, media/file-alt or new-scope mutation.

The fact that P8.7 successfully changed a collection meta description does not broaden this P8.8 policy class.

## Fundamental provenance rule

Policy authorization must never be represented as human approval.

The system must preserve two distinct authorization provenance classes:

- `human_approval`;
- `policy_authorization`.

A policy-authorized action must never:

- fabricate an `approvals` row;
- invent a human actor;
- reuse a stale human approval as policy authority;
- manufacture the current human Task #54 confirmation string;
- silently convert a policy decision into a Task #51 human authorization envelope.

Every policy decision must be queryably distinguishable from human review.

## Required immutable policy grant

A policy-authorized execution requires an externally created, immutable/versioned grant.

Minimum grant identity:

- policy ID;
- immutable policy version;
- policy fingerprint;
- site ID;
- exact allowed domain;
- provider;
- credential profile ID;
- required provider scope;
- allowed resource kind;
- allowed action type;
- allowed field;
- allowed proposal-generation method;
- maximum effective risk;
- evidence threshold;
- quality threshold;
- concurrency limit;
- mutation quota/window;
- same-target cooldown;
- activation time;
- expiry time;
- revocation state;
- activation actor/audit identity;
- policy stage;
- pause/drain/kill control binding.

Changing any material field requires a new policy version/fingerprint and a new explicit activation decision.

The worker must never create, expand, renew, reactivate, or self-approve a policy grant.

A grant must not expose provider credentials and must not itself enable `PUBLIC_SITE_WRITES_ENABLED`.

## P9.7 → governed proposal materialization

P9.7 `proposal_review` is not an executable ProposalRecord.

Before any policy evaluation can authorize execution, a deterministic proposal-materialization bridge must bind:

- P9.7 recommendation ID;
- P9.7 recommendation fingerprint;
- P9.7 idempotency key;
- P6 opportunity fingerprint;
- P6 explanation fingerprint;
- P6 actionability fingerprint;
- P6 lifecycle fingerprint;
- exact changed P6.6 preview fingerprint;
- exact target URL;
- exact Product GID;
- exact before value/fingerprint;
- exact after value/fingerprint;
- resulting governed proposal fingerprint.

The bridge must not infer or generate a new text value. It may materialize only the exact already-certified changed preview.

Initial P8.8 policy candidates must be:

- `proposal_review`, never `advisory_review`;
- deterministic;
- `aiAssisted=false`;
- not human-edited after fingerprint certification;
- lifecycle current;
- evidence complete;
- quality eligible.

## Admission policy

A candidate is policy-admissible only if every condition below holds.

### Control

- mutation control state = `running`;
- no unresolved manual-intervention condition for the site;
- no unresolved uncertain provider-write outcome;
- no unresolved rollback failure;
- no kill/pause/drain state that blocks new forward mutation.

### Recommendation/proposal

- source is exact P9.7 `proposal_review`;
- exact lineage materialization succeeds;
- changed preview exists;
- proposal is deterministic;
- `aiAssisted=false`;
- proposal fingerprint is unchanged;
- lifecycle remains eligible.

### Evidence/quality

- at least two persisted supporting evidence references;
- zero missing-evidence blockers;
- quality status = `pass`;
- approval eligible = true;
- quality score >= 90;
- zero blocking reasons;
- zero quality warnings;
- bounded pilot = true.

### Risk

- effective execution risk = exactly `low`;
- unknown, medium, high, critical or blocked fail closed.

### Target

- Shopify Product GID exact;
- target path is exact `/products/` URL;
- field = `meta_description`;
- action type = `update_meta_description`;
- provider scope required = `write_products`;
- no collection/title/media/file/theme/content mutation.

### Current-state revalidation

Immediately before reservation/dispatch:

- independently resolve the exact Shopify Product GID;
- independently re-read provider SEO state;
- observed before fingerprint equals the policy-bound before fingerprint;
- policy grant is active/unexpired/unrevoked;
- proposal and policy evaluation are current;
- no prior deployment exists for the action;
- no other active site mutation exists;
- same-target cooldown has not been violated;
- per-window quota remains available.

Any mismatch fails closed before provider dispatch.

## Policy evaluation artifact

A deterministic policy evaluation must bind at minimum:

- policy ID/version/fingerprint;
- recommendation fingerprint;
- governed proposal fingerprint;
- target Product GID;
- target URL;
- field;
- before fingerprint;
- after fingerprint;
- evidence IDs/fingerprint;
- quality result/fingerprint;
- risk classification;
- quota/cooldown evaluation;
- mutation-control state/fingerprint;
- evaluation timestamp;
- evaluation expiry;
- decision = `admit` or `reject`;
- deterministic rejection reasons;
- policy-evaluation fingerprint.

A successful evaluation is not yet a provider-write authorization.

## Durable reservation and idempotency

Before provider dispatch, the system requires a durable unique reservation keyed by:

- policy fingerprint;
- P9.7 recommendation idempotency key;
- proposal fingerprint;
- Product GID;
- field;
- before fingerprint;
- after fingerprint.

Required states must distinguish at least:

- `reserved_prewrite`;
- `dispatch_started`;
- `forward_outcome_uncertain`;
- `forward_verified_live`;
- `rollback_required`;
- `rollback_started`;
- `rollback_verified_closed`;
- `manual_intervention_required`;
- `cancelled_before_dispatch`.

Replay of the same exact decision may inspect the existing reservation but must never create a second forward mutation.

Conflicting reuse of the same decision identity fails closed.

## Separate policy authorization contract

A policy authorization artifact must be distinct from the existing human Task #51 authorization.

It must bind:

- action ID;
- policy grant ID/version/fingerprint;
- policy evaluation fingerprint;
- proposal fingerprint;
- target identity;
- before/after fingerprints;
- evidence/risk/quality fingerprints;
- reservation identity;
- issuedAt;
- expiresAt;
- explicit `authorizationProvenance="policy_authorization"`;
- `providerWriteAllowed=false` until the execution layer accepts the exact policy-aware preflight;
- `automaticTransition=false` at artifact creation.

No approval row is created for policy authorization.

## Policy-aware execution namespace

P8.8 must not spoof the current human confirmation:

`APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`

The future policy path requires a distinct namespace whose identity binds at minimum:

- policy fingerprint;
- policy authorization fingerprint;
- action ID;
- preflight fingerprint;
- reservation identity.

The exact syntax may be chosen during implementation, but human and policy execution must remain unambiguously distinct in code, persistence and audit evidence.

The policy execution path must preserve all existing Task #54 safety checks rather than bypass them.

## Forward mutation guarantees

For an admitted policy action:

- exactly one forward mutation maximum;
- exact Shopify Product GID;
- exact field = `meta_description`;
- exact after value;
- no automatic second forward attempt;
- independent provider verification;
- independent storefront verification;
- bounded propagation verification;
- duplicate deployment rejection;
- one active site mutation maximum.

Success requires both provider and storefront convergence on the exact expected after fingerprint.

A mutation receipt alone is never success.

## Failure and rollback guarantees

If no provider write occurred:

- fail terminal;
- do not rollback.

If provider write outcome is uncertain:

- enter `manual_intervention_required`;
- block further autonomous mutation for the site.

If a confirmed forward write fails independent verification:

- allow exactly one deterministic rollback to the exact approved before state;
- independently verify provider restoration;
- independently verify storefront restoration;
- no second rollback attempt;
- any rollback rejection, uncertainty or verification failure => `manual_intervention_required`.

Manual intervention blocks all further policy-authorized mutation for the site until explicitly reconciled.

## Pause / drain / kill

Control precedence remains:

`kill > drain > pause > running`

### Pause

- no new policy admissions;
- no new forward writes;
- already side-effected work may perform only required verification/rollback safety closure.

### Drain

- no new policy admissions;
- no new forward writes;
- pre-write reservations terminate without dispatch when safe;
- side-effected/uncertain actions must reach verified terminal closure or manual intervention.

### Kill

- block all new policy evaluations/admissions/forward writes;
- revoke unused pre-write reservations where safe;
- do not rollback already-completed verified historical actions merely because kill was requested;
- if a forward write may have been sent but is not terminal, reconciliation is mandatory;
- if the after state is observed post-kill for a nonterminal action, use the already-bounded single rollback path;
- uncertainty => manual intervention.

Safety closure reads/rollback are not permission for unrelated forward work.

## Staged rollout

### Stage 0 — shadow

No provider writes.

Requirements:

- run policy evaluator against real eligible candidates;
- persist or otherwise certify decisions only under separately authorized storage;
- compare decisions with human-governed outcomes;
- verify zero provider mutation;
- verify idempotent replay;
- verify quota/cooldown/control rejection behavior;
- verify audit lineage completeness.

Stage 0 implementation may be engineered before live activation, but any Production persistence requires separately authorized schema/storage work.

### Stage 1 — single-action autonomous canary

Separately authorized live activation only.

Limits:

- Shopify product SEO meta description only;
- max 1 forward action per 24 hours per site;
- max 1 active site mutation;
- max 1 action per worker cycle;
- same Product GID + field cooldown >= 14 days;
- no batch API;
- no catch-up execution;
- no retry producing a second forward mutation.

### Stage 2 — bounded expansion

Not automatic.

Only after a separate review and a new policy version may limits increase.

Initial graduation evidence should include at least 20 terminal Stage 1 actions with:

- zero unresolved manual-intervention outcomes;
- zero unresolved uncertain writes;
- every retained live action independently provider + storefront verified;
- every rollback independently verified;
- zero duplicate provider executions;
- zero stale-state bypasses;
- zero policy-scope violations;
- zero pause/drain/kill violations;
- complete audit lineage for every action.

Graduation evidence does not itself activate Stage 2.

## Engineering work packages

P8.8 implementation should be split so each authorization boundary is independently reviewable.

### W01 — pure policy grant/evaluation contracts

- immutable grant schema/types in code only;
- deterministic fingerprinting;
- admission/rejection evaluator;
- no DB/network/provider/runtime binding.

### W02 — P9.7 proposal materialization bridge

- exact deterministic lineage conversion;
- no generated text;
- no persistence;
- no execution authority.

### W03 — policy authorization artifact

- provenance-distinct authorization type;
- no approvals-row fabrication;
- no provider call;
- no Task #54 dispatch.

### W04 — durable reservation/idempotency design

- persistence schema and transaction semantics;
- requires separate Production DDL authorization before Production use.

### W05 — mutation-control bridge

- durable pause/drain/kill integration;
- side-effect safety-closure semantics;
- no provider mutation during engineering certification.

### W06 — policy-aware preflight

- exact target/current-state/credential/gate/quota/reservation checks;
- mutation-free;
- separate policy namespace.

### W07 — policy-aware single-action apply adapter

- preserve Task #54 one-forward/one-rollback semantics;
- implementation certification remains default-off;
- no live activation from merge alone.

### W08 — autonomous audit projection

- policy grant/evaluation/authorization/reservation + provider/verification/rollback lineage;
- reuse P8.6/P10 chronology principles;
- no competing authority store.

### W09 — Stage 0 shadow certification

- real decision evaluation only;
- zero provider writes;
- separately authorized Production read/persistence boundaries if needed.

### W10 — Stage 1 activation package

Must remain a separate explicit live authorization after W01–W09 engineering certification.

## Required schema/runtime boundaries

The specification does not authorize any schema.

Likely persistent entities include policy grants/versions, policy evaluations, policy authorizations, durable reservations and mutation-control state. Exact table design must be reviewed separately before any migration.

Likewise, no scheduler/worker/startup route may be activated merely because implementation code exists.

Implementation merge must remain default-off.

## Deployment and configuration boundary

P8.8 implementation does not imply deployment.

Any future deployment must name:

- exact canonical SHA/tree;
- exact schema state;
- exact feature flags;
- exact policy version/fingerprint;
- exact credential profile;
- exact mutation-control state;
- exact public-write gate state.

Any future live Stage 1 activation must separately authorize the specific production window and rollback/manual-intervention behavior.

## Certification matrix

P8.8 engineering certification must prove at minimum:

- policy provenance cannot impersonate human approval;
- policy namespace cannot call the human Task #54 confirmation path accidentally;
- unsupported resource/field/action classes fail closed;
- policy expiry/revocation blocks admission;
- stale provider state blocks admission;
- insufficient evidence/quality/risk blocks admission;
- quota/cooldown/concurrency blocks admission;
- pause/drain/kill blocks new forward writes;
- reservation replay cannot create a second provider mutation;
- uncertain write enters manual intervention;
- forward verification requires both provider + storefront evidence;
- rollback remains single-attempt and independently verified;
- audit lineage remains action-specific and tamper-evident;
- implementation defaults off;
- no generic `continue` can activate Stage 1.

## Explicit non-authorization

This specification authorizes no:

- policy engine implementation;
- policy persistence;
- Production DB schema/DDL/DML;
- provider/public-site mutation;
- Task #51/#53/#54 execution;
- scheduler/worker activation;
- policy activation;
- credential/scope change;
- `PUBLIC_SITE_WRITES_ENABLED` change;
- deployment;
- publication;
- P12.2 live crawl.

## Next authorization boundary

After this specification is merged and certified, the next safe implementation step is **W01 — pure policy grant/evaluation contracts only**.

W01 must remain deterministic, network-free, persistence-free and default-off. Any work beyond W01 requires its own reviewed scope.

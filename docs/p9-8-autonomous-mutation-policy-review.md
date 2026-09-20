# P9.8 — Autonomous Mutation Policy Engine Architecture Review

**Review date:** 2026-09-20  
**Issue:** #316  
**Status:** REVIEW COMPLETE / IMPLEMENTATION BLOCKED

## Purpose

P9.8 reviews the architecture required for bounded autonomous mutation after P9.7.

This milestone is **review only**. It does not implement a policy engine, create or modify provider credentials, write Production state, change execution gates, invoke Task #51/#53/#54, mutate Shopify/public-site state, activate a mutation worker, deploy, or publish.

The objective is to define the narrowest safe future autonomous mutation path without weakening the existing controlled-execution guarantees.

## Verified current execution surface

The repository currently certifies a deliberately narrow Shopify mutation surface:

- site: `diamondshelf.us`;
- resource kinds: Shopify `product` and `collection`;
- executable fields: SEO `title` and SEO `meta_description`;
- provider authority: isolated `write_products` credential;
- exact Product/Collection GID binding;
- exact current-state fingerprint and provider pre-read;
- explicit proposal approval;
- short-lived Task #51 authorization;
- fresh Task #53/#54 preflight;
- exact per-action execution confirmation;
- maximum one active site execution;
- duplicate deployment rejection;
- one forward mutation;
- independent provider read-after-write;
- independent storefront verification;
- bounded propagation verification;
- deterministic one-mutation rollback after verification failure;
- rollback re-verification;
- manual intervention on uncertain write/rollback outcome;
- global `PUBLIC_SITE_WRITES_ENABLED` gate;
- no autonomous scheduler or batch execution.

Task #54 is a persistent single-action apply path. A successful independently verified change may remain live. It does not currently authorize batch or autonomous application.

## Provider contract check

Provider requirements were rechecked against Shopify Admin GraphQL documentation on 2026-09-20.

Current documented behavior:

- `productUpdate` requires `write_products`;
- `collectionUpdate` requires `write_products`;
- Shopify documents SEO metadata as an update use case for collections;
- `fileUpdate` accepts file alt text and requires `write_files` or `write_themes`;
- files must be in a ready state before `fileUpdate`.

References:
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/productUpdate
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectionUpdate
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileUpdate
- https://shopify.dev/docs/api/admin-graphql/latest/input-objects/FileUpdateInput

This confirms the P8.3 result: product media alt remains outside the existing isolated Task #53/#54 `write_products` authority.

## Review decision: first future autonomous class

The first future autonomous mutation class should be:

`shopify.product.seo.meta_description`

Exact future boundary:

- one Shopify Product GID;
- one Diamond Shelf `/products/` target;
- one SEO `meta_description` field;
- one exact before value/fingerprint;
- one exact proposed value/fingerprint;
- existing isolated `write_products` authority only.

### Why this class

It is narrower than the other currently executable classes:

- scalar metadata only;
- no URL/handle change;
- no inventory/price/status/publication mutation;
- no collection-wide merchandising surface;
- lower blast radius than SEO title;
- already has Task #53/#54 provider/storefront verification and deterministic rollback mechanics;
- requires no new provider scope.

### Explicitly deferred

Not eligible for the first autonomous canary:

- collection SEO meta description;
- product SEO title;
- collection SEO title;
- merchant-visible product/collection title;
- product/collection description HTML;
- handles/URLs;
- inventory/price/status/publication;
- theme mutations;
- internal-link/content-section writes;
- media/file alt text;
- any action requiring `write_files`, `write_themes`, or another new provider scope.

Product media alt remains separately blocked by P8.3 pending explicit isolated `write_files` architecture authorization.

## Policy grant model

A future autonomous engine must operate only under a durable, explicit **Autonomous Mutation Policy Grant** created outside the worker.

The worker must never create, expand, renew, or self-approve its own grant.

A grant must bind at minimum:

- policy ID and immutable policy version;
- policy fingerprint;
- site ID and exact allowed domain;
- provider = Shopify;
- credential profile ID;
- exact required provider scope;
- allowed resource kinds;
- allowed action types;
- allowed fields;
- allowed proposal-generation methods;
- maximum effective execution risk;
- required evidence rules;
- required quality rules;
- concurrency limit;
- per-window mutation limit;
- same-target cooldown;
- activation time;
- expiry time;
- revocation state;
- activation actor/audit identity;
- policy-stage identifier;
- kill/pause control binding.

Changing any material field must create a new policy version/fingerprint and require a fresh explicit activation decision.

A policy grant does not itself expose provider credentials and does not make `PUBLIC_SITE_WRITES_ENABLED=true`.

## Policy authorization must be distinct from human approval

The current Task #51 path requires a persisted human-style approval decision and exact `AUTHORIZE:...` confirmation.

A future autonomous implementation must **not** satisfy this by fabricating an `approvals` row or synthetic human actor.

Instead, the data model must preserve separate provenance:

- `human_approval`; or
- `policy_authorization`.

A policy-authorized action must name:
- exact policy ID/version/fingerprint;
- exact P9.7 recommendation lineage;
- exact proposal fingerprint;
- exact target/before/after fingerprints;
- exact policy evaluation fingerprint;
- policy evaluation time;
- resulting bounded authorization expiry.

Human review history and autonomous policy authorization must remain queryably distinct.

## Task #54 execution confirmation must not be spoofed

Current Task #54 requires exact:

`APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`

A future autonomous worker must not manufacture this string and pretend a human performed the current operation.

A future implementation needs a separate policy-authorized execution namespace, for example conceptually:

`POLICY_APPLY_AND_VERIFY:<policyFingerprint>:<actionId>:<preflightFingerprint>`

The exact future syntax is an implementation detail, but the provenance distinction is mandatory.

The new path must preserve every existing Task #54 safety gate.

## Required upstream lineage

The initial autonomous policy may consume only a P9.7 `proposal_review` candidate.

It must never execute from:
- `advisory_review`;
- informational actionability;
- blocked actionability;
- deferred lifecycle;
- dismissed/closed/superseded lifecycle;
- P9.7 held state.

Before policy execution, a new deterministic proposal-materialization bridge must bind the P9.7 lineage to the existing governed proposal shape.

That bridge must not infer new values beyond the exact changed P6.6 preview.

Required lineage includes:
- P9.7 recommendation ID/fingerprint/idempotency key;
- P6 opportunity/explanation/actionability/lifecycle fingerprints;
- exact changed P6.6 preview fingerprint;
- persisted proposal fingerprint;
- target resource identity;
- before/after state fingerprints.

P9.7 itself is not a ProposalRecord and cannot be treated as one.

## Initial autonomous admission policy

For the first future canary, every condition below must hold.

### Control

- P9.6 mutation-control projection is `running`;
- no site-wide manual-intervention condition exists;
- no unresolved uncertain provider-write outcome exists;
- no unresolved rollback failure exists.

### Recommendation and proposal

- source is P9.7 `proposal_review`;
- source lifecycle is observed or active;
- changed preview is present;
- proposal is deterministic;
- `aiAssisted=false`;
- no AI/model-generated/refined value for the initial autonomous class;
- proposal has not been human-edited after its certified fingerprint;
- proposal remains exact-lineage current.

### Target

- resource kind = product;
- exact Product GID;
- exact `diamondshelf.us/products/...` URL;
- action type = `update_meta_description`;
- field = `meta_description`;
- no wildcard target;
- no query-selected batch.

### Evidence and quality

- evidence is sufficient;
- at least two persisted evidence references;
- no missing-evidence code for the autonomous candidate;
- quality status = `pass`;
- quality approval eligible = true;
- quality score >= 90;
- zero blocking reasons;
- zero quality warnings;
- bounded pilot = true;
- whole-site coverage = false.

The >=90 threshold is intentionally stricter than the current human approval threshold. It is an architecture proposal for the initial autonomous canary, not a change to existing production behavior.

### Risk

- effective execution risk must be exactly `low`;
- medium/high/critical/blocked never qualify;
- unknown/unclassified risk fails closed.

### Current state

Immediately before reservation/dispatch:

- independently resolve the exact Shopify Product GID;
- independently re-read provider SEO state;
- observed before fingerprint must equal the approved/policy-bound before fingerprint;
- action/proposal/policy authorization must remain unexpired;
- no prior deployment for the same action;
- no other active site execution.

## Idempotency and durable reservation

Autonomous execution requires a durable idempotency identity before provider dispatch.

The decision identity must bind:

- policy fingerprint;
- P9.7 recommendation idempotency key;
- proposal fingerprint;
- target Product GID;
- field;
- before fingerprint;
- after fingerprint.

A durable unique reservation must exist before the first provider mutation.

The current Task #54 one-deployment-per-action guard is necessary but not sufficient for an autonomous multi-cycle worker because P9.8 also needs durable policy-decision provenance across worker restarts/replays.

Duplicate or ambiguous reservation state fails closed.

## Initial blast-radius limits

Recommended initial policy stages:

### Stage 0 — shadow

- evaluate policy only;
- zero provider writes;
- compare policy decisions against the existing governed workflow;
- record false-positive/false-negative reasons in non-production or separately authorized review storage.

### Stage 1 — autonomous canary

Future live activation only after separate explicit authorization:

- class: product SEO meta description only;
- max 1 forward action per 24 hours per site;
- max 1 active site mutation;
- max 1 action per worker cycle;
- same product/field cannot be mutated again for at least 14 days;
- no batch API;
- no catch-up execution;
- no retry that creates a second forward mutation.

### Stage 2 — bounded expansion

Not automatic.

Only after a separate review and evidence from Stage 1 may a later policy raise volume, for example up to 5 verified product-meta-description actions per 24 hours.

Stage 2 must require a fresh policy version and explicit activation authorization.

No stage automatically unlocks collection metadata, SEO title, media alt, or new provider scopes.

## Graduation criteria

A future Stage 1 may be considered for expansion only after all of the following are recorded over at least 20 terminal autonomous canary actions:

- zero manual-intervention outcomes;
- zero uncertain write outcomes left unresolved;
- every rollback that occurred was independently verified;
- every live-retained change had independent provider + storefront verification;
- no duplicate provider execution;
- no stale-state bypass;
- no policy-scope violation;
- no policy kill/pause violation;
- complete audit lineage for every action.

This is a review threshold only. It does not automatically change a policy.

## Pause, drain, kill and safety closure

Autonomous mutation requires stricter side-effect semantics than read work.

### Pause

- no new policy admissions;
- no new forward provider mutation may start;
- already side-effected work may continue only through the safety closure needed to determine and verify terminal state.

### Drain

- no new policy admissions;
- no new forward provider mutation may start;
- currently reserved/pre-write actions should terminate without dispatch when safely possible;
- already accepted/possibly accepted writes must complete verification/rollback reconciliation;
- drained means no unresolved mutation action remains.

### Kill

Kill has highest precedence.

After kill becomes effective:
- block every new policy decision;
- block every new forward provider mutation;
- revoke unused pre-write reservations/authorizations where safe;
- do not retroactively roll back already completed, independently verified historical actions merely because kill was requested.

If a forward mutation may already have been sent:
- safety reconciliation remains mandatory;
- provider/storefront reads are allowed for reconciliation;
- if the new value is observed after kill and the action was not already fully terminal before kill, the safe default is deterministic rollback to the approved before-state;
- perform at most the already-authorized single rollback mutation;
- independently verify rollback;
- uncertain forward or rollback outcome enters manual intervention and keeps autonomous mutation blocked.

These verification/rollback operations are **safety closure**, not permission for new unrelated forward work.

## Verification and rollback

The initial future class must reuse or exactly preserve Task #54 guarantees:

Forward:
- one forward mutation maximum;
- independent provider verification;
- independent storefront verification;
- bounded propagation schedule;
- no second forward mutation.

Failure:
- if no write occurred, fail terminal without rollback;
- if write outcome is uncertain, manual intervention;
- if write occurred but independent verification fails, one deterministic rollback.

Rollback:
- restore exact approved before value;
- one rollback mutation maximum;
- independent provider/storefront re-verification;
- bounded propagation verification;
- failure/uncertainty => manual intervention.

Any manual-intervention state blocks further autonomous mutation for the site until explicitly reconciled.

## Audit requirements

A future autonomous implementation must preserve immutable lineage for:

- policy grant/version/activation/revocation;
- recommendation;
- proposal;
- policy evaluation;
- authorization;
- reservation/claim;
- provider pre-read;
- forward request/receipt;
- provider verification;
- storefront verification;
- rollback request/receipt when used;
- rollback verification;
- manual intervention;
- final state;
- measurement handoff.

Do not overwrite human-review records to make autonomous provenance look like manual approval.

## Measurement and repeat-mutation policy

Task #54 already identifies independently verified live changes as measurement eligible.

However, P9.8 should not scale autonomous changes based only on deployment success.

Before volume expansion or repeated optimization of the same target, the P10 measurement layer should provide:
- unified change timeline;
- action-to-page/query/category attribution;
- pre/post windows;
- confounder flags.

Until those exist, the initial same-target cooldown remains a hard guard rather than a learned optimization cadence.

## Required engineering prerequisites

P9.8 implementation is blocked until separately scoped work provides at least:

1. **P9.7 → governed proposal materialization**
   - exact deterministic bridge;
   - no new freeform inference;
   - preserves changed-preview lineage.

2. **Durable policy-grant model**
   - immutable versions/fingerprints;
   - explicit admin activation;
   - expiry/revocation;
   - policy audit history.

3. **Distinct policy-authorization provenance**
   - no fake human approval rows;
   - Task #51-compatible policy authorization contract.

4. **Policy-aware execution namespace**
   - no spoofed Task #54 human confirmation;
   - preserves exact Task #54 preflight and safety gates.

5. **Durable policy decision/idempotency reservation**
   - replay-safe across worker restarts;
   - one provider write maximum per admitted identity.

6. **Mutation worker control bridge**
   - durable P9.6-equivalent pause/drain/kill state;
   - safety-closure semantics for side effects.

7. **P8.4 verification adapter certification**
   - formalize the selected product-meta-description verification path as the mutation-class adapter.

8. **P8.5 rollback/manual-intervention certification**
   - formalize Task #54 rollback/manual intervention as the selected autonomous-class recovery contract.

9. **P8.6 action history/audit ledger**
   - durable policy + action lineage suitable for autonomous decisions.

10. **Separately authorized schema/config work**
    - any new policy/audit/reservation persistence requires separately authorized DB migration;
    - no generic continuation may perform that DDL.

11. **Separate implementation authorization**
    - architecture review completion is not permission to code the autonomous execution path.

12. **Separate live activation authorization**
    - implementation certification is still not permission to enable public writes/autonomous mutation.

## Activation prerequisites

Even after implementation exists, live Stage 1 activation must require a separate explicit authorization that names:

- exact canonical application SHA/tree;
- exact policy version/fingerprint;
- exact site;
- exact provider;
- exact credential profile;
- exact allowed resource/action/field;
- exact limits/cooldown;
- exact activation/expiry window;
- exact deployment;
- effective `PUBLIC_SITE_WRITES_ENABLED` condition;
- effective kill/pause control;
- required production DB/schema fingerprint;
- rollback/manual-intervention readiness.

No historical authorization or generic `continue` may be reused.

## Review conclusion

**P9.8 architecture review: COMPLETE.**

**Implementation: BLOCKED.**

Selected first future autonomous canary class:

`Shopify product SEO meta_description`

Current production mutation capability remains unchanged.

P9.8 review does not authorize:
- autonomous mutation implementation;
- policy persistence;
- policy activation;
- approval bypass;
- Task #51/#53/#54 execution;
- new provider scopes;
- public-site/provider writes;
- Production DB mutation;
- scheduler/worker activation;
- deployment;
- publication.

Program progression may continue to P10 measurement architecture while P9.8 implementation remains blocked behind the prerequisites above.

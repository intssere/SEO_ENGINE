# P8.8 W07 — policy-aware single-action apply and safety-closure specification

**Issue:** #461  
**Status:** SPECIFICATION / REVIEW ONLY — W07 IMPLEMENTATION, PRODUCTION DDL/DML, LIVE PROVIDER ACCESS AND W08+ BLOCKED

## Purpose

W07 defines the first policy-aware **single-action apply** and safety-closure boundary after the certified W01–W06 chain.

W07 is responsible for answering:

> Given one exact W06 `ready_for_w07` preflight for one already-claimed policy action, how can the system fence provider dispatch durably, attempt at most one exact Shopify Product SEO `meta_description` mutation, independently verify the resulting state, perform at most one exact rollback if required, and close the W04/W05 claim safely without impersonating the human Task #51/#53/#54 path?

W07 is **not** live Stage 1 activation.

W07 engineering must remain default-off. A merged W07 implementation alone must not create standing provider-write authority, scheduler/worker authority, policy activation, or a live Production mutation path.

## Relationship to W01–W06

W07 may accept only the exact already-certified lineage:

- W01 policy grant/evaluation;
- W02 governed proposal materialization;
- W03 policy authorization;
- W04 durable reservation;
- W05 durable control claim;
- W06 policy preflight.

W07 must never repair, infer, renew, normalize, broaden, or substitute any earlier lineage.

A W07 execution identity is valid only when every earlier policy/action/target/state fingerprint remains exact.

## Initial mutation class remains unchanged

W07 remains closed to exactly:

`shopify.product.seo.meta_description`

Required target:

- site/domain: Diamond Shelf / `diamondshelf.us`;
- provider: Shopify;
- resource kind: `product`;
- Product GID: `gid://shopify/Product/<positive integer>`;
- target URL: canonical `https://diamondshelf.us/products/<slug>`;
- action type: `update_meta_description`;
- field: `meta_description`;
- required write scope: `write_products`;
- proposal generation: `p9.7_deterministic_preview`;
- effective risk: exactly `low`;
- policy stage: exactly `single_action_canary`.

W07 must not broaden the class to:

- collections;
- SEO title;
- visible title/body HTML;
- handles/URLs;
- inventory/price/status/publication;
- theme/files/media alt;
- another provider/domain.

## W07 provenance is policy-only

Recommended execution provenance:

`executionProvenance = "policy_single_action_apply"`

W07 must remain structurally distinct from the human path.

W07 must never fabricate or consume as policy authority:

- a human approval row;
- a human approval actor/decision;
- a Task #51 `controlled_execution_foundation_v1` envelope;
- a human `actions` row;
- a human `deployments` row as execution authority;
- `EXECUTE_AND_ROLLBACK_TASK53:...`;
- `APPLY_AND_VERIFY_TASK54:...`;
- a Task #54 human confirmation;
- Task #54 action-plan lifecycle state.

The existing Task #51/#53/#54 path remains unchanged.

## No human confirmation spoofing

The policy path must not manufacture the existing Task #54 confirmation string.

W07 should use deterministic policy execution identities instead of a human-style confirmation string.

Recommended deterministic identities:

- `policyExecutionId = p88w07-exec-<24 hex>`;
- `dispatchId = p88w07-dispatch-<24 hex>`.

Both must bind the exact W01–W06 lineage.

A policy execution ID is not a human approval and not a Task #54 confirmation.

## Mandatory W06 handoff

W07 may consider forward dispatch only when supplied W06 satisfies all of:

- version exactly `p8-8-w06-policy-preflight-v1`;
- provenance exactly `policy_preflight`;
- disposition exactly `ready_for_w07`;
- W06 preflight fingerprint integrity exact;
- exact no-dispatch proof integrity exact;
- no-dispatch proof phase exactly `pre_dispatch_proven`;
- `claimReleaseEligibility="retain_for_w07"`;
- W06 provider dispatch/write/public-write markers false;
- W06 database-write/schema-mutation markers false;
- W06 target/state/control lineage exact;
- W06 preflight not expired.

W07 must independently revalidate W01–W06 rather than trusting the W06 result as write authority.

## W07 must revalidate again immediately before dispatch

W06 readiness is necessary but insufficient.

W07 must independently revalidate immediately before the point of no return:

- exact W01–W06 lineage;
- current W04 row;
- exact W05 claim row;
- current W05 control state;
- W03 authorization freshness by PostgreSQL transaction time;
- W06 preflight freshness;
- policy stage remains `single_action_canary`;
- current control is exactly the same `running` revision/fingerprint accepted by W05/W06;
- no W07 dispatch already passed the point of no return;
- no unresolved policy manual-intervention row for the site;
- policy mutation quota remains available;
- same-target cooldown remains satisfied;
- no conflicting active human Task #54 execution for the site;
- exact current provider before-state;
- write credential profile identity and required scope;
- all live execution gates required by the future activation package.

Any mismatch blocks new forward dispatch.

## Separate policy execution gate

W07 implementation must remain independently disabled even if the existing human public-write gate is enabled.

Future live policy dispatch should require **both**:

- `PUBLIC_SITE_WRITES_ENABLED=true`;
- a dedicated policy mutation execution gate, recommended:
  `P8_8_POLICY_MUTATION_EXECUTION_ENABLED=true`.

The dedicated policy gate must default to false.

W07 specification/review does not create, modify, enable or deploy this configuration.

W10 remains responsible for live Stage 1 activation.

## Credential boundary

W01 already binds an exact `credentialProfileId` and `write_products` scope.

W07 must require:

- exact credential profile ID from W01;
- exact provider/shop binding;
- `write_products` present;
- no credential profile substitution;
- no dynamic scope broadening;
- no credential creation/renewal;
- no secret persisted in W07 dispatch/audit rows.

W07 may use the certified W06 read-only path for provider reads.

The provider **write** credential is loaded only after all pre-dispatch policy checks pass.

Possession of the write credential is not itself execution authority.

## Critical compatibility rule: W07 must not reuse Task #53 mutation normalization

The current Task #53 mutation helper normalizes whitespace before constructing Shopify SEO values.

W02/W06 policy lineage intentionally preserves byte-for-byte before/after values.

Therefore W07 must **not** call `mutateTask53ShopifyState` for the policy path.

W07 needs a policy-specific Product SEO mutation adapter whose request uses the exact W02 `after.value` bytes.

No:

- trimming;
- whitespace collapsing;
- HTML rewriting;
- copy generation;
- template substitution;
- normalization.

A future pure low-level Shopify transport helper may be shared only if sharing cannot import Task #53 normalization or human authorization semantics.

## Shopify provider contract

The future W07 policy mutation adapter is restricted to Shopify Admin GraphQL `productUpdate` for the exact Product GID and exact SEO `description`.

Current Shopify documentation confirms:

- `productUpdate` requires `write_products`;
- the payload returns updated Product data and `userErrors`;
- Shopify `UserError` represents validation/business-rule errors that prevent an operation from completing.

Reference material:

- https://shopify.dev/docs/api/admin-graphql/latest/mutations/productUpdate
- https://shopify.dev/docs/api/admin-graphql/latest/payloads/ProductUpdatePayload
- https://shopify.dev/docs/api/admin-graphql/latest/objects/UserError
- https://shopify.dev/docs/api/usage/idempotent-requests

W07 must not assume provider-level idempotency for `productUpdate` unless the exact API version explicitly documents a supported idempotency argument/directive for that mutation.

The durable W07 dispatch fence is therefore the system-of-record at-most-once guard.

## Why W07 requires a new durable dispatch fence

W04/W05 prove one exact claimed policy action.

They do not distinguish:

- a claim that has never approached provider dispatch;
- a claim with a locally reserved dispatch;
- a request whose provider call may have begun;
- a request with an accepted/rejected response;
- a forward mutation under verification;
- a rollback attempt.

W07 must introduce a dedicated durable policy dispatch namespace so crash/replay cannot produce a second forward mutation.

W07 must not reuse:

- human `actions`;
- human `deployments`;
- generic worker `jobs`;
- Task #54 persistence rows

as policy dispatch authority.

## Future W07 persistence

W07 specification recommends one additive future migration:

`0007_p8_8_policy_mutation_dispatch.sql`

Recommended dedicated tables:

1. `policy_mutation_dispatches`
2. `policy_mutation_dispatch_events`

Migration 0007 is **not** authorized for implementation or Production application by this specification.

### `policy_mutation_dispatches`

One durable authoritative row per W05 claim.

Required identity columns should bind at minimum:

- W07 version;
- dispatch ID/fingerprint;
- site ID;
- policy ID/version/fingerprint;
- W01 evaluation ID/fingerprint;
- W02 materialization/proposal fingerprints;
- W03 authorization ID/fingerprint;
- policy action ID;
- W04 reservation ID/fingerprint;
- W05 claim ID/fingerprint;
- W06 preflight ID/fingerprint;
- Product GID;
- target URL;
- field;
- exact before fingerprint;
- exact after fingerprint;
- W01 credential profile ID;
- claimed control revision/fingerprint.

Required attempt controls:

- `forward_attempt_count` constrained to 0 or 1;
- `rollback_attempt_count` constrained to 0 or 1;
- provider request IDs/fingerprints when available;
- request/response timestamps;
- final closure reason;
- current dispatch state;
- current row revision;
- created/updated timestamps.

Secrets and raw response bodies must not be persisted.

### `policy_mutation_dispatch_events`

Append-only event history for state transitions.

Each event must bind:

- dispatch ID;
- prior row revision/state;
- next row revision/state;
- transition reason;
- database transaction time;
- exact event fingerprint;
- provider request fingerprint when applicable;
- public-write occurrence classification;
- rollback occurrence classification.

W08 may later project these events into audit history.

W08 must not create a competing execution authority store.

## Recommended dispatch states

Recommended initial W07 states:

- `reserved_prewrite`;
- `dispatch_started`;
- `forward_rejected_no_write`;
- `forward_verification_pending`;
- `forward_verified_live`;
- `rollback_required`;
- `rollback_started`;
- `rollback_verification_pending`;
- `rollback_verified_closed`;
- `cancelled_before_dispatch`;
- `manual_intervention_required`.

Only these initial states are required.

W07 must not add batch/retry/queued states that imply autonomous worker execution.

## Two-phase dispatch fence

W07 requires a two-phase local fence.

### Phase A — `reserved_prewrite`

A DB transaction:

1. locks current W05 control row;
2. locks exact W04 reservation row;
3. locks exact W05 claim row;
4. checks for an existing W07 dispatch row;
5. verifies exact W06 ready lineage;
6. verifies current control/claim/reservation;
7. verifies W03/W06 freshness using transaction time;
8. verifies quota/cooldown/concurrency blockers;
9. inserts the exact W07 dispatch row in `reserved_prewrite`;
10. inserts its event.

W04 remains exactly `claimed`.

No provider write may occur in this transaction.

At `reserved_prewrite`, W07 can still prove no provider dispatch occurred.

A crash or cancellation while still `reserved_prewrite` may later close safely as `cancelled_before_dispatch` and W04 `claimed -> released`.

### Phase B — `dispatch_started`

Before this transition W07 must perform a fresh authoritative provider read of the exact Product SEO description using the W06/W02 byte-exact state domain.

Then a fresh short DB transaction:

1. locks control;
2. locks W04 reservation;
3. locks W05 claim;
4. locks W07 dispatch row;
5. requires dispatch state exactly `reserved_prewrite`;
6. requires current control still exact same `running` claim epoch;
7. requires W03/W06 still fresh;
8. requires final provider before-state observation fresh and exact;
9. requires exact gates/credential profile/scope;
10. transitions `reserved_prewrite -> dispatch_started`;
11. sets `forward_attempt_count=1`;
12. records the point-of-no-return event.

W04 remains `claimed`.

Only after that transaction commits may the one forward provider call begin.

## Point-of-no-return semantics

`dispatch_started` means:

> this exact policy execution has spent its one allowed forward provider attempt and a side effect must now be treated as possible.

From this state onward:

- never issue a second forward mutation;
- replay must resume only safety closure;
- a process crash must never reset to `reserved_prewrite`;
- W04 must never be released on a no-dispatch basis;
- pause/drain/kill cannot re-authorize a new forward attempt;
- any missing/ambiguous provider outcome must fail closed.

This rule intentionally prefers a false-positive uncertain state over a duplicate provider mutation.

## Crash before provider call after `dispatch_started`

There is an unavoidable boundary between committing the local point-of-no-return and actually handing the network request to the provider.

If the process crashes in that interval, W07 cannot prove the request was not sent.

Therefore recovery must treat `dispatch_started` without a terminal provider result as:

`side_effect_possible`

It must never retry the forward write automatically.

Default recovery disposition:

`manual_intervention_required`

unless a separately certified deterministic reconciliation rule can prove a safe terminal state without another write.

Initial W07 should use manual intervention for this ambiguity.

## Forward provider request

The one forward request must contain only:

- exact Product GID;
- exact SEO description = W02 `after.value`;
- one `productUpdate` operation;
- no other Product fields;
- no batch mutation;
- no second mutation.

The write adapter must not send:

- title;
- handle;
- body HTML;
- product status;
- tags;
- media;
- variants;
- collection changes;
- publication changes.

## Forward provider response classification

### Accepted

A forward mutation is considered provider-accepted only when all of:

- HTTP/transport completed;
- no top-level GraphQL errors;
- `userErrors` empty;
- returned Product exists;
- returned Product GID equals exact target.

Even then, the mutation is **not** considered successful until independent verification.

Transition:

`dispatch_started -> forward_verification_pending`

### Authoritative mutation rejection

Shopify `UserError` means the mutation operation did not complete.

A well-formed authoritative response with one or more `userErrors` may be classified as provider rejection.

Initial W07 should still perform an exact provider state read before terminal closure.

If the provider remains exact W02 before-state:

`dispatch_started -> forward_rejected_no_write`

W04 later closes as `consumed`, not `released`, because the single forward dispatch attempt was spent.

No rollback is performed.

If provider state is after/third/unavailable, fail closed rather than trusting the error response alone.

### Transport / timeout / invalid / ambiguous response

If the request may have reached Shopify but no authoritative accepted/rejected result exists:

- never retry forward;
- perform only bounded read-only reconciliation;
- if outcome remains ambiguous, enter `manual_intervention_required`.

No automatic forward retry is allowed.

## Exact provider after-state requirement

A provider mutation receipt is never sufficient.

After any possible/confirmed forward write, W07 must independently read the Product SEO description again.

The exact raw observed value must:

1. equal W02 `after.value` byte-for-byte; and
2. reconstruct the exact W02-domain `afterFingerprint`.

A normalized Task #53/P8.4 fingerprint alone cannot prove exact W02 policy-state convergence.

## Independent provider + storefront verification remains mandatory

In addition to exact provider raw-state equality, a successful retained live change requires the existing P8.4 verification guarantee:

- independent provider evidence;
- independent storefront evidence;
- both converge on the expected post-change state;
- unavailable evidence remains unavailable;
- mutation receipt cannot substitute for verification.

Therefore `forward_verified_live` requires both:

1. exact W02-domain provider after-state match; and
2. P8.4-equivalent provider + storefront verification success.

W07 may refactor/reuse pure verification helpers but must not import human authorization semantics.

## Propagation verification

Forward and rollback verification reads may use the already-certified bounded propagation pattern from Task #53/#54.

Safe read retries are allowed.

Forward provider mutation retries are not.

Rollback provider mutation retries are not.

Any future implementation must keep retry categories distinct:

- verification read retries: bounded and safe;
- forward mutation retry: forbidden;
- rollback mutation retry: forbidden.

## Forward verification outcomes

### Verified live

When exact provider state and independent provider/storefront evidence all match the expected after-state:

`forward_verification_pending -> forward_verified_live`

Then atomically:

- W04 `claimed -> consumed`;
- W05 immutable claim retained;
- W07 dispatch remains immutable terminal history;
- W07 event records terminal live closure.

A verified live action is measurement-eligible later, but W07 itself does not perform P10 measurement.

### Authoritative verification failure after confirmed write

If a confirmed write occurred but final independent verification does not converge:

`forward_verification_pending -> rollback_required`

Exactly one rollback may then be attempted.

### Verification unavailable after a possible/confirmed write

Unavailable evidence after a possible/confirmed write must not be treated as success.

After bounded verification evidence is exhausted:

`manual_intervention_required`

W04 becomes `manual_intervention`.

## Rollback eligibility

Rollback is allowed only when all are true:

- one forward attempt exists;
- forward side effect is confirmed;
- exact original W02 before value/fingerprint are intact;
- no rollback attempt exists;
- provider target/field lineage remains exact;
- rollback is required by failed forward verification or kill semantics;
- rollback outcome is not already uncertain;
- no manual-intervention state has superseded automatic rollback safety.

Rollback is never authorized merely because control was paused or drained.

## One rollback maximum

Immediately before rollback provider call, a DB transaction must:

1. lock current control;
2. lock W04 reservation;
3. lock W05 claim;
4. lock W07 dispatch row;
5. require state exactly `rollback_required`;
6. require `rollback_attempt_count=0`;
7. preserve exact lineage;
8. transition to `rollback_started`;
9. set `rollback_attempt_count=1`;
10. record the event.

After `rollback_started`, no second rollback mutation may ever be issued.

Any crash/ambiguous rollback result must fail closed to manual intervention.

## Rollback request

The one rollback request must restore exactly:

W02 `before.value`

to the exact same Product GID and `meta_description` field.

No normalization is allowed.

No other Product field may be sent.

## Rollback verification

Rollback success requires:

1. exact raw provider state equals W02 before value;
2. exact W02-domain before fingerprint matches;
3. independent provider + storefront verification matches the restored state.

Mutation receipt alone is insufficient.

While verification is pending:

`rollback_started -> rollback_verification_pending`

On verified restore:

`rollback_verification_pending -> rollback_verified_closed`

Then atomically:

- W04 `claimed -> consumed`;
- W05 immutable claim retained;
- W07 terminal event recorded.

## Rollback failure/uncertainty

Any of these must enter `manual_intervention_required`:

- rollback transport outcome uncertain;
- rollback rejected and provider state cannot be authoritatively proven safe;
- rollback after-state is neither exact before nor exact expected closure;
- provider/storefront disagree after bounded evidence;
- rollback verification unavailable after bounded evidence;
- duplicate/conflicting rollback evidence;
- more than one rollback attempt indicated;
- lineage corruption.

W04 becomes `manual_intervention`.

No second rollback is allowed.

## W04 lifecycle mapping

W07 owns the previously deferred claimed-state terminal transitions.

### Proven no dispatch

When W07 remains pre-dispatch and exact no-dispatch proof exists:

- W07: `cancelled_before_dispatch`;
- W04: `claimed -> released`.

This applies only before `dispatch_started`.

### Forward attempt spent, safe terminal no-write

When provider dispatch occurred but an authoritative rejection plus provider read proves the exact before-state remained:

- W07: `forward_rejected_no_write`;
- W04: `claimed -> consumed`.

The action cannot be retried from the same reservation.

### Forward verified live

- W07: `forward_verified_live`;
- W04: `claimed -> consumed`.

### Rollback verified closed

- W07: `rollback_verified_closed`;
- W04: `claimed -> consumed`.

### Uncertain / unsafe closure

- W07: `manual_intervention_required`;
- W04: `claimed -> manual_intervention`.

This remains a blocking site state.

## Why W04 stays claimed during nonterminal W07 work

W04 currently treats `claimed` and `manual_intervention` as active/blocking states.

W07 must preserve `claimed` while:

- prewrite dispatch is reserved;
- dispatch may be in flight;
- forward verification is pending;
- rollback is required;
- rollback is in progress;
- rollback verification is pending.

This preserves the one-active-site-mutation invariant without weakening W04 uniqueness.

W04 must not be set to `consumed` at `dispatch_started`, because `consumed` is non-blocking and could allow a second site reservation while the first mutation remains unresolved.

## Pause semantics

If pause becomes effective before `dispatch_started`:

- cancel prewrite dispatch;
- prove no dispatch;
- W04 may close `claimed -> released`.

If pause becomes effective after `dispatch_started`:

- no new forward write;
- current action may perform only safety closure;
- verification may continue;
- rollback may occur only if required by forward verification failure.

Pause alone does not force rollback of a confirmed verified change.

## Drain semantics

Before `dispatch_started`:

- cancel/release when exact no-dispatch proof exists.

After `dispatch_started`:

- no new forward work;
- finish safety closure;
- terminal verified live / rollback verified / manual intervention are allowed;
- drain cannot be considered complete while W04 remains `claimed` or `manual_intervention`.

## Kill semantics

Kill has highest precedence.

Before `dispatch_started`:

- cancel/release with exact no-dispatch proof.

After `dispatch_started`:

- never issue a second forward write;
- continue reconciliation;
- if the after-state is observed for a nonterminal action after kill became effective, safe default is rollback to the exact approved before-state;
- perform at most the already-bounded single rollback;
- uncertainty -> manual intervention.

A historical `forward_verified_live` action that became fully terminal before kill is not retroactively rolled back merely because kill was later requested.

## Control epoch and safety closure

New forward dispatch requires the exact same running control epoch accepted by W05/W06.

Once `dispatch_started` is committed, later pause/drain/kill changes do not invalidate the need for safety closure.

Safety closure is not forward authority.

W07 must distinguish:

- **forward eligibility** — requires exact same running claim epoch;
- **safety closure eligibility** — may continue after control changes because a side effect may already exist.

## Policy quota and cooldown recheck

W07 must not rely only on the historical W01 quota/cooldown snapshot.

Immediately before dispatch start, W07 must recheck:

- max 1 policy forward action per 24 hours for the initial canary;
- same Product GID + field cooldown >=14 days;
- max one active policy mutation per site;
- max one W07 forward attempt for this exact claim.

The authoritative future quota/cooldown query must include W07 dispatch history.

The same-target cooldown should also conservatively account for exact identifiable retained human Task #54 mutations on the same Product/field when such lineage is available, so the policy engine cannot immediately override a recent human-governed change.

W07 must not mutate human history rows.

## Human execution concurrency

Immediately before dispatch start W07 must also verify there is no conflicting active human provider execution for Diamond Shelf.

The policy path must be unable to start a provider write concurrently with an active Task #54 deployment.

This is a read-only compatibility check against the human execution namespace.

W07 must not create/update/delete human deployment rows.

## Dispatch uniqueness constraints

Future migration 0007 should enforce at minimum:

- one W07 dispatch row per W05 claim;
- one W07 dispatch row per W04 reservation;
- one W07 dispatch row per W03 policy action;
- one active/nonterminal W07 dispatch per site;
- one active/nonterminal exact Product GID + field dispatch;
- forward attempt count <=1;
- rollback attempt count <=1;
- exact provider/domain/resource/action/field/scope checks for the initial class.

Identity collision must fail closed.

## Database locking order

W07 transactions that touch policy control state should preserve one canonical order:

1. W05 control row;
2. W04 reservation row;
3. W05 claim row;
4. W07 dispatch row.

This order applies to:

- reserve-prewrite;
- dispatch-start;
- terminal release/consume/manual-intervention;
- rollback-start;
- terminal rollback closure.

Consistent order reduces claim/control/dispatch deadlock ambiguity.

## Database transaction clock

PostgreSQL transaction time remains authoritative for:

- W03 authorization freshness;
- W06 preflight freshness;
- dispatch reservation/start timestamps;
- control event ordering;
- W07 state transitions;
- terminal closure timestamps.

Caller wall clocks cannot extend authority.

## No database lock across provider network I/O

W07 must never hold PostgreSQL row locks while waiting for Shopify or storefront network responses.

Required pattern:

1. short validation/state-transition transaction;
2. commit;
3. bounded network operation;
4. fresh short reconciliation transaction.

This preserves control responsiveness and avoids long-lived mutation locks.

## No automatic forward retry

This is a hard W07 invariant.

A forward provider call may be attempted at most once for the exact claim.

Forbidden:

- generic retry middleware around the mutation;
- worker retry that re-enters the forward mutation;
- HTTP retry on timeout;
- replay that re-sends the mutation;
- catch-up execution that sends a second forward request.

A transient transport failure after `dispatch_started` is an uncertainty problem, not a retry signal.

## No automatic rollback retry

Rollback is also at most one provider mutation.

If the rollback request outcome is uncertain, rejected, or its verification fails:

- do not retry rollback;
- enter manual intervention.

## Verification-read retries are different

Read-only provider/storefront verification may use bounded retry/propagation checks.

This does not violate the one-write rule.

W07 implementation must keep write retries and read retries structurally separate.

## W07 final result artifact

Recommended result version:

`p8-8-w07-policy-single-action-apply-v1`

Recommended terminal dispositions:

- `cancelled_before_dispatch`;
- `forward_rejected_no_write`;
- `forward_verified_live`;
- `rollback_verified_closed`;
- `manual_intervention_required`.

Recommended nonterminal/recovery dispositions:

- `reserved_prewrite`;
- `dispatch_started`;
- `forward_verification_pending`;
- `rollback_required`;
- `rollback_started`;
- `rollback_verification_pending`.

The artifact must bind exact W01–W07 identities and all provider/verification/rollback evidence fingerprints.

## Public-write occurrence classification

W07 should expose an explicit classification:

- `none`;
- `confirmed`;
- `possible`.

Rules:

- before `dispatch_started`: `none`;
- `dispatch_started` without authoritative response: `possible`;
- accepted mutation or exact observed after-state: `confirmed`;
- authoritative rejection plus exact before-state proof: terminal no-write state;
- ambiguity: `possible` and manual intervention.

## Provider request evidence

Persist only bounded evidence:

- provider request ID when returned;
- HTTP status;
- operation fingerprint;
- response fingerprint;
- normalized user-error fingerprints/messages as bounded metadata;
- exact target/field identities;
- timestamps.

Do not persist:

- access tokens;
- authorization headers;
- raw full response bodies;
- unrelated Product fields.

## W07 and P8.4/P8.5

W07 should reuse the **safety semantics** of P8.4/P8.5:

- independent verification;
- unavailable != failed;
- rollback only after confirmed forward write and failed verification;
- exact restore state;
- one rollback maximum;
- manual intervention on uncertainty.

W07 must not call P8.5 as though a pure planning artifact itself authorizes rollback.

The W07 execution layer owns the policy-specific durable write fence; P8.5 remains descriptive planning evidence.

## W07 and Task #54

W07 should preserve Task #54's safety guarantees without calling Task #54's human execution path.

W07 may refactor/reuse pure low-level helpers for:

- bounded propagation verification;
- provider/storefront observation;
- common Shopify transport parsing;

only when that reuse does not import:

- human approval;
- action/deployment persistence;
- human confirmation;
- Task #53 normalization;
- Task #54 lifecycle state.

## No provider writes during W07 engineering certification

Future W07 implementation certification must be network-isolated from real providers.

Provider mutation/read/storefront behavior in tests must use:

- injected transports;
- deterministic fake Shopify responses;
- deterministic fake storefront responses;
- dedicated localhost ephemeral PostgreSQL only.

No live Shopify request is required to certify W07 implementation.

Live Stage 1 activation remains W10.

## Future ephemeral database boundary

Recommended dedicated test variable:

`P8_8_W07_EPHEMERAL_DATABASE_URL`

Requirements:

- explicit only;
- localhost only;
- database exactly `seo_engine_test`;
- no generic `DATABASE_URL` fallback;
- W04/W05/W06/W07 migrations may be applied only to the dedicated ephemeral DB during W07 certification;
- no Replit Development DB;
- no Production DB.

If future migration 0007 adds the two recommended W07 tables, the W07 engineering schema would be expected to grow from 41 to **43** public base tables.

That count is a future implementation review target, not an authorization to create the tables now.

## Future W07 engineering packages

A later separately authorized implementation may be split as follows.

### W07-E1 — pure W06 -> W07 execution contracts

- canonical W01–W06 integrity;
- deterministic execution/dispatch identities;
- state machine;
- terminal mapping;
- no DB/network imports.

### W07-E2 — dispatch schema/store

- additive migration 0007;
- `policy_mutation_dispatches`;
- `policy_mutation_dispatch_events`;
- exact constraints/unique indexes;
- explicit DB URL only;
- reserve/start/close transactions;
- canonical lock order;
- no Production application.

### W07-E3 — exact Shopify Product mutation adapter

- exact W02 after bytes;
- Product `productUpdate` only;
- exact GID;
- write credential profile/scope validation;
- no Task #53 normalization;
- injected transport only in tests;
- no automatic write retry.

### W07-E4 — verification / rollback safety closure

- exact raw provider after/before checks;
- P8.4-equivalent provider + storefront verification;
- bounded read retries;
- one rollback maximum;
- kill safety closure;
- terminal W04 release/consume/manual-intervention mapping.

### W07-E5 — crash/replay/race certification

- duplicate dispatch blocked;
- duplicate rollback blocked;
- crash before dispatch-start safely releasable;
- crash after dispatch-start never re-dispatches;
- control race before dispatch blocks;
- control race after dispatch allows safety closure only;
- quota/cooldown/human-concurrency blockers;
- write outcome uncertainty -> manual intervention;
- exact terminal W04 status;
- static proof no route/startup/scheduler/worker binding;
- zero live provider access.

W07 implementation remains separately authorized.

## Future regression matrix

W07 implementation should prove at minimum:

1. exact W06 ready + all fresh checks -> one `reserved_prewrite` dispatch;
2. exact replay returns same dispatch and does not duplicate;
3. stale/tampered W01–W06 fails;
4. W06 blocked/unavailable/uncertain cannot reserve dispatch;
5. W06 expired cannot dispatch;
6. W03 expired by DB clock cannot dispatch;
7. W04 not claimed fails;
8. W05 claim mismatch fails;
9. missing control fails;
10. paused/draining/drained/killed before dispatch blocks and closes no-dispatch when safe;
11. later running control revision does not revive old claim;
12. quota exhausted blocks;
13. same-target cooldown violation blocks;
14. active human Task #54 execution blocks;
15. wrong credential profile blocks;
16. missing `write_products` blocks;
17. policy execution gate false blocks;
18. public-write gate false blocks;
19. final provider before-state mismatch blocks;
20. Task #53 normalized fingerprint cannot substitute for W02 exact equality;
21. `reserved_prewrite` crash can cancel/release with no-dispatch proof;
22. `dispatch_started` replay never re-sends forward mutation;
23. forward attempt count can never exceed 1;
24. exact after bytes are sent without normalization;
25. mutation touches only Product SEO description;
26. authoritative user error plus exact before-state closes no-write;
27. ambiguous transport outcome never retries and enters manual intervention;
28. accepted receipt alone cannot mark success;
29. exact provider after-state required;
30. provider + storefront verification required;
31. verification unavailable after write never becomes success;
32. verified forward closes W04 consumed;
33. failed verified forward permits exactly one rollback;
34. rollback uses exact W02 before bytes;
35. rollback attempt count can never exceed 1;
36. uncertain rollback enters manual intervention;
37. rollback verified closure closes W04 consumed;
38. no-dispatch cancellation closes W04 released;
39. uncertain closure closes W04 manual_intervention;
40. W05 claim remains immutable;
41. kill after dispatch-start cannot create a second forward write;
42. kill before terminal observed-after routes toward rollback safety closure;
43. no human approval/action/deployment row is created;
44. Task #54 confirmation is never generated;
45. no route/startup/scheduler/worker binding exists;
46. no live Production provider/DB access occurs in engineering tests.

## Review risk register

### R1 — duplicate forward mutation after crash

**Risk:** process crashes after request may have started and replay sends it again.

**Decision:** durable `dispatch_started` point-of-no-return consumes the only forward attempt; replay never re-sends.

### R2 — freeing W04 too early

**Risk:** setting W04 `consumed` at dispatch start makes W04 non-blocking while verification/rollback remains unresolved.

**Decision:** keep W04 `claimed` until safe terminal closure; only then consume/release/manual-intervention.

### R3 — normalized policy mutation

**Risk:** reusing Task #53 mutation helper collapses whitespace and breaks W02 exact state.

**Decision:** W07 policy mutation adapter sends exact W02 after bytes.

### R4 — mutation receipt treated as success

**Risk:** provider response accepted but public/storefront state is not converged.

**Decision:** exact raw provider after-state plus independent provider/storefront verification are mandatory.

### R5 — write retry on transport error

**Risk:** network retry creates duplicate mutation.

**Decision:** no automatic forward retry after point-of-no-return.

### R6 — rollback retry

**Risk:** duplicate rollback may oscillate/overwrite state.

**Decision:** rollback attempt count is durable and capped at one.

### R7 — human/policy path collision

**Risk:** W07 uses Task #54 confirmation or human deployment rows as policy authority.

**Decision:** dedicated policy execution provenance and dispatch tables only.

### R8 — global public-write gate accidentally activates policy writes

**Risk:** a human Task #54 maintenance window opens the global gate and inadvertently makes W07 executable.

**Decision:** future policy writes require an additional dedicated policy execution gate, default false.

### R9 — provider idempotency assumption

**Risk:** assuming Shopify `productUpdate` has an idempotency key when the exact mutation contract does not expose one.

**Decision:** local durable W07 at-most-once fence is mandatory; provider idempotency is not assumed.

### R10 — control change during in-flight safety closure

**Risk:** pause/drain/kill causes state abandonment after a possible write.

**Decision:** no new forward mutation, but verification/rollback safety closure continues.

### R11 — kill leaves nonterminal after-state live

**Risk:** kill occurs after forward side effect but before terminal verification.

**Decision:** if after-state is observed post-kill on a nonterminal action, safe default is one rollback.

### R12 — verification fingerprint-domain mismatch

**Risk:** normalized provider/storefront verification hides byte-exact provider drift.

**Decision:** exact W02-domain provider state is required in addition to P8.4-equivalent dual verification.

## Specification acceptance checklist

W07 specification is acceptable only if:

- W06 readiness remains non-authoritative by itself;
- W07 revalidates exact W01–W06 lineage;
- policy and human provenance remain distinct;
- W04 remains claimed throughout nonterminal provider work;
- durable W07 dispatch fence exists before provider mutation;
- at most one forward attempt is possible;
- no automatic forward retry exists;
- exact W02 after bytes are used;
- accepted receipt alone is not success;
- exact provider after-state is required;
- independent provider + storefront verification is required;
- at most one rollback attempt is possible;
- exact W02 before bytes are used for rollback;
- uncertainty enters manual intervention;
- claimed -> released occurs only with proven no-dispatch;
- claimed -> consumed occurs only after a spent forward attempt reaches safe terminal closure;
- claimed -> manual_intervention blocks the site when unsafe;
- pause/drain/kill semantics distinguish forward authority from safety closure;
- dedicated policy execution gate defaults off;
- migration 0007 remains separately gated;
- live provider execution remains W10;
- W08–W10 remain out of scope.

## Explicit non-authorization

This W07 specification authorizes no:

- W07 implementation;
- migration 0007 creation/application;
- Production migration 0005/0006/0007 application;
- Production DDL/DML;
- Production dispatch row/event creation;
- Production reservation/control/claim transition;
- live Production provider read;
- Shopify mutation;
- rollback mutation;
- public-site write;
- Task #51/#53/#54 execution;
- human approval/action/deployment mutation;
- scheduler/worker/policy activation;
- credential/scope/config changes;
- `PUBLIC_SITE_WRITES_ENABLED` change;
- `P8_8_POLICY_MUTATION_EXECUTION_ENABLED` change;
- deployment;
- publication;
- W08–W10.

## Next explicit authorization boundary

After W07 specification/review is merged and certified, W07-E1 through W07-E5 implementation requires a new explicit authorization.

That future implementation authorization should continue to exclude:

- Production migrations 0005/0006/0007;
- Production DDL/DML/control/reservation/claim/dispatch changes;
- live Production provider reads;
- all real provider/public-site writes;
- Task #51/#53/#54 execution;
- scheduler/worker/policy/autonomous activation;
- credentials/scopes/config changes;
- deployment/publication;
- W08–W10.

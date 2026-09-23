# P8.8 W06 — policy-aware mutation-free preflight specification

**Issue:** #451  
**Status:** SPECIFICATION / REVIEW ONLY — W06 IMPLEMENTATION, LIVE PROVIDER READS AND W07+ BLOCKED

## Purpose

W06 defines the policy-aware, mutation-free preflight boundary between:

- the exact certified W01 policy admission;
- the exact certified W02 governed proposal materialization;
- the exact W03 provenance-distinct policy authorization;
- the exact W04 durable reservation receipt;
- the exact W05 immutable control claim and current durable mutation-control state;

and a future W07 policy-aware single-action apply.

W06 answers only:

> Is this exact already-claimed policy action still safe to present to W07 for a later, separately authorized final dispatch decision, based on exact lineage, current durable control/claim state and an authoritative read-only provider observation of the approved before-state?

W06 must never answer:

> May I write to Shopify now?

A W06 result is therefore never provider-write authority.

## Hard boundary

W06 is **mutation-free**.

The future W06 implementation may perform only:

- deterministic pure lineage reconstruction;
- read-only PostgreSQL inspection of existing W04/W05 state;
- one bounded authoritative Shopify **read** of the exact Product SEO state through a dedicated read-only adapter;
- deterministic preflight/no-dispatch artifact construction.

W06 must not:

- mutate Shopify or any public site;
- call a provider mutation function;
- insert/update/delete a Production database row;
- release/consume/expire a W04 reservation;
- mutate a W05 claim or control row;
- create a human action/approval/deployment/verification row;
- invoke Task #51/#53/#54;
- open the public-write gate;
- start a scheduler or worker;
- grant W07 dispatch authority;
- create or renew policy authority.

Any future control-plane state transition based on a W06 no-dispatch proof belongs to a separately certified W07/closure integration boundary.

## Initial policy class remains unchanged

W06 remains closed to exactly:

`shopify.product.seo.meta_description`

Required exact scope:

- site/domain: Diamond Shelf / `diamondshelf.us`;
- provider: `shopify`;
- resource kind: `product`;
- resource GID: `gid://shopify/Product/<positive integer>`;
- target URL: exact canonical `https://diamondshelf.us/products/<slug>`;
- action type: `update_meta_description`;
- field: `meta_description`;
- policy-required future write scope label: `write_products`;
- W01 effective risk: exactly `low`;
- W01 proposal generation: `p9.7_deterministic_preview`.

W06 must not broaden the initial class to:

- collections;
- SEO title;
- media alt / `write_files`;
- visible title/body HTML;
- handles/URLs;
- inventory/price/status;
- theme/files;
- another provider/domain.

## Provenance remains policy-only

W06 provenance must remain structurally distinct from the human execution path.

Recommended preflight provenance:

`preflightProvenance = "policy_preflight"`

W06 must never fabricate or consume as policy authority:

- an `approvals` row;
- a human approval actor/decision;
- a Task #51 `controlled_execution_foundation_v1` envelope;
- a human `actions` row;
- `EXECUTE_AND_ROLLBACK_TASK53:...`;
- `APPLY_AND_VERIFY_TASK54:...`;
- Task #54 deployment/verification lifecycle state.

The existing Task #51/#54 behavior remains unchanged.

## Exact required W01–W05 inputs

Future W06 engineering must accept enough information to **rebuild or integrity-check** every prior authority instead of trusting detached IDs.

### W01

Require the exact:

- W01 evaluation input;
- supplied W01 evaluation.

W06 must canonically rebuild W01 and require:

- version exact;
- grant integrity exact;
- decision exactly `admit`;
- rejection reasons empty;
- policy class exact;
- policy ID/version/fingerprint exact;
- evaluation ID/fingerprint exact;
- recommendation/proposal/target/before/after lineage exact.

W06 must not mutate the original W01 current-state snapshot and rerun it as if it were a new W01 evaluation. W01 is historical admission lineage.

### W02

Require the exact:

- W02 materialization input;
- supplied W02 materialization.

W06 must canonically rebuild W02 and require:

- version exact;
- lifecycle `materialized_unpersisted`;
- exact single changed `meta_description`;
- exact target binding;
- exact byte-for-byte before value;
- exact byte-for-byte after value;
- exact before/after fingerprints;
- exact proposal/materialization/idempotency fingerprints.

### W03

Require the exact W03 policy authorization and enough prior inputs to verify it canonically.

Required:

- `authorizationProvenance="policy_authorization"`;
- exact policy authorization ID/fingerprint;
- exact policy action ID;
- exact W01/W02 shared lineage;
- exact W04 precommitted reservation identity;
- no human authorization fields;
- no Task #51/#54 compatibility.

W06 must not renew W03.

### W04

Require the exact durable W04 reservation receipt.

Required:

- receipt integrity exact;
- exact W03/W04 durable pairing;
- reservation ID/fingerprint exact;
- target/before/after identity exact;
- current durable reservation row still exactly `claimed`;
- no `consumed`, `released`, `expired` or `manual_intervention` row may be treated as preflight-ready.

### W05

Require the exact durable W05 claim receipt.

Required:

- claim receipt version/fingerprint exact;
- exact W04 reservation ID/fingerprint;
- exact W03 authorization ID/fingerprint;
- exact policy action ID;
- exact Product GID/URL/field;
- exact before/after fingerprints;
- exact claimed control revision/fingerprint;
- durable claim row exists and matches the receipt exactly.

A W04 row with status `claimed` but no exact W05 immutable claim remains uncertain and cannot preflight.

## Cross-lineage equality

W06 must fail closed unless every execution-relevant identity agrees across W01–W05.

At minimum:

- policy class;
- policy ID/version/fingerprint;
- W01 evaluation ID/fingerprint;
- W02 materialization ID/fingerprint;
- proposal ID/fingerprint;
- recommendation fingerprint/idempotency key;
- W03 policy authorization ID/fingerprint;
- policy action ID;
- W04 reservation ID/fingerprint;
- W05 claim ID/fingerprint;
- site ID;
- provider/domain/resource kind;
- Product GID;
- target URL;
- action type;
- field;
- required provider scope label;
- target-binding fingerprint where present;
- before fingerprint;
- after fingerprint.

No timestamp proximity, URL similarity, matching value alone or caller-selected ID may repair a lineage mismatch.

## Current durable control requirement

W05 claim identity binds the control revision/fingerprint accepted at claim time.

W06 must also inspect the **current** durable control state.

For a forward preflight to become `ready_for_w07`:

- current control state must exist;
- current mode must be exactly `running`;
- current revision must equal the claim's accepted control revision;
- current control fingerprint must equal the claim's accepted control fingerprint.

A later control transition invalidates the claimed preflight authority even if the control later appears `running` again.

W06 must not treat:

- pause -> resume;
- drain -> resume;
- a later new running revision;

as equivalent to the original claimed revision.

This is an anti-TOCTOU rule: the claim and W06 readiness must remain on the exact same durable control epoch.

Modes `paused`, `draining`, `drained` and `killed` always block new forward progression.

Killed remains latched under W05 semantics.

## Policy stage requirement

W01 currently supports `shadow` and `single_action_canary`.

W06 may inspect a shadow-stage action read-only, but:

- `policyStage="shadow"` must never yield `ready_for_w07`;
- only exact `single_action_canary` may be forward-preflight eligible.

A shadow result may produce a no-dispatch observation artifact only.

## Database clock and authorization freshness

Integrated W06 validation must use PostgreSQL transaction time as the authoritative clock for durable authorization freshness.

At final preflight validation:

- W03 `issuedAt <= databaseNow < expiresAt`;
- W04 claimed reservation must still be bound to that authorization;
- no W06 output may extend W03 expiry.

Caller wall-clock time must not decide authorization freshness.

## Read-only durable snapshot sequencing

W06 must not hold a database row lock across a provider network request.

Recommended sequence:

1. read and integrity-check the exact W04 reservation + W05 claim + current control snapshot;
2. perform the bounded provider read;
3. open a fresh final read-only database transaction;
4. re-read W04 reservation, W05 claim and current control;
5. require them to be byte-for-byte/field-for-field identical to the pre-read durable snapshot;
6. read database transaction time;
7. evaluate W03 freshness and final control eligibility;
8. construct the W06 result.

Any durable state change between the two snapshots fails closed.

W06 itself performs no DML.

## Provider-read prerequisite

A forward-ready W06 result requires one authoritative, read-only Shopify observation of the exact Product SEO `meta_description`.

The read adapter must prove:

- provider is Shopify;
- returned resource type is Product;
- returned GID exactly equals the W02/W03/W04/W05 Product GID;
- requested field is exactly `meta_description`;
- response is from the intended Shopify store;
- raw observed SEO description value is captured without W06 text rewriting;
- provider request/transport provenance is bounded and does not expose credentials.

The provider read may use HTTP POST for a Shopify GraphQL **query**. HTTP POST alone is not a mutation.

However the W06 adapter must never send a GraphQL `mutation` operation.

## Read credential boundary

W06 provider observation must use a read-capable credential/connection path only.

The W01/W02/W03 label `requiredProviderScope="write_products"` is future mutation-policy lineage. It must not be interpreted by W06 as permission to load or exercise a write credential.

W06 must not require a live write credential to perform preflight.

A future W07 package owns:

- write-credential resolution;
- write-scope verification;
- provider-dispatch authority;
- final mutation transport.

No credential/scope mutation is part of W06.

## W02 state-fingerprint domain is authoritative

A critical compatibility rule:

The existing human Task #53 state fingerprint is **not** the W02 state fingerprint.

Task #53 currently normalizes whitespace and hashes:

- field;
- normalized value.

W02 intentionally preserves byte-for-byte proposal state and hashes a target-bound object containing:

- W02 version;
- before/after purpose;
- provider;
- resource kind;
- Product GID;
- target URL;
- field;
- exact value.

Therefore W06 must **not** compare a Task #53 `executionStateFingerprint` directly to W02/W03/W04/W05 `beforeFingerprint`.

That would compare different fingerprint domains.

## Exact W06 observed-before reconstruction

For stale-before validation, W06 must reconstruct the exact W02 **before-state fingerprint domain** from the live provider observation.

Future engineering should reuse the certified W02 algorithm without changing its hash payload.

Preferred implementation approach:

- expose a behavior-preserving pure W02 state-fingerprint helper; or
- add a W06 helper proven by regression tests to produce exactly the same fingerprint as W02 for identical target/value/purpose inputs.

No normalization, trimming, whitespace collapse, HTML transformation or AI/text rewrite is allowed before this authoritative comparison.

The authoritative stale-before check is:

1. provider raw observed value equals W02 exact `before.value`; and
2. W02-domain fingerprint reconstructed from that observed value equals the exact W02/W03/W04/W05 `beforeFingerprint`.

Both are required.

A diagnostic normalized fingerprint may be recorded separately, but it can never make a byte-exact mismatch pass.

## Provider observation outcomes

Recommended read-result classes:

- `observed` — authoritative resource/field/value read succeeded;
- `unavailable` — transport/timeout/provider availability prevented authoritative observation;
- `identity_mismatch` — provider response did not identify the exact Product;
- `invalid_response` — response shape/integrity could not be trusted.

Only `observed` can be forward-ready.

Unavailable evidence must remain unavailable; it is not success.

## Stale-before semantics

Forward readiness fails closed when:

- raw provider value differs from W02 before value;
- W02-domain observed-before fingerprint differs;
- provider already shows the proposed after value;
- provider shows any third state;
- provider identity is wrong;
- provider observation is unavailable;
- provider response is invalid.

A stale provider state does **not** imply that W06 performed a write.

W06 must never automatically rollback provider drift because W06 is mutation-free and cannot know that an external state change belongs to this policy action.

The correct W06 behavior is:

- block forward progression;
- certify no W06 dispatch when durable lineage is otherwise intact;
- allow later control-plane claim release under the separately certified closure bridge;
- require a fresh future W01–W05 lineage for another attempt.

## Storefront pre-read is not an initial readiness requirement

P8.4 independent provider + storefront verification remains authoritative **after a possible provider write**.

For W06 preflight, Shopify Admin/provider state is the authoritative current-state source.

A storefront pre-read may be added later as bounded diagnostic evidence, but it must not:

- override a provider mismatch;
- convert provider-unavailable to ready;
- substitute for exact Product identity;
- create rollback authority.

This keeps preflight distinct from post-write verification.

## Public-write gate posture

W06 must never open or require opening `PUBLIC_SITE_WRITES_ENABLED`.

The initial W06 contract should fail closed if a caller attempts to make W06 readiness depend on an enabled public-write gate.

Recommended W06 semantics:

- public-write gate remains closed during W06;
- W06 provider-write markers remain false;
- future W07 separately defines any controlled dispatch gate.

W06 must not mutate configuration.

## Recommended W06 result version

`p8-8-w06-policy-preflight-v1`

Recommended result dispositions:

- `ready_for_w07`;
- `blocked_no_dispatch`;
- `provider_read_unavailable_no_dispatch`;
- `state_uncertain`.

### `ready_for_w07`

Requires all of:

- exact W01–W05 integrity;
- exact durable W04 `claimed` row;
- exact immutable W05 claim;
- current control exact same running revision/fingerprint as claim;
- policy stage `single_action_canary`;
- W03 authorization fresh by database clock;
- exact authoritative provider observation;
- exact byte-for-byte before value match;
- exact W02-domain before fingerprint match;
- no W06 dispatch attempt;
- no provider write.

This disposition means only:

> W07 may later consider this exact preflight.

It does not mean W07 may dispatch without further validation.

### `blocked_no_dispatch`

Used for deterministic non-ready conditions after durable claim integrity is proven, including:

- control not running;
- control revision/fingerprint changed;
- policy stage shadow;
- authorization expired;
- provider observed stale/different state;
- provider identity/response mismatch that is authoritative and attributable to this read;
- preflight freshness window invalid.

No rollback is implied.

### `provider_read_unavailable_no_dispatch`

Used when:

- exact W01–W05 durable integrity is proven;
- W06 did not dispatch;
- provider observation cannot be obtained safely.

Initial W06 should not automatically retry in a loop.

A later attempt should use fresh policy/control state rather than treating unavailable evidence as ready.

### `state_uncertain`

Used for control-plane integrity uncertainty, including:

- W04 claimed without exact W05 claim;
- claim/receipt/row mismatch;
- current durable snapshot changes during preflight;
- conflicting identity/fingerprint evidence;
- schema/transaction state cannot be proven;
- a supplied artifact is tampered or detached.

`state_uncertain` is not eligible for automatic claim release.

## W06 preflight identity

Recommended deterministic ID:

`p88w06-preflight-<first-24-hex-of-preflight-fingerprint>`

The preflight fingerprint must bind at minimum:

- W06 version/provenance;
- disposition;
- exact W01 evaluation fingerprint;
- exact W02 materialization/proposal fingerprints;
- W03 authorization ID/fingerprint;
- policy action ID;
- W04 reservation ID/fingerprint;
- W05 claim ID/fingerprint;
- claimed control revision/fingerprint;
- final current control revision/fingerprint/mode;
- site/Product GID/URL/field;
- exact before/after fingerprints;
- provider observation status;
- provider raw observed-value fingerprint in the W02 domain when available;
- provider request provenance fingerprint when available;
- database validated-at timestamp;
- preflight expiry;
- sorted blockers;
- all no-dispatch/safety markers.

Exact replay of the same canonical inputs and same observation/time evidence is stable.

A new provider observation or later durable snapshot creates a new preflight fingerprint.

## Short preflight validity

W06 readiness must be narrower than the already-bounded W03 authorization.

For the initial canary, recommended maximum W06 readiness age:

**60 seconds**

`preflightExpiresAt` must be the earlier of:

- `validatedAt + 60 seconds`;
- W03 `expiresAt`.

This does not authorize dispatch for 60 seconds.

W07 must still perform its own final atomic/state revalidation immediately before any provider mutation.

W06 never extends W03.

## No-dispatch proof

W06 must define a distinct proof for the exact claim/preflight.

Recommended version:

`p8-8-w06-no-dispatch-proof-v1`

The proof must bind:

- preflight ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- W04 reservation ID/fingerprint;
- W05 claim ID/fingerprint;
- exact target;
- before/after fingerprints;
- control revision/fingerprint inspected;
- provider-read outcome;
- database validation time;
- preflight disposition.

Required immutable markers:

- `executionPhase="pre_dispatch_proven"`;
- `providerDispatchAttempted=false`;
- `providerMutationCalled=false`;
- `providerWritePerformed=false`;
- `publicSiteWritePerformed=false`;
- `task51ExecutionPerformed=false`;
- `task53ExecutionPerformed=false`;
- `task54ExecutionPerformed=false`;
- `rollbackWritePerformed=false`;
- `automaticTransition=false`.

The proof must be structurally incapable of being interpreted as a provider mutation receipt.

## No-dispatch proof scope

A W06 no-dispatch proof proves only:

> This exact W06 policy-preflight path did not begin provider mutation dispatch for this exact claim.

It does **not** prove:

- no human changed Shopify;
- no external system changed Shopify;
- the provider state never changed;
- the proposed state is currently absent;
- rollback is safe;
- a future W07 dispatch is authorized.

This scope limitation is mandatory.

## Claim-release eligibility projection

W06 may project whether the exact claim is eligible for a later control-plane release.

Recommended field:

`claimReleaseEligibility`

Values:

- `retain_for_w07`;
- `release_eligible_no_dispatch`;
- `not_releasable_uncertain`.

Rules:

### ready_for_w07

- `retain_for_w07`.

The W04 reservation remains `claimed`.

### blocked_no_dispatch

When durable W03/W04/W05 integrity is exact and no dispatch is proven:

- `release_eligible_no_dispatch`.

### provider_read_unavailable_no_dispatch

When durable W03/W04/W05 integrity is exact and W06 itself cannot dispatch:

- `release_eligible_no_dispatch`.

### state_uncertain

- `not_releasable_uncertain`.

W06 specification/engineering does not perform the release.

## Future safety-closure transaction

A later separately authorized W07/closure bridge may consume `release_eligible_no_dispatch` only if it atomically proves the no-dispatch condition remains true.

Required future lock/order semantics should preserve W05 order:

1. lock current control row;
2. lock exact W04 reservation row;
3. lock exact W05 claim row;
4. validate exact W06 no-dispatch proof;
5. verify no W07 dispatch lease/intent/receipt exists for the claim;
6. require W04 status still `claimed`;
7. transition only `claimed -> released`;
8. retain the immutable W05 claim as history;
9. use database transaction time;
10. record bounded terminal reason `w06_preflight_no_dispatch`.

W06 itself does not implement this transaction.

## Why W06 must not rollback on preflight failure

Before W07 dispatch, W06 has performed no provider mutation.

Therefore a provider mismatch during W06 can have originated from:

- a human operator;
- another external system;
- an earlier legitimate change;
- stale upstream proposal lineage.

Automatically restoring W02's before-state could overwrite a legitimate external change.

So W06 preflight failure must never call rollback.

Rollback/verification safety closure belongs only after a possible W07 side effect and must reuse P8.4/P8.5 semantics.

## Forward mutation vs safety closure

W06 must preserve W05's distinction.

### Pre-dispatch proven

W06 may:

- perform read-only validation;
- emit no-dispatch proof;
- project claim-release eligibility.

It may not write.

### Side effect possible

If any later evidence says a provider side effect may have occurred, W06 is no longer the governing closure layer.

The action must move to later independent verification / rollback / manual-intervention semantics.

W06 must never downgrade `side_effect_possible` to `pre_dispatch_proven`.

## W07 handoff contract

A future W07 implementation may accept only a W06 result with:

- exact version;
- disposition `ready_for_w07`;
- exact preflight fingerprint integrity;
- exact no-dispatch proof;
- `claimReleaseEligibility="retain_for_w07"`;
- preflight not expired;
- W03 authorization not expired;
- same W04/W05 claim lineage.

Even then, W07 must independently and atomically revalidate:

- current control;
- current claim/reservation;
- final provider before-state;
- dispatch idempotency/lease;
- write credential/scope;
- any runtime/public-write gate required by the W07 design.

W06 readiness is never sufficient by itself.

## Human Task #51/#54 path remains immutable

W06 must not alter:

- Task #51 approval/executable-action semantics;
- human `actions` rows;
- Task #53 preflight/confirmation;
- Task #54 preflight/confirmation;
- Task #54 deployment, verification or rollback behavior.

W06 may reuse pure identity validators or a refactored read-only Shopify query primitive only when that reuse does not import human authorization semantics.

W06 must not call:

- `promoteTask53PreflightToTask54`;
- `getTask54Preflight`;
- Task #54 apply;
- Task #53 mutation transport;
- Task #53 required-confirmation generation.

## Provider-read source architecture

Future W06 source should separate:

1. a pure W01–W05 preflight projector;
2. a read-only durable snapshot loader;
3. a read-only Shopify observation adapter;
4. a mutation-free orchestration function.

The provider adapter should expose only a query/read interface.

Recommended static restrictions:

- no import of `mutateTask53ShopifyState`;
- no import of Task #54 apply/preflight orchestration;
- no GraphQL `mutation` operation in W06 provider source;
- no write credential loader;
- no `PUBLIC_SITE_WRITES_ENABLED=true` mutation;
- no scheduler/worker binding.

## No new W06 schema

W06 specification does not require a new table or migration.

The future initial W06 engineering should prefer:

- existing W04 reservation state;
- existing W05 control/claim state;
- ephemeral deterministic W06 preflight/no-dispatch artifacts.

A later W07 dispatch/closure package may define any additional durable dispatch fence it needs under separate review.

W06 must not smuggle a W07 dispatch table into this work package.

## Database isolation for future engineering

Any future W06 PostgreSQL integration tests must use a dedicated explicit localhost database URL.

Recommended:

`P8_8_W06_EPHEMERAL_DATABASE_URL`

Forbidden:

- fallback to generic `DATABASE_URL`;
- Replit Development DB mutation;
- Production DB access;
- automatic migration 0005/0006 application.

Test setup may apply certified 0005/0006 to the dedicated ephemeral database only.

W06 runtime code remains read-only.

## Recommended W06 engineering packages

A future separate implementation authorization may cover these bounded packages.

### W06-E1 — pure exact-lineage preflight contracts

- canonical W01/W02 rebuild;
- W03/W04 pairing;
- W05 claim integrity;
- exact cross-lineage checks;
- W06 result/fingerprint/no-dispatch contracts;
- no DB/network imports.

### W06-E2 — W02-domain provider observation contract

- raw-value observation type;
- exact W02 before-state fingerprint reconstruction;
- explicit rejection of Task #53 normalized fingerprint substitution;
- deterministic observation fingerprint;
- fake/injected transport tests only.

### W06-E3 — read-only W04/W05 snapshot store

- explicit database URL;
- 41-table W05 engineering schema recognition;
- read-only reservation/claim/control snapshot;
- database transaction timestamp;
- no INSERT/UPDATE/DELETE/DDL;
- no generic `DATABASE_URL`.

### W06-E4 — read-only Shopify preflight adapter/orchestrator

- exact Product read;
- two-snapshot durable validation around network read;
- same control epoch;
- authorization freshness;
- provider before-state match;
- 60-second bounded preflight expiry;
- no write credential;
- no provider mutation.

### W06-E5 — no-dispatch and race certification

- no-dispatch proof;
- release-eligibility projection only;
- control change during read fails closed;
- reservation/claim change during read fails closed;
- provider unavailable/stale state cannot become ready;
- static proof no mutation transport is reachable;
- human Task #51/#54 path unchanged.

W06 implementation must remain separately authorized.

## Required future regression matrix

Future W06 implementation tests must prove at minimum:

1. exact W01–W05 lineage + running same control epoch + exact provider before-state -> `ready_for_w07`;
2. exact replay with identical observation/time evidence is stable;
3. W01 tamper fails;
4. W02 tamper fails;
5. W03 tamper/provenance mismatch fails;
6. W04 receipt/pair mismatch fails;
7. W04 not `claimed` cannot be ready;
8. W04 claimed without exact W05 claim -> `state_uncertain`;
9. W05 claim fingerprint/target/before/after mismatch fails;
10. current control missing fails;
11. current control paused/draining/drained/killed blocks;
12. later running revision does not revive old claimed revision;
13. shadow policy stage cannot be ready;
14. W03 expired by database clock cannot be ready;
15. provider Product identity mismatch blocks;
16. provider read unavailable remains unavailable;
17. raw provider before-value mismatch blocks;
18. provider already at proposed after-value blocks;
19. Task #53 normalized fingerprint equality cannot substitute for W02-domain equality;
20. whitespace-only byte difference fails W02-domain exactness even if Task #53 normalization would collapse it;
21. durable control changes between pre-read/final snapshot fail closed;
22. reservation/claim changes between snapshots fail closed;
23. W06 result never contains human approval/Task #54 confirmation;
24. ready result still has provider dispatch/write/public write false;
25. blocked/read-unavailable exact-state result produces release-eligible no-dispatch projection;
26. uncertain durable state is not release eligible;
27. no preflight outcome invokes rollback;
28. no GraphQL mutation operation is reachable;
29. no DB write/DDL occurs;
30. no route/startup/scheduler/worker binding is added;
31. no Production database/provider call occurs in tests.

## Review risk register

### R1 — fingerprint-domain confusion

**Risk:** reusing Task #53 normalized state fingerprint against W02 byte-exact fingerprints can produce false equivalence.

**Decision:** W02 target-bound byte-exact domain is authoritative for W06.

### R2 — preflight becoming write authority

**Risk:** `ready_for_w07` could be interpreted as dispatch authorization.

**Decision:** every W06 result keeps provider dispatch/write/public-write false; W07 must independently revalidate.

### R3 — control pause/resume TOCTOU

**Risk:** a claim accepted under one control revision could be reused after a later transition.

**Decision:** W06 ready requires current control revision/fingerprint exactly equal the claim epoch.

### R4 — provider drift causing unsafe rollback

**Risk:** W06 sees stale state and restores the historical before value even though W06 never wrote.

**Decision:** rollback is forbidden in W06; drift blocks and closes only at control-plane level.

### R5 — unavailable read promoted to success

**Risk:** provider transport failure is treated as stale-but-okay.

**Decision:** unavailable remains unavailable and cannot be ready.

### R6 — write credential creep

**Risk:** W06 loads write-capable credentials because W01 lineage names `write_products`.

**Decision:** W06 uses read-capable provider access only; W07 owns write credential/scope validation.

### R7 — claim stuck forever after failed preflight

**Risk:** W05 claimed reservation blocks future work.

**Decision:** W06 emits exact no-dispatch + release-eligibility proof; a later W07/closure bridge performs the atomic claimed -> released transition.

### R8 — release racing future dispatch

**Risk:** later closure releases a claim while W07 starts dispatch.

**Decision:** W06 does not perform release. W07/closure must introduce an atomic dispatch fence and prove no W07 dispatch lease/receipt before releasing.

### R9 — schema creep

**Risk:** W06 adds persistence objects that effectively implement W07.

**Decision:** no new W06 schema/migration.

### R10 — human-path impersonation

**Risk:** W06 reuses Task #54 preflight envelope/confirmation to bypass provenance separation.

**Decision:** policy preflight has its own version/provenance and is structurally incompatible with Task #51/#54 authorization.

## W06 capability markers

Every future W06 result/capability report must make these explicit:

- W01 rebuilt/verified = true;
- W02 rebuilt/verified = true;
- W03 policy authorization verified = true;
- W04 durable pairing verified = true;
- W05 durable claim verified = true;
- current durable control inspected = true;
- provider read may be performed = true only by the read adapter;
- provider mutation performed = false;
- provider dispatch authorized = false;
- provider write allowed = false;
- public-site write performed = false;
- rollback write performed = false;
- database write performed = false;
- schema mutation performed = false;
- human approval created = false;
- human action created = false;
- Task #51 execution performed = false;
- Task #53 execution performed = false;
- Task #54 execution performed = false;
- Task #54 confirmation generated = false;
- scheduler activated = false;
- worker activated = false;
- autonomous live execution authorized = false;
- credential/scope/config change = false;
- deployment/publication = false.

## Specification acceptance checklist

W06 specification is acceptable only if it preserves all of the following:

- W01 admission remains historical policy admission only;
- W02 exact values/fingerprints are unchanged;
- W03 provenance remains policy-only;
- W04 reservation identity/lifecycle is unchanged;
- W05 claim/control identity is unchanged;
- human Task #51/#54 behavior is unchanged;
- W06 does not create a dispatch authority;
- W06 does not perform provider/database mutation;
- exact stale-before provider read is mandatory for ready;
- provider-unavailable never becomes success;
- changed control epoch invalidates ready;
- no-dispatch proof is narrow and explicit;
- failed preflight never triggers rollback;
- release eligibility is only a projection;
- W07 must separately implement the dispatch fence/closure;
- W07–W10 remain out of scope.

## Explicit non-authorization

This specification authorizes no:

- W06 implementation;
- W06 live provider read;
- migration creation/application;
- Production DDL/DML/read/write;
- Production control initialization;
- Production reservation/claim transition;
- provider/public-site write;
- Shopify mutation;
- rollback mutation;
- Task #51/#53/#54 execution;
- human approval/action/deployment mutation;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config mutation;
- public-write-gate change;
- deployment;
- publication;
- W07–W10.

## Next explicit authorization boundary

After this W06 specification is merged and certified, the next safe engineering action is a separate explicit W06 implementation authorization.

A suitable implementation authorization should be limited to W06-E1 through W06-E5 and should continue to exclude:

- Production migrations 0005/0006;
- Production DDL/DML/control/claim changes;
- live Production provider reads unless separately authorized;
- all provider writes;
- Task #51/#53/#54 execution;
- policy/scheduler/worker/autonomous activation;
- credentials/scopes/config changes;
- deployment/publication;
- W07–W10.

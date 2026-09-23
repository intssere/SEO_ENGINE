# P8.8 W05 — durable mutation-control bridge specification

**Issue:** #435  
**Status:** SPECIFICATION / REVIEW ONLY — W05 IMPLEMENTATION, PRODUCTION DDL/DML, RUNTIME INTEGRATION AND PROVIDER EXECUTION BLOCKED

## Purpose

W05 defines the durable mutation-control bridge between:

- the certified P9.6 pause / drain / kill / resume semantics;
- the certified P8.8 W03 policy-authorization artifact;
- the certified P8.8 W04 durable reservation/idempotency record;
- the future W06 policy-aware mutation-free preflight;
- the future W07 single-action policy apply adapter.

W05 must make mutation control durable and race-safe without turning control state into provider-write authority.

W05 itself must not:

- call Shopify or any provider;
- mutate the public site;
- invoke Task #51, Task #53 or Task #54;
- fabricate human approval or Task #54 confirmation;
- create or modify human `actions`, `approvals`, `deployments`, `rollbacks` or `verifications` rows;
- activate a scheduler, worker or autonomous execution loop;
- apply Production DDL/DML;
- initialize or activate a Production policy-control row;
- deploy or publish.

## Certified inputs

W05 may rely only on already-certified contracts:

- W01 immutable policy grant/evaluation;
- W02 deterministic governed-proposal materialization;
- W03 provenance-distinct `policy_authorization`;
- W04 deterministic reservation intent, durable reservation row, replay/conflict semantics and W03/W04 pairing;
- P9.6 pure pause/drain/kill/resume semantics;
- P8.4/P8.5 verification, rollback and manual-intervention safety semantics;
- the existing human Task #51/#54 path as an invariant that must remain unchanged.

W05 must not reinterpret or broaden W01–W04 provenance, target scope, policy class, idempotency identity or authorization semantics.

## Initial policy class remains unchanged

W05 remains closed to exactly:

`shopify.product.seo.meta_description`

with:

- site: Diamond Shelf only;
- domain: `diamondshelf.us`;
- provider: Shopify;
- resource: Product only;
- exact Shopify Product GID;
- exact `/products/` target URL;
- action: `update_meta_description`;
- field: `meta_description`;
- provider scope: `write_products`;
- exact before fingerprint;
- exact after fingerprint.

No title, collection, media/file-alt, description HTML, handle, inventory, price, status, publication, theme or broader provider scope is introduced by W05.

## Fundamental control rule

The mutation-control bridge must distinguish two different concepts:

1. **new forward mutation authority**;
2. **mandatory safety closure after a provider side effect may already have started**.

Pause, drain and kill must always block new forward mutation.

They must not abandon an action when a provider side effect may already exist. In that case, only the already-bounded verification / rollback / manual-intervention safety closure may continue.

W05 engineering certification itself performs no provider action and therefore can certify this distinction only through deterministic supplied/synthetic execution-phase fixtures.

## Preserve P9.6 semantics, add mutation-specific strictness

P9.6 precedence remains:

`kill > drain > pause > running`

Durable W05 control modes are:

- `running`;
- `paused`;
- `draining`;
- `drained`;
- `killed`.

Allowed review actions remain:

- `pause`;
- `drain`;
- `kill`;
- `resume`.

W05 must preserve these P9.6 transition constraints:

- kill may supersede any non-killed state;
- drain may supersede running or paused;
- pause must not downgrade draining/drained;
- incomplete drain must not ordinary-resume;
- killed must not ordinary-resume;
- resume never resets reservation/action/idempotency history.

Mutation work is stricter than generic read-worker work:

- `paused`: no new reservation claim and no new forward write;
- `draining`: no new reservation claim and no new forward write;
- `killed`: no new reservation claim and no new forward write;
- only `running` may permit a new W05 claim;
- even under `running`, unresolved manual intervention or uncertain side-effect state blocks new mutation.

P9.6 pure artifacts remain review/control semantics. W05 must not silently treat the existing P9.6 module as a durable authority store.

## Separate durable policy-mutation control namespace

Future W05 implementation must use a policy-specific persistence namespace.

It must not reuse:

- human `actions`;
- human `approvals`;
- Task #54 `deployments`;
- generic worker `jobs`;
- P9.6 supplied review artifacts as persistence;
- provider receipt tables as control authority.

Recommended initial durable entities are:

### 1. `policy_mutation_control_state`

One current row per site.

Minimum fields:

- site ID;
- control version;
- current mode;
- monotonic revision;
- current control fingerprint;
- effective-at database timestamp;
- updated-at database timestamp.

The table must be site-scoped and exact to the existing Diamond Shelf site identity for the initial class.

No migration may insert a default `running` row.

Missing durable control state is fail-closed:

`control_not_initialized`

A future W10 activation package must separately authorize any Production initialization/activation.

### 2. `policy_mutation_control_events`

Append-only transition history.

Minimum fields:

- deterministic event ID;
- event version;
- site ID;
- previous revision/fingerprint/mode;
- next revision/fingerprint/mode;
- transition action;
- database effective timestamp;
- event fingerprint.

No free-form provider payload, proposal text, credential material, secret, human approval body or Task #54 confirmation may be stored.

The current state row and event row must commit atomically.

### 3. `policy_mutation_claims`

One immutable W05 claim binding per W04 reservation.

Minimum fields:

- deterministic claim ID;
- claim version;
- claim fingerprint;
- W04 reservation ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- site ID;
- control revision/fingerprint accepted for the claim;
- Product GID;
- target URL;
- field;
- before fingerprint;
- after fingerprint;
- database claimed timestamp.

The claim row is a control/idempotency record only.

It must not claim:

- provider dispatch authorization;
- public-site write permission;
- Task #51 authorization;
- Task #54 execution;
- provider verification success.

## Why a separate immutable claim record is required

W04 already has a `claimed` reservation state, but W04 intentionally does not persist which durable mutation-control revision authorized a future claim.

W05 must preserve W04 schema and idempotency semantics rather than rewriting W04 identity.

A separate immutable claim record allows later W06/W07/W08 stages to prove:

- which exact W04 reservation was claimed;
- under which exact durable control revision;
- under which exact W03 authorization;
- that replay did not obtain a second forward claim;
- that control changed before or after the claim.

W05 must not alter W04 reservation identity/fingerprint construction.

## Durable control fingerprint

The durable control fingerprint must bind at minimum:

- control version;
- site ID;
- monotonic revision;
- previous control fingerprint or explicit genesis marker;
- resulting mode;
- transition action;
- database effective timestamp.

A material change must change the fingerprint.

The fingerprint must not bind free-form notes.

Recommended version:

`p8-8-w05-control-v1`

Recommended event version:

`p8-8-w05-control-event-v1`

## Claim identity

A pure W05 claim-intent projector should deterministically derive a claim fingerprint from:

- claim version;
- exact canonical W03/W04 durable pairing;
- W04 reservation ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- site ID;
- exact target Product GID/URL/field;
- before/after fingerprints;
- durable control version/revision/fingerprint.

Recommended version:

`p8-8-w05-control-claim-v1`

Recommended deterministic claim ID:

`p88w05-claim-<first-24-hex-of-claim-fingerprint>`

Exact replay under the same reservation and same accepted control revision must produce the same claim identity.

A changed reservation, authorization, target, before/after state or control revision must produce a different claim fingerprint and must not overwrite an existing claim.

## W03/W04 pairing is mandatory

Before any W05 claim or reservation-state transition, W05 must canonically revalidate the exact W03 + W04 pair.

Required equalities remain those certified by W04, including:

- reservation ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- site;
- Product GID;
- target URL;
- field;
- before/after fingerprints;
- authorization/expiry window.

A detached caller-supplied reservation ID or policy action ID is not enough.

W05 must not weaken `pairP88W03W04DurableReservation`.

## Database clock is authoritative

All durable W05 transition and claim timing must use PostgreSQL transaction time.

Caller wall-clock values must not determine:

- whether W03/W04 is still within its authorization window;
- claim timestamp;
- control transition effective timestamp;
- drain completion timestamp;
- release/terminal timestamp.

Tests may use supplied pure timestamps only for network-free projection fixtures.

## Atomic W05 claim transaction

A future W05 durable claim must be one transaction.

Required order:

1. verify expected engineering schema;
2. verify exact Diamond Shelf site identity;
3. lock the current site control row;
4. require current control mode exactly `running`;
5. fail closed if control state is missing or revision/fingerprint differs from the expected input;
6. lock the exact W04 reservation row;
7. revalidate exact W03/W04 pairing;
8. read `transaction_timestamp()`;
9. reject not-yet-issued or expired authorization;
10. reject any reservation state other than exact claimable `authorized`;
11. insert the deterministic immutable claim row;
12. update W04 reservation `authorized -> claimed` and set `claimed_at` to the same database timestamp;
13. return a bounded durable W05 claim receipt.

The control row must be locked before the reservation row in every W05 transaction that needs both. Control-transition operations must use the same lock ordering to avoid claim/control races.

## Claim result semantics

Success:

- `claimed_new` — one new immutable claim row plus one W04 `authorized -> claimed` transition.

Exact replay:

- `existing_claimed` — the existing W05 claim row and W04 claimed reservation match exactly.

Fail closed:

- `control_not_initialized`;
- `control_not_running`;
- `control_revision_conflict`;
- `authorization_expired`;
- `reservation_not_claimable`;
- `claim_identity_collision`;
- `claim_binding_conflict`;
- `manual_intervention_blocked`;
- `claim_state_uncertain`.

A status of `claimed` without the exact immutable W05 claim row is uncertain state, not success.

W05 must not add an automatic retry loop around an uncertain claim transaction.

## W04 lifecycle ownership after W05

W04 schema already supports:

- `authorized`;
- `claimed`;
- `consumed`;
- `released`;
- `expired`;
- `manual_intervention`.

W05 may own only the control-related transitions explicitly defined below.

### Claim

`authorized -> claimed`

Only through the atomic W05 claim transaction under durable `running` control.

### Safe pre-claim release

`authorized -> released`

Allowed when pause/drain/kill closes new forward work before a claim exists.

This is safe because W04 `authorized` has not obtained W05 mutation-control claim authority.

### Claim release

W05 must not generically release a `claimed` reservation merely because control changed.

A claimed reservation may later be released only when a separately certified later-stage artifact proves that provider dispatch could not have started.

The exact no-side-effect proof belongs to W06/W07 integration and is not invented by W05.

### Consumed

`claimed -> consumed` is outside W05.

It belongs to later successful W07 terminal execution/verification semantics.

### Manual intervention

A claimed reservation must enter/stay blocking manual-intervention handling when later certified execution evidence says a provider outcome is uncertain or safety closure cannot be proven.

W05 may define the transition contract, but W05 engineering itself must not fabricate provider uncertainty evidence.

### Expired

Only stale unclaimed `authorized` reservations may be expired.

`claimed` and `manual_intervention` must never auto-expire.

This preserves W04.

## Control transition semantics

Every durable transition must:

- lock the current site control row;
- verify expected current revision/fingerprint;
- use database time;
- insert one append-only control event;
- update the current state row atomically;
- inspect W04 active/blocking reservation state under the same site transaction;
- never modify human Task #51/#54 rows.

### Pause

Target mode:

`paused`

Effects:

- block new W05 claims;
- block new forward writes;
- safely release an unclaimed W04 `authorized` reservation;
- do not auto-release `claimed`;
- do not clear `manual_intervention`;
- later side-effected work may perform safety closure only.

Ordinary resume is permitted only if no claimed/manual-intervention blocker remains.

### Drain

Target mode:

- `drained` if no unresolved claimed/manual-intervention blocker exists after safe release of any unclaimed authorized reservation;
- otherwise `draining`.

Effects:

- block new W05 claims;
- block new forward writes;
- safely release unclaimed authorized reservation;
- never synthesize replacement work;
- claimed work cannot be treated as side-effect-free without later certified proof;
- manual-intervention blocks drain completion.

A future explicit reconciliation may advance `draining -> drained` only when zero claimed/manual-intervention blocker remains.

### Kill

Target mode:

`killed`

Effects:

- block all new W05 claims;
- block all new forward writes;
- safely release unclaimed authorized reservation;
- preserve claimed/manual-intervention as blocking until separately reconciled;
- require recovery review for any nonterminal claimed action;
- never ordinary-resume.

Kill does not retroactively roll back a previously terminal verified historical action.

### Resume

Ordinary resume may produce `running` only from:

- `paused`; or
- `drained`; or
- `draining` when the same transaction proves zero claimed/manual-intervention blockers.

Resume fails closed when:

- current mode is `killed`;
- control revision/fingerprint is stale;
- any claimed reservation remains unresolved;
- any manual-intervention reservation remains unresolved;
- control state is missing.

Resume never creates a new W04 reservation or W05 claim.

## Kill latch

`killed` is a durable latch.

W05 does not define ordinary kill recovery.

Clearing the kill latch requires a separately reviewed recovery workflow after all claimed/uncertain work is reconciled.

Generic `continue`, policy evaluation, scheduler restart or worker restart must never clear it.

## Mutation-specific execution-phase projection

W05 should define a pure, non-persisting control-decision projection for future W06/W07 integration.

The supplied execution phase must be one of:

- `pre_dispatch_proven`;
- `side_effect_possible`;
- `safety_closure_in_progress`;
- `terminal_verified`;
- `manual_intervention_required`.

This projection is not allowed to infer provider state.

Expected behavior:

### running

- may allow W05 claim for exact eligible W03/W04 pair;
- W05 still keeps provider dispatch false;
- W06 must independently preflight.

### paused / draining / killed

For `pre_dispatch_proven`:

- no new forward dispatch;
- controlled pre-dispatch release may be eligible only when backed by later certified proof.

For `side_effect_possible` or `safety_closure_in_progress`:

- new forward mutation remains blocked;
- required independent verification / bounded rollback / manual-intervention closure may continue.

For terminal verified work:

- no new action is implied;
- control state does not retroactively undo history.

The pure projection must keep these markers false throughout W05:

- `providerDispatchAuthorized=false`;
- `providerWriteAllowed=false`;
- `publicSiteWrites=false`;
- `task51Authorized=false`;
- `task54ExecutionAuthorized=false`;
- `automaticTransition=false`.

## Human Task #51/#54 path is immutable

W05 must not change the semantics of:

- Task #51 human approval validation;
- `controlled_execution_foundation_v1`;
- human `actions` rows;
- Task #54 preflight;
- Task #54 exact confirmation `APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`;
- human Task #54 deployments/verifications/rollback behavior.

Policy control/claim provenance must never be written as human provenance.

W05 must not:

- fabricate an approvals row;
- fabricate a human actor;
- insert a human action row;
- generate a Task #54 confirmation;
- call the Task #54 apply function;
- set Task #51 `executionAuthorized=true` for a policy action.

The future W06/W07 policy path remains a distinct namespace.

## Schema boundary

A future W05 engineering migration should be additive and depend on the W04 engineering schema.

Recommended migration filename:

`0006_p8_8_policy_mutation_controls.sql`

It may create the dedicated W05 control-state, control-event and claim tables described above.

It must not:

- insert Production control rows;
- insert Production claim rows;
- alter human action/approval/deployment tables;
- broaden W04 provider/domain/resource/action/field/scope constraints;
- weaken W04 unique indexes;
- create triggers that dispatch work;
- create scheduled database jobs;
- add credentials or secrets.

W05 engineering migration tests must start from the exact W04 38-table ephemeral baseline and prove only the expected additive objects.

The runtime schema recognizer may learn the future W05 engineering table count/state, but it must not auto-apply migration 0006.

## Database isolation

Future W05 engineering persistence tests must use a dedicated explicit localhost URL only.

Recommended variable:

`P8_8_W05_EPHEMERAL_DATABASE_URL`

Forbidden:

- fallback to `DATABASE_URL`;
- Production database URL;
- Replit Development database mutation;
- Replit Production database mutation.

The store constructor must require an explicit database URL.

## Concurrency requirements

Real PostgreSQL tests must cover at minimum:

1. simultaneous exact duplicate claim attempts -> one claim row plus exact replay;
2. claim racing pause -> either the claim is durably ordered before pause or pause wins and claim is rejected; never a claim under a paused revision;
3. claim racing drain -> same ordering guarantee;
4. claim racing kill -> same ordering guarantee;
5. simultaneous pause/drain/kill transitions -> serialized monotonic revisions with P9.6 precedence preserved;
6. stale control revision cannot claim;
7. control transition safely releases only unclaimed authorized reservation;
8. control transition never auto-releases claimed/manual-intervention reservation;
9. drain reaches `drained` only with zero claimed/manual-intervention blocker;
10. killed ordinary resume fails;
11. pause/drained resume with unresolved blocker fails;
12. expired authorized reservation cannot be claimed;
13. exact replay never creates a second W04 claim transition;
14. status=`claimed` without matching W05 claim row fails closed as uncertain;
15. transaction failure cannot produce two durable claims or a false success.

No test may call a provider or public site.

## Static capability restrictions

W05 implementation modules should have static/runtime tests proving no direct use of:

- `fetch` or HTTP clients;
- Shopify provider mutation functions;
- Task #51 execution-store mutation;
- Task #53/#54 orchestrators;
- timers or scheduler registration;
- worker startup hooks;
- generic process `DATABASE_URL`;
- environment-controlled public-write activation.

## W05 engineering packages

A future explicit implementation authorization may cover these bounded packages.

### W05-E1 — pure control + claim contracts

- deterministic control transition/fingerprint contracts;
- deterministic claim intent/fingerprint;
- exact W03/W04 pairing checks;
- mutation-specific forward-vs-safety-closure projection;
- no DB imports.

### W05-E2 — additive engineering migration

- create dedicated W05 control-state/event/claim tables;
- dedicated localhost-only migration test;
- runtime schema recognizer knows the engineering state;
- no Production DDL/DML.

### W05-E3 — durable control store

- explicit-URL PostgreSQL store;
- database-clock transitions;
- revision/fingerprint optimistic conflict checks;
- append-only event + current-state atomicity;
- pause/drain/kill/resume semantics;
- no provider/runtime binding.

### W05-E4 — atomic W04 reservation claim bridge

- current control row lock first;
- exact W03/W04 pairing;
- immutable claim insert;
- W04 `authorized -> claimed`;
- exact replay/collision/uncertain classification;
- safe unclaimed release on pause/drain/kill;
- no claimed release without future certified no-dispatch proof.

### W05-E5 — real PostgreSQL concurrency certification

- race matrix above;
- deterministic row/state outcomes;
- zero provider calls;
- zero human Task #51/#54 row mutation.

A later implementation authorization may approve E1–E5 together, but Production DDL/runtime/provider boundaries remain separate.

## Production DDL boundary

Even after W05 engineering migration/schema tests are certified, Production must remain unchanged.

Production W05 DDL requires separate explicit authorization that names:

- final canonical GitHub SHA/tree;
- migration 0005 checksum and applied/not-applied prerequisite state;
- migration 0006 checksum;
- exact expected before/after schema fingerprint/table count;
- exact target database.

If Production still lacks migration 0005, W05 DDL must not skip directly to 0006.

Production DDL authorization must not imply:

- W04 reservation insertion;
- W05 control-row initialization;
- W05 claim creation;
- policy activation;
- scheduler/worker activation;
- provider execution;
- deployment/publication.

## Runtime integration boundary

Creating W05 tables is not runtime activation.

A future runtime integration must separately prove:

- exact W03/W04 pairing;
- durable control state initialized under explicit authority;
- missing control fails closed;
- default provider dispatch remains false;
- no route/startup/scheduler/worker automatically claims a reservation;
- W06 preflight remains separately authorized/implemented;
- W07 apply remains separately authorized/implemented.

## Engineering certification matrix

Future W05 implementation certification must prove at minimum:

- W01–W04 fingerprints/identities are unchanged;
- policy control provenance cannot impersonate human approval;
- human Task #51/#54 code path remains behaviorally unchanged;
- missing control blocks claim;
- only running control permits a new claim;
- pause/drain/kill block new claims;
- exact claim replay is one durable claim;
- control/claim races are serializable and deterministic;
- expired reservation cannot claim;
- claimed/manual-intervention never auto-expire or auto-release;
- drain completion requires no unresolved blocker;
- kill is latched;
- safety closure remains distinguishable from new forward mutation;
- all W05 provider-write markers remain false;
- implementation defaults off;
- no generic `continue` can activate W05 in Production.

## Explicit non-authorization

This specification authorizes no:

- W05 implementation;
- migration-file creation or application;
- Production DB read/write/DDL/DML;
- Production control state;
- Production claim/reservation transition;
- provider/network request;
- Shopify/public-site mutation;
- Task #51/#53/#54 execution;
- human approval/action/deployment mutation;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config change;
- `PUBLIC_SITE_WRITES_ENABLED` change;
- deployment;
- publication;
- W06–W10.

## Next explicit authorization boundary

After this specification is merged and certified, the next safe step is a separate explicit W05 engineering authorization.

A suitable authorization should be bounded to W05-E1 through W05-E5 and must continue to exclude:

- Production migration 0005/0006;
- Production DML/control initialization;
- provider/network access;
- Task #51/#53/#54 execution;
- policy/scheduler/worker/autonomous activation;
- credentials/scopes/config changes;
- deployment/publication;
- W06–W10.

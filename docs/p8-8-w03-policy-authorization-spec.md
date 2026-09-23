# P8.8 W03 — provenance-distinct policy authorization artifact specification

**Issue:** #414  
**Status:** SPECIFICATION / REVIEW ONLY — W03 IMPLEMENTATION BLOCKED

## Purpose

W03 defines the pure deterministic authorization artifact that sits between:

- a canonically verified W01 policy admission;
- a canonically verified W02 governed proposal materialization;
- a caller-supplied reservation descriptor that will later be produced durably by W04;

and later policy-aware preflight/execution work.

W03 must never masquerade as human approval and must never be accepted by the current human Task #51 / Task #54 execution namespace.

## Core provenance rule

The W03 artifact must identify itself exactly as:

`authorizationProvenance = "policy_authorization"`

It must never:

- create or imply a human approval;
- fabricate an `approvals` row;
- carry a human approval decision;
- carry a human approval ID;
- reuse a human approval actor as authority;
- emit the Task #51 `controlled_execution_foundation_v1` envelope shape;
- emit or validate `APPLY_AND_VERIFY_TASK54:...`;
- emit or validate `RENEW_EXECUTABLE_ACTION_AUTHORIZATION:...`;
- claim compatibility with the human Task #54 apply route.

Human and policy authorization must remain queryably and structurally distinct.

## Required canonical inputs

Future W03 implementation should accept enough pure inputs to rebuild, rather than merely trust, both prior work products.

### A. W01 evaluation input + supplied evaluation

The implementation must rerun `evaluateP88PolicyAdmission` from the supplied W01 evaluation input and require exact canonical equality with the supplied W01 evaluation.

Required result:

- W01 version exact;
- policy class exact;
- decision exactly `admit`;
- zero rejection reasons;
- policy grant integrity valid;
- evaluation fingerprint exact;
- evaluation ID exact;
- evaluation not expired at W03 `issuedAt`;
- policy grant active, unexpired and unrevoked at W03 `issuedAt`.

A W01 `reject` result can never be converted into W03 authorization.

### B. W02 materialization input + supplied materialization

The implementation must rerun `materializeP88W02GovernedProposal` from the supplied W02 input and require exact canonical equality with the supplied W02 materialization.

Required result:

- W02 version exact;
- mutation class exact;
- lifecycle exactly `materialized_unpersisted`;
- proposal fingerprint exact;
- materialization fingerprint exact;
- materialization idempotency fingerprint exact;
- target-binding integrity valid;
- byte-exact before/after values and state fingerprints preserved.

W03 must not persist or upgrade the W02 artifact.

## W01 ↔ W02 cross-lineage equality

W03 must fail closed unless W01 and W02 agree exactly on every shared execution-relevant identity.

Required equality includes at minimum:

- policy class;
- recommendation fingerprint;
- recommendation idempotency key;
- proposal fingerprint;
- provider;
- domain;
- resource kind;
- Product GID;
- target URL;
- action type;
- field;
- required provider scope;
- before fingerprint;
- after fingerprint.

W03 must bind, without fabricating or merging semantics:

- W01 evidence IDs + evidence-set fingerprint;
- W02 evidence fingerprints + missing-evidence lineage;
- W01 quality fingerprint;
- W01 risk fingerprint;
- W01 current-state fingerprint;
- W01 mutation-control fingerprint.

If shared identities disagree, authorization fails closed.

## Reservation descriptor boundary

The certified P8.8 architecture requires final policy authorization to bind a reservation identity, while W04 is the later work package that owns durable reservation/idempotency persistence.

Therefore W03 must not create a reservation.

W03 may only accept and integrity-bind an opaque caller-supplied reservation descriptor:

- `reservationId`;
- `reservationFingerprint`;
- `reservationState`;
- `reservationVersion`;
- `reservationDurable`;
- `reservationSource`.

For W03 implementation certification before W04 exists:

- only synthetic/test descriptors may be used;
- `reservationDurable=false`;
- such artifacts are explicitly non-dispatchable.

After W04 exists, policy-aware integration may require:

- a separately defined W04 reservation version;
- `reservationDurable=true`;
- exact W04 integrity validation.

W03 itself never writes or persists the reservation.

## Policy action identity

W03 must bind an action identity without pretending a database `actions` row exists.

The artifact should derive a deterministic `policyActionId` from:

- W03 version;
- policy fingerprint;
- W01 evaluation fingerprint;
- W02 proposal fingerprint;
- Product GID;
- field;
- before fingerprint;
- after fingerprint;
- reservation fingerprint.

This is a policy-artifact identity only.

It must also expose:

- `persistedActionId = null`;
- `persistedActionCreated = false`.

A later work package may bind this identity to durable execution state under separate authorization. W03 must not invent a DB UUID or claim an action row exists.

## Issued / expiry semantics

W03 must be deterministic and must not read wall-clock time internally.

Caller supplies canonical `issuedAt`.

Caller may request a bounded TTL, but initial W03 maximum must be no more than 15 minutes.

The resulting `expiresAt` must be the earliest of:

- `issuedAt + requested TTL`;
- W01 evaluation expiry;
- policy grant expiry.

W03 must reject if:

- `issuedAt` is before the W01 evaluation reference time;
- W01 evaluation is already expired at `issuedAt`;
- policy grant is not active at `issuedAt`;
- computed expiry is not after `issuedAt`.

No automatic renewal is part of W03.

## Policy authorization artifact

Future output should use a distinct version such as:

`p8-8-w03-policy-authorization-v1`

Minimum output:

- version;
- `authorizationProvenance="policy_authorization"`;
- deterministic `policyAuthorizationId`;
- deterministic `policyAuthorizationFingerprint`;
- deterministic `policyActionId`;
- `persistedActionId=null`;
- `persistedActionCreated=false`;
- policy ID/version/fingerprint/stage;
- W01 evaluation ID/fingerprint;
- W02 materialization ID/fingerprint;
- proposal ID/fingerprint;
- recommendation fingerprint/idempotency key;
- Product GID/URL/action/field/scope;
- exact before/after fingerprints;
- evidence-set fingerprint;
- quality fingerprint;
- risk fingerprint;
- current-state fingerprint;
- mutation-control fingerprint;
- reservation descriptor/fingerprint;
- issuedAt;
- expiresAt;
- authorization semantics;
- safety/capability markers.

## Authorization semantics

The artifact may represent that policy conditions authorize progression to later policy-aware preflight, but it must not itself authorize provider dispatch.

Recommended explicit fields:

- `policyAuthorizationGranted=true`;
- `policyAwarePreflightEligible=true`;
- `providerWriteAllowed=false`;
- `providerDispatchAuthorized=false`;
- `publicSiteWrites=false`;
- `automaticTransition=false`;
- `task51Compatible=false`;
- `task54HumanConfirmationCompatible=false`;
- `approvalRequired=false` for the policy path;
- `humanApprovalPresent=false`.

This distinction is critical:

- W01 `admit` = policy admission only;
- W03 artifact = policy authorization to proceed to later policy-aware control stages;
- W06/W07 = later preflight/apply layers that still must independently validate exact state and dispatch authority.

W03 never produces final provider-write permission.

## Human-authorization incompatibility

W03 must be structurally incompatible with `AuthorizationEnvelope` from `execution-foundation.ts`.

It must not use:

- `version="controlled_execution_foundation_v1"`;
- Task #51 plan/page authorization identity as its primary authority;
- `authorization.executionAuthorized=true` in the human envelope shape;
- human approval decision/time;
- Task #54 human confirmation strings.

W03 should expose explicit markers:

- `humanTask51EnvelopeCompatible=false`;
- `humanTask54ApplyCompatible=false`;
- `humanApprovalRowRequired=false`;
- `humanApprovalRowCreated=false`.

A future policy-aware route must accept W03 only through a distinct policy namespace.

## Fingerprint contract

The W03 authorization fingerprint must bind at minimum:

- W03 version;
- provenance;
- policy action ID;
- policy ID/version/fingerprint;
- W01 evaluation fingerprint;
- W02 materialization/proposal fingerprints;
- recommendation fingerprint/idempotency key;
- exact target identity;
- before/after fingerprints;
- evidence-set fingerprint;
- quality/risk/current-state/control fingerprints;
- reservation fingerprint;
- issuedAt/expiresAt;
- all authorization/safety markers that influence interpretation.

Material changes must produce a new authorization fingerprint.

## Idempotency and replay semantics

Exact canonical replay with identical inputs must return identical:

- policyActionId;
- policyAuthorizationId;
- policyAuthorizationFingerprint.

Conflicting reuse of the same W01 evaluation + W02 proposal lineage with a different:

- target;
- before/after state;
- reservation;
- policy fingerprint;
- issued/expiry window;

must fail closed under a pure replay-compatibility assertion.

This is artifact-level replay safety only. W04 remains the authority for durable reservation/idempotency.

## Rejection matrix

Future W03 implementation must reject at least:

- W01 evaluation cannot be canonically rebuilt;
- W01 decision not `admit`;
- W01 rejection reasons non-empty;
- grant fingerprint/integrity failure;
- grant inactive/expired/revoked;
- W01 evaluation expired;
- W02 materialization cannot be canonically rebuilt;
- W02 lifecycle not `materialized_unpersisted`;
- W01/W02 proposal fingerprint mismatch;
- recommendation identity mismatch;
- provider/domain/resource/GID/URL/action/field/scope mismatch;
- before/after fingerprint mismatch;
- unsupported initial policy class;
- missing/invalid reservation descriptor;
- invalid reservation fingerprint;
- noncanonical issued time;
- issued time before evaluation reference;
- nonpositive/over-limit TTL;
- computed expiry not after issued time;
- any supplied human approval ID/decision/actor field;
- any request to emit Task #51/Task #54 compatibility;
- conflicting replay identity.

## Pure capability markers

W03 implementation must certify:

- deterministic artifact creation only;
- W01 evaluation rebuilt and verified;
- W02 materialization rebuilt and verified;
- policy provenance explicit;
- human approval absent;
- reservation caller-supplied only;
- database read performed = false;
- database write performed = false;
- persistence performed = false;
- schema mutation performed = false;
- provider/network read performed = false;
- provider write performed = false;
- public-site write performed = false;
- approvals row created = false;
- persisted action created = false;
- durable reservation created = false;
- Task #51 execution performed = false;
- Task #53 execution performed = false;
- Task #54 execution performed = false;
- Task #54 human confirmation generated = false;
- policy activation performed = false;
- scheduler activated = false;
- worker activated = false;
- provider dispatch authorized = false;
- autonomous live execution authorized = false;
- credential/scope/config change = false;
- deployment/publication = false.

## Source-level implementation boundary

Future W03 source should be a pure library under `artifacts/api-server/src/lib/`.

It may import:

- W01 pure grant/evaluation code;
- W02 pure materialization code;
- Node crypto for hashing.

It must not import:

- PostgreSQL/Drizzle/database modules;
- Express/router/server modules;
- provider SDK/HTTP/fetch transport;
- Task #51 renewal/execution-foundation mutation paths as runtime dependencies;
- Task #53 resolver;
- Task #54 apply/preflight runtime;
- scheduler/worker dispatch;
- secrets/config mutation.

Human Task #51 types may be referenced in tests or documentation for incompatibility assertions, but W03 must not invoke that path.

## Required regression coverage

Future W03 tests must prove at minimum:

1. one valid W01 admit + W02 materialization + synthetic reservation descriptor produces deterministic policy authorization;
2. exact replay is stable;
3. W01 reject cannot authorize;
4. W01 tamper fails canonical rebuild;
5. W02 tamper fails canonical rebuild;
6. W01/W02 proposal mismatch fails;
7. target mismatch fails;
8. before/after mismatch fails;
9. inactive/expired/revoked policy fails;
10. expired W01 evaluation fails;
11. TTL over 15 minutes fails;
12. expiry is clamped to evaluation/grant expiry;
13. missing/tampered reservation descriptor fails;
14. conflicting replay fails;
15. no human approval fields exist;
16. W03 artifact cannot satisfy Task #51 AuthorizationEnvelope shape;
17. no Task #54 human confirmation is generated;
18. no provider-write/dispatch/public-write authority is present;
19. no DB/network/route/worker/runtime binding exists.

## W03 output is still not dispatchable

Even after future W03 implementation:

- no persisted ProposalRecord exists;
- no persisted action row exists;
- no durable W04 reservation exists yet;
- no provider live re-read has occurred;
- no policy-aware preflight exists yet;
- no provider mutation is permitted.

W04 remains responsible for durable reservation/idempotency design.

W05 remains responsible for durable mutation-control integration.

W06 remains responsible for policy-aware preflight.

W07 remains responsible for policy-aware single-action apply.

## Non-authorization

This specification authorizes no:

- W03 implementation;
- policy authorization creation in Production;
- approvals-row mutation;
- action-row creation;
- reservation creation/persistence;
- DB/schema/DDL/DML;
- provider/network request;
- Shopify/public-site mutation;
- Task #51/#53/#54 execution;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config change;
- deployment;
- publication;
- W04–W10.

## Next explicit authorization boundary

After this W03 specification is merged and certified, the next safe engineering action would be separate explicit authorization to implement the pure W03 artifact builder and fail-closed tests only.

That implementation must remain network-free, persistence-free, route-free, default-off, and non-dispatchable.

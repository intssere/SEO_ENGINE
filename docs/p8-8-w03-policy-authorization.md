# P8.8 W03 — pure provenance-distinct policy authorization artifact

**Issue:** #416  
**PR:** #417  
**Status on merge:** W03 engineering complete; W04–W10 remain separately gated.

## Scope

W03 implements only the pure deterministic policy-authorization artifact defined by the certified W03 specification.

Implementation:

- `artifacts/api-server/src/lib/p8-8-policy-authorization.ts`
- `artifacts/api-server/src/lib/p8-8-policy-authorization.test.ts`

There is no route, startup hook, database adapter, provider client, persistence binding, scheduler, worker, Task #51/#53/#54 invocation, deployment hook, or publication behavior.

## Canonical W01 and W02 verification

W03 does not trust detached upstream artifacts.

Before authorization it:

1. validates the W01 grant integrity;
2. re-runs `evaluateP88PolicyAdmission` from the supplied W01 evaluation input;
3. requires exact canonical equality with the supplied W01 evaluation;
4. requires exact W01 version/class, `decision="admit"`, and zero rejection reasons;
5. validates the W02 target binding;
6. re-runs `materializeP88W02GovernedProposal` from the supplied W02 materialization input;
7. requires exact canonical equality with the supplied W02 materialization;
8. requires W02 lifecycle exactly `materialized_unpersisted`.

Tampered or detached W01/W02 artifacts therefore fail closed before policy authorization.

## W01 ↔ W02 cross-lineage equality

W03 requires exact equality for all shared execution-relevant identities:

- initial policy/mutation class;
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

Any mismatch fails closed with an explicit cross-lineage reason.

W03 binds but does not fabricate:

- W01 evidence IDs and evidence-set fingerprint;
- W02 upstream evidence fingerprints and missing-evidence lineage;
- W01 quality fingerprint;
- W01 risk fingerprint;
- W01 current-state fingerprint;
- W01 mutation-control fingerprint.

## Provenance

The artifact identifies itself exactly as:

`authorizationProvenance = "policy_authorization"`

It carries no:

- human approval ID;
- human approval decision;
- human approval actor;
- approved timestamp;
- Task #51 envelope;
- Task #54 confirmation.

The builder rejects those human-path fields even when supplied through untyped JavaScript input.

## Human-path incompatibility

W03 is intentionally incompatible with the current human execution contract.

It does not use:

`controlled_execution_foundation_v1`

It does not expose:

- `planId`;
- `envelopeFingerprint`;
- human `authorization.executionAuthorized=true`;
- Task #54 human confirmation strings.

Explicit markers remain false:

- `task51Compatible`;
- `task54HumanConfirmationCompatible`;
- `humanTask51EnvelopeCompatible`;
- `humanTask54ApplyCompatible`;
- `humanApprovalRowRequired`;
- `humanApprovalRowCreated`.

No human approval row is created or implied.

## Reservation descriptor boundary

W03 does not create a reservation.

Before W04 exists, the implementation accepts only an explicit synthetic/non-durable descriptor:

- state = `reserved_prewrite`;
- version = `p8-8-w03-synthetic-reservation-v1`;
- durable = `false`;
- source = `synthetic_test`.

The descriptor binds:

- reservation ID;
- caller-supplied opaque reservation fingerprint;
- state;
- version;
- durability;
- source;

into a deterministic descriptor fingerprint.

The descriptor is deep-frozen and integrity-checked before authorization.

Attempting to mark a W03 reservation durable fails closed because W04 remains the future durable-reservation authority.

## Policy action identity

W03 derives a deterministic in-memory `policyActionId` from:

- W03 version;
- policy fingerprint;
- W01 evaluation fingerprint;
- W02 proposal fingerprint;
- Product GID;
- field;
- before fingerprint;
- after fingerprint;
- reservation fingerprint;
- reservation descriptor fingerprint.

This is an artifact identity only.

The output explicitly retains:

- `persistedActionId = null`;
- `persistedActionCreated = false`.

No action row is claimed or created.

## Issued and expiry semantics

W03 never reads wall-clock time.

Caller supplies canonical `issuedAt`.

TTL must be an integer from 1 to 15 minutes inclusive.

The resulting expiry is the earliest of:

- requested issuedAt + TTL;
- W01 evaluation expiry;
- W01 policy-grant expiry.

W03 fails closed when:

- issued time precedes the W01 evaluation reference;
- W01 evaluation is already expired;
- policy grant is not active;
- policy grant is expired;
- policy grant is revoked;
- TTL is outside the bounded range;
- computed expiry is not after issuance.

No renewal behavior exists in W03.

## Authorization semantics

A successful W03 artifact means only that the exact policy admission/materialization lineage is authorized to proceed to later policy-aware control stages.

It exposes:

- `policyAuthorizationGranted=true`;
- `policyAwarePreflightEligible=true`.

It explicitly keeps:

- `providerWriteAllowed=false`;
- `providerDispatchAuthorized=false`;
- `publicSiteWrites=false`;
- `automaticTransition=false`;
- `dispatchEligible=false`.

W03 does not produce final provider-write permission.

## Deterministic fingerprints

W03 produces deterministic:

- reservation descriptor fingerprint;
- policy action ID;
- policy authorization fingerprint;
- policy authorization ID.

The authorization fingerprint binds:

- W03 version/provenance;
- policy action ID;
- policy identity/fingerprint/stage;
- W01 evaluation identity/fingerprint/window;
- W02 materialization/proposal identities;
- recommendation fingerprint/idempotency key;
- exact target identity;
- before/after fingerprints;
- evidence-set and upstream-evidence lineage;
- quality/risk/current-state/control fingerprints;
- reservation descriptor;
- issued/expires timestamps;
- interpretation/safety markers.

Exact replay returns identical identities.

`assertP88W03ReplayCompatible` rejects conflicting reuse of the same W01 evaluation + W02 proposal lineage when authorization identity changes, including reservation or issuance-window changes.

This is pure artifact-level replay safety only. W04 remains the durable idempotency authority.

## Capability boundary

W03 capability markers explicitly certify zero:

- database read/write;
- persistence;
- schema mutation;
- provider/network read;
- provider write;
- public-site write;
- approvals-row creation;
- persisted action creation;
- durable reservation creation;
- Task #51/#53/#54 execution;
- Task #54 human confirmation generation;
- policy activation;
- scheduler/worker activation;
- provider dispatch authority;
- autonomous live execution authority;
- credential/scope/config change;
- deployment;
- publication.

## Regression coverage

The W03 test matrix verifies:

- deterministic valid W03 authorization;
- exact replay stability;
- reservation descriptor integrity;
- durable reservation rejection before W04;
- W01 reject cannot authorize;
- tampered W01 evaluation rejection;
- tampered W02 materialization rejection;
- proposal cross-lineage mismatch rejection;
- target mismatch rejection;
- after-state mismatch rejection;
- expired W01 evaluation rejection;
- TTL upper/lower bound rejection;
- expiry clamping to W01 evaluation;
- human approval field rejection;
- Task #54 confirmation-field rejection;
- structural incompatibility with human Task #51/#54 authorization;
- conflicting replay rejection;
- source-level no-DB/no-network/no-route/no-Task-runtime/no-worker-dispatch/no-environment binding.

The code-only implementation head `8278efbcc81bac309489ccd265f7e8faa02c3140` passed canonical CI #728 completely before closeout documentation was added.

The final PR head after closeout documentation must still pass exact-head CI before merge.

## Next boundary

W03 does not authorize W04.

The next P8.8 work package is:

**W04 — durable reservation/idempotency design**

W04 requires separate explicit authorization and introduces a new persistence/schema boundary. W03 grants no authority for:

- reservation persistence;
- action persistence;
- Production DB schema/DDL/DML;
- provider/network access;
- Task #51/#53/#54 execution;
- scheduler/worker/autonomous execution;
- policy activation;
- credential/scope/config changes;
- deployment/publication;
- W04–W10.

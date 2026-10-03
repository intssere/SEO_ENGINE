# UGP-8.2E — Internal-link verification and rollback contract

## Status
IMPLEMENTATION CANDIDATE — VERIFICATION/ROLLBACK PLANNING ONLY / NO LIVE EXECUTION

## Purpose
UGP-8.2E closes the internal-link lifecycle contract around a later authorized mutation.

It binds the merged UGP-8.2C connector-neutral mutation preview and UGP-8.2D provider patch mapping to:
- the exact expected post-change state;
- the exact pre-change restore state;
- `verify.change`;
- `rollback.change`;
- mutation-receipt lineage.

It does not execute a mutation or rollback.

## Pre-execution plan
The plan requires:
- exact UGP-8.2C preview-entry fingerprint;
- exact UGP-8.2D provider-patch fingerprint;
- matching provider/connector lineage;
- `verify.change` for the source resource kind;
- `rollback.change` for the source resource kind.

The plan records:
- target locator fingerprint;
- mutation-intent fingerprint;
- descriptor fingerprint;
- expected applied-state fingerprint = UGP-8.2C proposed state;
- restore-state fingerprint = UGP-8.2C observed source state;
- proposed-content fingerprint = UGP-8.2D exact proposed body.

This makes rollback lineage explicit before execution is ever authorized.

## Receipt-bound verification
Verification cannot be built until a mutation receipt exists.

When a later authorized executor returns a `UniversalMutationReceipt`, UGP-8.2E validates that the receipt matches:
- descriptor;
- target;
- mutation intent;
- exact 8.2E plan.

Only then does it construct the existing universal `verify_mutation` request with the exact expected applied-state fingerprint.

No network call is performed by this contract.

## Receipt-bound rollback intent
Rollback also requires the exact original mutation receipt.

UGP-8.2E may construct a `UniversalRollbackIntent` bound to:
- the original mutation receipt;
- the exact source resource;
- the exact pre-change source-state fingerprint.

It deliberately does **not** construct a `UniversalRollbackMutationRequest`, because that request requires its own explicit `UniversalAuthorizationReference`.

Therefore:
- rollback lineage may exist;
- rollback authority does not.

## Safety boundary
UGP-8.2E:
- constructs no `UniversalExecuteMutationRequest`;
- constructs no `UniversalRollbackMutationRequest`;
- creates no authorization reference;
- performs no provider/Git/network call;
- persists nothing;
- uses no credentials;
- performs no provider/public-site write;
- changes no DB/schema, Railway, deployment, scheduler, worker, or autonomy state.

## Verification outcomes
The existing universal connector contract remains authoritative for verification results:
- `verified` requires the observed state to exactly match the expected state;
- `mismatch` requires a different observed state;
- `unavailable` carries no observed state.

UGP-8.2E does not weaken those semantics.

## Internal-link engine status after this increment
UGP-8.2 then contains:
- 8.2A recommendation contract;
- 8.2B evidence integration;
- 8.2C connector-neutral preview;
- 8.2D provider patch mapping/certification;
- 8.2E verification and rollback lineage contract.

A separate future live-certification milestone would still be required before any real provider write can be claimed as supported.

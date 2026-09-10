# Task #29 — Guarded Autonomy Pilot v1

## Purpose

Prepare SEO ENGINE for a small, tightly bounded Diamond Shelf autonomy pilot after the first controlled production optimization has been verified and Task #28 measurement evidence is available.

This task defines **admission, batch-cap, authorization, and automatic halt policy**. It does not itself execute a Shopify mutation.

## Scope lock

- Pilot site: `diamondshelf.us` only.
- Maximum admitted batch: **25 actions**.
- Default initial batch: **10 actions**.
- Eligible action types are restricted to the Shopify connector's current low-risk reversible write surface:
  - `metadata.title`
  - `metadata.description`
  - `image.alt`
- Every candidate must already be classified `auto` by the Safety Engine.
- Confidence must be at least `0.80`.
- Before-state and expected verification state must already be captured.
- Every candidate must be explicitly reversible.

## Runtime prerequisites

A guarded pilot is blocked unless all of the following are true:

1. The real Diamond Shelf baseline is certified.
2. The first Task #27 controlled optimization is successfully verified.
3. Task #28 measurement evidence is ready.
4. The requested batch size is between 1 and 25.
5. At least one candidate passes all admission gates.

## Automatic halt conditions

The pilot enters `halted` state and admits no actions when any of these are true:

- Algorithm Update Mode is active.
- Any unresolved regression exists.
- Any previous production action is still awaiting verification.

After a batch is executed by a separately authorized runtime, any verification result of `failed`, `regressed`, or `pending` requires the autonomy loop to halt before another batch.

## Authorization boundary

`planGuardedAutonomyPilot()` always returns `executionAuthorized: false`.

A separate execution authorization gate requires:

- the plan is in `ready` state;
- `PUBLIC_SITE_WRITES_ENABLED=true` in the runtime;
- exact `diamondshelf.us` site identity;
- explicit actor identity;
- explicit authorization reference;
- the authorization action IDs exactly match the admitted batch.

The function validates an authorization envelope only. It does not call Shopify or execute an action.

## Safety semantics

`auto` means **eligible for guarded low-risk execution**, not blanket permission to mutate a live site.

Task #29 does not authorize:

- URL changes;
- redirects;
- page deletion;
- navigation/architecture changes;
- major content rewrites;
- unsupported Shopify mutations;
- execution during unresolved verification/regression states;
- execution based on weak policy tiers.

## Pilot progression

The intended live progression remains conservative:

1. Start with 10 or fewer eligible low-risk actions.
2. Execute only through the existing write connector and exact authorization gates.
3. Verify every action.
4. Halt immediately on failure/regression/pending verification.
5. Resume only after the blocking condition is resolved and a new bounded batch is admitted.
6. Increase toward 25 only after stable evidence, never by default.

## Certification note

Merging this task does **not** mean Guarded Autonomy is active in production. Real activation still requires secure runtime credentials, real baseline/measurement evidence, explicit production authorization, and the global write switch to be intentionally enabled for the exact pilot window.

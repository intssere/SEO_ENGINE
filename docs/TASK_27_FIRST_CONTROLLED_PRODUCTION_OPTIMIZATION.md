# Task #27 — First Controlled Production Optimization v1

## Purpose
Prepare the first genuinely write-capable Diamond Shelf optimization path while keeping execution fail-closed until a separate, explicit production authorization identifies the exact site and exact action.

## Scope
Task #27 is restricted to one low-risk reversible action on `diamondshelf.us`:

- `metadata.title`
- `metadata.description`
- `image.alt`

No batch execution, URL changes, redirects, deletion, navigation changes, architecture changes, or major content rewrites are eligible.

## Required preconditions
Before an execution permit can exist, the request must contain:

1. Diamond Shelf site identity.
2. Opportunity, action-plan, and action IDs.
3. One allowlisted action type.
4. Exact target identity.
5. Captured before-state.
6. Proposed change.
7. Expected verification state.
8. Explicit production authorization matching the site, action ID, and action type.
9. An identified approver and authorization reference.
10. Global `PUBLIC_SITE_WRITES_ENABLED=true` at the moment the permit is issued.

The permit is fingerprinted over the full request and authorization envelope. A change to the target, before-state, proposed change, expected state, approver, or authorization reference changes the fingerprint.

## Fail-closed rules
The gate rejects execution when:

- the site is not `diamondshelf.us`;
- the action is outside the three-action allowlist;
- before-state is absent;
- expected verification state is absent;
- production authorization does not exactly match the action;
- authorization identity/reference is absent;
- the global write kill switch is not enabled.

An `auto` safety classification from Task #26 is not production authorization. It only means the action is eligible for the low-risk lane.

## Verification and rollback
After any future authorized write, the existing Verification + Rollback engine remains mandatory.

- verified → close the controlled optimization successfully;
- failed → rollback required;
- regressed → rollback required.

Rollback must restore the captured before-state, not synthesize a new state.

## Critical boundary for this PR
This task implements and tests the production authorization gate only. It does **not** execute a Shopify mutation and does **not** authorize a Diamond Shelf write.

A real site mutation requires a separate explicit user authorization that identifies the selected Diamond Shelf action after the real opportunity/action IDs and before-state are known.

## Exit criteria
- deterministic tests pass;
- workspace typecheck/build pass;
- CI is green on the exact PR head;
- no credential or secret is committed;
- no public-site mutation occurs as part of CI or this implementation task.

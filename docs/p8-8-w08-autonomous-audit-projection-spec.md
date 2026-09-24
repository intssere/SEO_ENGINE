# P8.8 W08 — Autonomous Audit Projection Specification

**Issue:** #480  
**Status:** SPECIFICATION / REVIEW ONLY — W08 IMPLEMENTATION, PRODUCTION READS/WRITES, W09 AND W10 BLOCKED

## Purpose

W08 defines the deterministic audit projection for one exact P8.8 policy-authorized action after certified W07.

W08 answers only:

> Given caller-supplied canonical W01–W07 artifacts and durable evidence for one exact `policyActionId`, how can the system produce a tamper-evident, action-specific, deterministic audit chronology without creating a second execution authority, persistence authority, provider authority, or current-state authority?

W08 is **not** an execution engine, database reader, audit database, scheduler, worker, provider adapter, policy activation mechanism, or Stage 0/Stage 1 runtime.

W08 engineering must remain pure/default-off. A merged W08 implementation alone must not read Production, write Production, call a provider, reopen a write gate, activate autonomous work, or alter W04/W05/W07 authority state.

## Certified inputs

W08 is downstream of the certified P8.8 chain:

- W01 — pure policy grant/evaluation;
- W02 — governed proposal materialization;
- W03 — provenance-distinct policy authorization;
- W04 — durable reservation/idempotency;
- W05 — durable mutation-control claim;
- W06 — policy-aware mutation-free preflight;
- W07 — policy-only single-action apply, verification, rollback and safety closure.

W08 also reuses the already-certified principles of:

- P8.6 action history/audit ledger;
- P10.1 unified change timeline.

W08 must not weaken or reinterpret any upstream invariant.

## Core decision

The first W08 implementation must be a **caller-supplied deterministic projection only**.

It must accept supplied W01–W07 evidence, validate exact lineage/integrity, project canonical audit entries, order them deterministically, and hash-chain the result.

It must perform no:

- database read;
- database write;
- schema mutation;
- provider/network read;
- provider/public-site write;
- rollback write;
- Task #51/#53/#54 call;
- route/startup/scheduler/worker binding;
- policy activation;
- gate/config/credential mutation;
- deployment/publication.

Live or Production evidence acquisition belongs to later separately authorized work, primarily W09 and W10.

## No competing authority store

W08 must not create a table or durable record that can be interpreted as:

- a new policy grant;
- a policy evaluation decision;
- a proposal;
- a human approval;
- an action row;
- a deployment;
- an execution authorization;
- a reservation;
- a control state;
- a claim;
- a dispatch;
- a provider receipt;
- a rollback authorization;
- a current-state record.

The authoritative durable execution state remains in the W04/W05/W07 namespaces already defined by migrations 0005/0006/0007.

The W08 result is a projection artifact only.

## Exact action identity

The audit root identity is the exact W03 `policyActionId`.

W08 must require one and only one coherent policy-action lineage. It must not infer action lineage from:

- same site;
- same Product GID;
- same target URL;
- same field;
- same before/after fingerprints;
- timestamp proximity;
- W07 dispatch ordering;
- shared recommendation;
- shared policy version.

Every supplied artifact that carries `policyActionId` must match exactly.

Artifacts that do not directly carry `policyActionId` must be linked through already-certified exact fingerprints/IDs that are present in an artifact that does.

## Required canonical lineage

A W08 projection must retain, at minimum, these exact identities when present upstream.

### W01

- policy ID;
- policy version;
- policy fingerprint;
- policy stage;
- grant activation/expiry;
- evaluation ID;
- evaluation fingerprint;
- evaluation decision;
- evaluation reference time;
- evaluation expiry;
- recommendation fingerprint;
- recommendation idempotency key;
- proposal fingerprint;
- target identity;
- before fingerprint;
- after fingerprint.

W08 must verify W01 integrity by rebuilding the supplied W01 grant/evaluation using the certified W01 contract rather than trusting detached caller fields.

### W02

- materialization ID;
- materialization fingerprint;
- materialization idempotency fingerprint;
- proposal ID;
- proposal fingerprint;
- recommendation ID;
- recommendation fingerprint;
- recommendation idempotency identity;
- preview identity/fingerprint;
- target-binding fingerprint;
- exact before fingerprint;
- exact after fingerprint.

W08 must rebuild/verify W02 through the certified deterministic materialization contract. It must never trim, normalize, rewrite or regenerate before/after values merely to make evidence agree.

### W03

- authorization provenance exactly `policy_authorization`;
- policy authorization ID;
- policy authorization fingerprint;
- policy action ID;
- issued-at;
- expiry;
- exact W01 evaluation binding;
- exact W02 materialization/proposal binding;
- W03 reservation-descriptor fingerprint.

W08 must not populate a human approval ID, persisted human action ID or Task #54 confirmation.

### W04

At minimum:

- reservation ID;
- reservation fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- site ID;
- target;
- before/after fingerprints;
- authorized-at;
- expires-at;
- claimed-at when present;
- terminal-at/reason when present;
- current supplied reservation status.

W04 has no append-only reservation-event table in migration 0005. Therefore W08 must **not invent intermediate reservation transitions** that are not represented by authoritative timestamps/evidence.

A supplied final W04 row may describe current/terminal reservation status, but W08 must not infer when an unrecorded intermediate state change happened.

### W05

At minimum:

- claim ID;
- claim fingerprint;
- reservation ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- site ID;
- claimed control revision;
- claimed control fingerprint;
- target;
- before/after fingerprints;
- claimed-at;
- claim receipt fingerprint when using the durable receipt.

A W05 control event is site-level authority, not automatically action-specific. W08 may bind a control event only when its revision/fingerprint is directly required by the action lineage or explicitly consumed by certified W07 evidence. Site/time proximity is insufficient.

### W06

At minimum:

- preflight ID;
- preflight fingerprint;
- disposition;
- blockers;
- exact W01–W05 lineage;
- target;
- before/after fingerprints;
- claimed control;
- current control;
- provider observation status/fingerprint;
- validated-at;
- preflight expiry;
- no-dispatch proof fingerprint and booleans when applicable.

W08 must preserve `ready_for_w07`, `blocked_no_dispatch`, `provider_read_unavailable_no_dispatch` and `state_uncertain` as distinct evidence. It must not translate unavailable or uncertain evidence into success.

### W07

At minimum:

- execution provenance exactly `policy_single_action_apply`;
- execution ID;
- dispatch ID;
- dispatch fingerprint;
- policy action ID;
- W01–W06 lineage IDs/fingerprints;
- reservation ID/fingerprint;
- claim ID/fingerprint;
- W06 preflight ID/fingerprint;
- target and exact before/after fingerprints;
- dispatch state;
- row revision;
- forward attempt count;
- rollback attempt count;
- public-write occurrence;
- rollback occurrence;
- provider request fingerprint when present;
- provider response fingerprint when present;
- verification fingerprint when present;
- reserved-at;
- dispatch-started-at;
- rollback-started-at;
- terminal-at/reason.

W08 should also accept the append-only W07 dispatch events supplied from migration 0007:

- event ID;
- event version;
- event fingerprint;
- dispatch ID;
- site ID;
- from revision/state;
- to revision/state;
- transition reason;
- provider request fingerprint;
- public-write occurrence;
- rollback occurrence;
- effective-at.

The exact W07 event chain is the authoritative event-history source for W07 state transitions.

## Provider, storefront and verification evidence

W07 verification success requires both exact provider evidence and independent storefront evidence.

W08 may project a verification conclusion only when supplied evidence can be tied to the exact W07 verification fingerprint or to an exact certified W07 execution artifact.

A provider mutation receipt alone is not verification.

One-sided provider or storefront observation is not verification.

An unavailable observation must remain unavailable.

A provider/storefront mismatch must remain a mismatch/failure or safety-closure reason.

W08 must never perform a fresh provider or storefront read to fill an audit gap.

## Rollback evidence

Rollback chronology must remain bounded by the W07 one-rollback maximum.

If rollback was required, W08 may project:

- rollback required;
- rollback started;
- rollback verification pending;
- rollback verified closed;
- manual intervention required;

only from exact W07 dispatch events/records and exact supplied verification evidence.

W08 must not fabricate a rollback attempt from a target returning to its prior value.

W08 must not infer rollback success from the final W04 reservation status alone.

## Policy-specific audit lineage model

W08 should define a policy-specific lineage object rather than overloading P8.6 human-path field names.

Recommended required fields:

- `policyId`;
- `policyVersion`;
- `policyFingerprint`;
- `evaluationId`;
- `evaluationFingerprint`;
- `materializationId`;
- `materializationFingerprint`;
- `proposalId`;
- `proposalFingerprint`;
- `policyAuthorizationId`;
- `policyAuthorizationFingerprint`;
- `policyActionId`;
- `reservationId`;
- `reservationFingerprint`;
- `claimId`;
- `claimFingerprint`;
- `preflightId`;
- `preflightFingerprint`;
- `executionId`;
- `dispatchId`;
- `dispatchFingerprint`.

Optional source IDs/fingerprints may be null only when the source stage legitimately does not yet exist for the projected point in time.

W08 must not substitute:

- `approvalId` for policy authorization;
- `actionId` from the human actions table for `policyActionId`;
- `deploymentId` for W07 dispatch ID.

## Target model

The initial W08 target remains exactly:

- site: Diamond Shelf;
- domain: `diamondshelf.us`;
- provider: Shopify;
- resource kind: Product;
- Product GID;
- canonical `/products/` URL;
- action: `update_meta_description`;
- field: `meta_description`;
- exact W02 before fingerprint;
- exact W02 after fingerprint.

W08 must not broaden the mutation class.

## Audit event taxonomy

The first implementation should use a W08-specific descriptive event taxonomy rather than changing P10.1 global event kinds.

Recommended initial classes:

- `policy`;
- `proposal`;
- `authorization`;
- `reservation`;
- `control`;
- `preflight`;
- `dispatch`;
- `verification`;
- `rollback`;
- `closure`.

Recommended initial event kinds:

### Policy

- `policy_grant_effective`;
- `policy_evaluation_admitted`;
- `policy_evaluation_rejected`.

### Proposal

- `governed_proposal_materialized`.

### Authorization

- `policy_authorization_created`.

### Reservation

- `reservation_authorized`;
- `reservation_claimed`;
- `reservation_consumed`;
- `reservation_released`;
- `reservation_expired`;
- `reservation_manual_intervention`.

A reservation event may be emitted only when an authoritative timestamp exists for that exact state. W08 must not invent missing transition times.

### Control

- `control_epoch_claimed`;
- `control_transition_observed`.

`control_transition_observed` requires direct revision/fingerprint binding. Site/time correlation is forbidden.

### Preflight

- `preflight_ready_for_w07`;
- `preflight_blocked_no_dispatch`;
- `preflight_provider_unavailable_no_dispatch`;
- `preflight_state_uncertain`.

### Dispatch / verification / rollback / closure

W07 dispatch state transitions should project one-for-one from the supplied append-only W07 event stream, preserving the original `to_state` as the source state.

Recommended W08 kinds include:

- `dispatch_reserved_prewrite`;
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

W08 must not coalesce safety-significant W07 states.

## P10.1 chronology principles to reuse

W08 must preserve these P10.1 principles:

- caller-supplied projection only;
- canonical ISO timestamps;
- deterministic source identity;
- exact duplicate source replay collapses;
- conflicting source replay fails closed;
- events after the caller-supplied reference time fail closed;
- temporal proximity does not create lineage;
- ordering does not create authority, causality, priority, risk, execution preference or success.

W08 does **not** need to change P10.1's global event-kind registry to satisfy this reuse requirement.

## P8.6 ledger principles to reuse

W08 must preserve these P8.6 principles:

- direct action-specific lineage only;
- deterministic read-only projection;
- exact replay collapse;
- conflicting replay fail-closed;
- neighboring events do not fill gaps;
- deterministic ordering;
- append-only projection semantics;
- per-entry fingerprint;
- previous-entry fingerprint;
- ledger fingerprint;
- independent integrity verification;
- hash order is tamper/serialization evidence only.

W08 may share stable hashing helpers where safe, but it must not mutate P8.6 human-path semantics.

## Source identity and replay

Recommended source identity:

`source.system + NUL + source.version + NUL + source.sourceId`

For the same source identity:

- byte/canonical-equivalent evidence may collapse;
- any different canonical evidence must fail closed;
- a later timestamp must never win a conflict;
- a higher W07 row revision must never silently overwrite a conflicting event with the same source identity.

W07 dispatch events already have unique event IDs/fingerprints and should be projected using those exact source identities.

## Canonical ordering

The ledger order must be deterministic.

Recommended ordering tuple:

1. `occurredAt`;
2. fixed W08 event-class precedence;
3. fixed within-class event-kind precedence;
4. source/event fingerprint.

Recommended class precedence:

1. policy;
2. proposal;
3. authorization;
4. reservation;
5. control;
6. preflight;
7. dispatch;
8. verification;
9. rollback;
10. closure.

This ordering is a serialization rule only. It does not prove causation or authority.

For W07 dispatch events with the same timestamp, the W07 `to_revision` must be honored before any lexical fingerprint tiebreaker.

## Event fingerprint

Each materialized W08 entry should hash a canonical payload containing at least:

- W08 version;
- sequence;
- occurred-at;
- class;
- kind;
- source identity/version/fingerprint;
- exact policy lineage;
- exact target;
- evidence payload;
- previous-entry fingerprint.

The ledger fingerprint should bind:

- W08 version;
- policy action ID;
- reference time;
- target;
- summary;
- first entry fingerprint;
- final entry fingerprint;
- ordered entry fingerprints;
- semantics/safety markers.

## Integrity verification

The implementation must expose an independent integrity checker.

At minimum it must detect:

- changed entry payload;
- changed sequence;
- changed previous-entry fingerprint;
- changed entry fingerprint;
- changed ledger fingerprint;
- duplicated sequence;
- missing entry in the chain;
- reordered entries;
- policy-action lineage mismatch;
- target mismatch;
- W01/W02/W03 fingerprint mismatch;
- W04 reservation mismatch;
- W05 claim/control mismatch;
- W06 preflight mismatch;
- W07 dispatch/event mismatch;
- impossible W07 revision/state transition;
- forward/rollback attempt counts above one;
- unsupported mutation class;
- conflicting replay.

Integrity verification is descriptive only and creates no execution authority.

## Current state semantics

W08 must not infer a live current provider value from chronology.

The latest ledger entry is not authoritative current state.

The final W07 dispatch state may be reported as supplied evidence, but W08 must not claim that it remains current after the supplied reference time.

W08 must not claim that a retained live mutation remains live unless the supplied W07 evidence itself certifies that exact terminal outcome at the reference time.

## Manual intervention and uncertainty

The audit projection must preserve:

- provider write may have occurred;
- rollback write may have occurred;
- verification unavailable;
- state uncertain;
- manual intervention required;

without promoting them to success.

A `manual_intervention_required` W07 terminal state must remain visible as a blocking/safety state in the W08 summary.

W08 must not auto-close it.

## Recommended summary

The W08 result may include deterministic counts such as:

- total entries;
- policy entries;
- proposal entries;
- authorization entries;
- reservation entries;
- control entries;
- preflight entries;
- dispatch entries;
- verification entries;
- rollback entries;
- closure entries;
- forward attempt count;
- rollback attempt count;
- manual intervention count;
- uncertain-write count;
- terminal W07 state.

These are descriptive aggregates only.

No score, risk reclassification, recommendation ranking, success probability, causal impact or policy quality judgment belongs in W08.

## Relationship to P8.6

W08 is the policy-path counterpart to P8.6, not its replacement.

P8.6 continues to describe action history for the existing human-governed action path.

W08 should preserve the same tamper-evident/read-only design principles while retaining policy-specific IDs instead of fabricating human-path IDs.

Future UI may render P8.6 and W08 using a common visual grammar, but W08 must not merge their authority namespaces.

## Relationship to P10

P10 remains measurement/impact chronology.

W08 may later provide policy-action chronology that can be explicitly adapted into P10 inputs, but W08 itself must not:

- infer causal impact;
- calculate outcome quality;
- update recommendation calibration;
- emit reward signals;
- mutate ranking/model/policy state.

Any W08 → P10 adapter must preserve exact policy action ID/fingerprint lineage and remain separately reviewable.

## Recommended W08 implementation packages

After this specification is merged and separately authorized, implementation should be split as follows.

### W08-E1 — pure source contracts and exact lineage verifier

- define W08 input/source envelope types;
- rebuild/verify exact W01–W03 pure artifacts;
- validate exact supplied W04–W07 durable identities/fingerprints;
- no DB/network/runtime binding.

### W08-E2 — deterministic policy audit event adapters

- project W01–W07 supplied evidence into the fixed W08 taxonomy;
- preserve uncertainty and manual-intervention semantics;
- forbid inferred transitions.

### W08-E3 — deterministic chronology and replay fencing

- canonical timestamp validation;
- source identity;
- exact replay collapse;
- conflicting replay fail closed;
- fixed ordering including W07 revision ordering.

### W08-E4 — hash-chained ledger and independent integrity verifier

- per-entry fingerprint chain;
- ledger fingerprint;
- deterministic summary;
- tamper/reorder/missing-entry detection.

### W08-E5 — certification

Tests should prove at minimum:

1. exact W01–W07 lineage produces one deterministic ledger;
2. exact replay is byte-for-byte deterministic;
3. shuffled caller input produces the same canonical ledger;
4. conflicting replay fails closed;
5. wrong policyActionId fails closed;
6. wrong target fails closed;
7. wrong W01 policy/evaluation fingerprint fails closed;
8. wrong W02 materialization/proposal/before/after fingerprint fails closed;
9. wrong W03 authorization provenance/ID/fingerprint fails closed;
10. wrong W04 reservation ID/fingerprint/status binding fails closed;
11. wrong W05 claim/control revision/fingerprint fails closed;
12. wrong W06 preflight ID/fingerprint/disposition binding fails closed;
13. wrong W07 dispatch ID/fingerprint fails closed;
14. tampered W07 event fingerprint fails closed;
15. broken W07 revision sequence fails closed;
16. impossible W07 state transition fails closed;
17. forward attempt count >1 fails closed;
18. rollback attempt count >1 fails closed;
19. unavailable provider evidence remains unavailable;
20. state uncertainty remains uncertainty;
21. manual intervention remains manual intervention;
22. no reservation transition is invented without authoritative timestamp/evidence;
23. site/time proximity cannot attach an unrelated W05 control event;
24. mutation receipt alone cannot create verification success;
25. one-sided provider/storefront evidence cannot create verification success;
26. latest chronological entry is not treated as authoritative current provider state;
27. ledger tampering is detected;
28. entry removal is detected;
29. entry reorder is detected;
30. no human approval/action/deployment/Task #54 identity is fabricated;
31. no P10 causal/impact inference occurs;
32. no DB read/write occurs;
33. no provider/network call occurs;
34. no provider/public-site or rollback write occurs;
35. no route/startup/scheduler/worker binding exists;
36. no policy/public-write gate is enabled;
37. no deployment/publication occurs.

## Static implementation safety

W08 implementation certification should include static assertions that the W08 module is not imported by:

- application startup;
- API route handlers that create execution authority;
- scheduler entrypoints;
- worker execution entrypoints;
- Task #51/#53/#54 execution paths;
- provider mutation adapters.

If a UI or read-only API later consumes W08, that integration must be separately scoped and must not alter these authority boundaries.

## Persistence boundary

W08 requires **no migration 0008** for its initial engineering implementation.

No W08 audit table is authorized by this specification.

If durable audit persistence is later desired, it requires a separate schema review proving that persisted audit rows remain derived projections and cannot become execution authority.

## Production boundary

This specification authorizes no Production database access.

Production migrations 0005/0006/0007 remain separately gated.

W08 implementation may use deterministic fixtures and caller-supplied evidence only.

## W09 boundary

W09 is Stage 0 shadow certification.

W09 may later evaluate real decisions with **zero provider writes** under separately authorized Production read/persistence boundaries if needed.

W08 does not authorize W09.

## W10 boundary

W10 remains the separately authorized Stage 1 live activation package.

No W08 merge, audit result, ledger status, successful verification, absence of manual intervention, or W09 shadow result can itself activate W10.

## Explicit non-authorization

This W08 specification authorizes no:

- W08 implementation;
- new database schema or migration;
- migration 0005/0006/0007 application;
- Production DB read/write;
- Production reservation/control/claim/dispatch mutation;
- provider/public-site read;
- provider/public-site forward write;
- rollback write;
- Task #51/#53/#54 execution;
- scheduler/worker execution;
- policy/autonomous activation;
- credential/scope/config changes;
- `PUBLIC_SITE_WRITES_ENABLED` change;
- `P8_8_POLICY_MUTATION_EXECUTION_ENABLED` change;
- deployment;
- publication;
- W09;
- W10.

## Next explicit authorization boundary

After this specification/review is merged and certified, the next bounded engineering authorization is:

**W08-E1 through W08-E5 implementation exactly as defined above, pure/default-off and caller-supplied only.**

That future implementation authorization should continue to exclude:

- Production migrations/DDL/DML;
- live Production DB reads;
- live provider/public-site reads or writes;
- rollback writes;
- Task #51/#53/#54 execution;
- scheduler/worker/policy/autonomous activation;
- credentials/scopes/config/gate changes;
- deployment/publication;
- W09–W10.

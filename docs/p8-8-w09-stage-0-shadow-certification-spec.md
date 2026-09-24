# P8.8 W09 — Stage 0 Shadow Certification Specification

**Issue:** #487  
**Status:** SPECIFICATION / REVIEW ONLY — W09 IMPLEMENTATION, LIVE STAGE 0 PRODUCTION READS/PERSISTENCE, AND W10 ACTIVATION BLOCKED

## Purpose

W09 defines the **Stage 0 shadow-certification layer** for the progressive P8.8 policy-execution program after merged/certified W08.

Stage 0 evaluates real eligible-candidate shapes through the certified policy evaluator while guaranteeing **zero provider/public-site mutation**.

W09 answers:

> Given exact caller-supplied policy grants, candidate snapshots and optional human-governed comparison artifacts, can the system deterministically certify what the current P8.8 policy would admit/reject, why, whether replay is idempotent, whether all required rejection controls behave correctly, and whether decision lineage is complete — without creating execution authority or writing to providers?

W09 is not Stage 1 autonomy.

W09 must not create a policy authorization, durable reservation, mutation claim, provider preflight, dispatch, rollback, deployment or write permission.

## Stage 0 split

W09 has two distinct boundaries.

### W09-A — shadow-certification engineering

May be implemented before live Stage 0 evidence collection.

Properties:
- caller-supplied inputs only;
- pure/default-off;
- no Production database read;
- no Production persistence;
- no provider/public-site read or write;
- no scheduler/worker binding;
- no W03–W07 materialization;
- no new migration required;
- deterministic fixtures and supplied evidence only.

### W09-B — real-decision Stage 0 evidence run

Future separately authorized certification activity.

Requirements:
- real eligible-candidate snapshots;
- zero provider writes;
- exact current policy version/fingerprint;
- exact decision-time control/quota/cooldown/concurrency/manual-intervention/uncertainty facts;
- human-governed comparison artifacts when available;
- complete audit lineage;
- explicit proof that no provider mutation occurred.

If W09-B requires direct Production reads or persistence, those reads/storage writes require a separate authorization naming the exact source, scope, schema/storage target and allowed operation.

A W09-A implementation merge does not authorize W09-B.

## Canonical upstream contracts

W09 must reuse, not reinterpret:

- W01 — policy grant/evaluation;
- P8.6 — human-governed action audit ledger;
- P8.7 — one separately authorized human-governed live mutation as historical comparison evidence only;
- W08 — policy-path audit principles for deterministic lineage/tamper evidence;
- P10.1 — deterministic chronology principles where chronology is needed.

W09 must not require W02–W08 execution-path materialization merely to shadow-evaluate a candidate.

A rejected W01 candidate must remain representable without fabricating later-stage artifacts.

## Exact Stage 0 policy scope

The shadow evaluator remains closed to the exact current W01 class:

- provider: Shopify;
- domain: `diamondshelf.us`;
- resource kind: Product;
- canonical Product GID;
- canonical `/products/` target URL;
- action: `update_meta_description`;
- field: `meta_description`;
- required scope: `write_products`;
- policy class: `shopify.product.seo.meta_description`;
- low effective risk;
- deterministic materialized recommendation/preview lineage;
- bounded pilot only;
- no whole-site coverage;
- evidence count/quality thresholds exactly as W01;
- mutation concurrency maximum 1;
- quota maximum 1/24h/site;
- same-target cooldown at least 14 days;
- durable mutation control must be `running`;
- unresolved manual intervention / uncertain provider write / rollback failure blocks admission.

W09 must not broaden any scope because it is "shadow-only."

## Shadow input contract

A Stage 0 shadow item should include:

- a caller-supplied exact W01 policy grant;
- a caller-supplied exact W01 candidate snapshot;
- canonical evaluation reference time;
- canonical evaluation expiry;
- source descriptor for the candidate snapshot;
- source snapshot fingerprint;
- optional human-governed comparison envelope.

The shadow layer must call the certified W01 evaluator rather than restating policy conditions independently.

The shadow layer must independently re-run W01 integrity verification on the produced evaluation.

## Real-candidate snapshot meaning

"Real candidate" means the supplied snapshot represents a candidate derived from actual system evidence rather than a synthetic unit-test fixture.

W09-A does not prove that a caller-supplied snapshot is real merely because the caller labels it real.

For W09-B, real-candidate provenance must be externally evidenced by exact source identifiers/fingerprints from the authorized acquisition path.

W09 must preserve the distinction between:

- `synthetic_fixture`;
- `supplied_real_snapshot`;
- `production_read_snapshot`.

A W09-A engineering test may use synthetic fixtures.

A future W09-B certification may use supplied real snapshots without direct Production access if their provenance is independently certifiable.

Direct `production_read_snapshot` acquisition is separately authorized.

## Shadow decision artifact

Each item should produce an immutable deterministic shadow-decision artifact containing at minimum:

- W09 version;
- shadow decision ID;
- shadow decision fingerprint;
- source snapshot identity/fingerprint;
- policy ID/version/fingerprint;
- W01 evaluation ID/fingerprint;
- W01 decision: `admit` or `reject`;
- exact ordered rejection reasons;
- reference time;
- evaluation expiry;
- exact recommendation/proposal/evidence/quality/risk/target/control facts carried by W01;
- source provenance class;
- optional comparison result;
- zero-write safety markers.

The shadow decision is descriptive only.

An `admit` shadow decision is **not**:

- human approval;
- W03 policy authorization;
- W04 reservation;
- W05 claim;
- W06 preflight;
- W07 dispatch eligibility;
- provider-write permission;
- worker permission;
- live autonomy.

## Shadow session / batch

A W09 shadow session should group a bounded caller-supplied set of shadow items under:

- one exact policy ID/version/fingerprint;
- one session reference time/window;
- one bounded item limit;
- one session ID/fingerprint.

The first implementation should remain bounded and deterministic.

Recommended engineering cap:
- maximum 1,000 items per pure shadow session.

This cap is an engineering guard, not a Production throughput promise.

Mixed policy fingerprints in one session must fail closed.

## Replay and conflict semantics

W09 must reuse W08/P8.6 replay principles.

For the same exact shadow source identity:

- byte/canonical-equivalent replay collapses;
- conflicting replay fails closed;
- later timestamps do not win;
- a more favorable decision does not win;
- a more recent policy fingerprint does not silently replace another policy;
- order of caller-supplied items must not change the canonical session result.

Recommended source identity:

`source.system + NUL + source.version + NUL + source.sourceId`

The source fingerprint must remain integrity-bound.

## Canonical ordering

Canonical shadow-session ordering should use:

1. evaluation reference time;
2. source identity;
3. evaluation fingerprint;
4. shadow decision fingerprint.

Ordering is serialization only.

It does not create:

- priority;
- execution order;
- authority;
- confidence;
- quality;
- causal significance.

## Human-governed comparison

W09 may compare a shadow decision with exact caller-supplied human-governed evidence.

Accepted comparison source should be one of:

- an independently integrity-verified P8.6 action audit ledger;
- a separately certified P8.7 pilot evidence envelope derived from exact P8.6/P8.4/P8.5 lineage;
- a future approved human-governed outcome adapter with equivalent exact action/target lineage.

W09 must not query human approvals/actions/deployments directly in W09-A.

### Required target comparability

A human-governed outcome is comparable only when exact target identity matches the shadow candidate:

- provider;
- domain/site;
- resource kind;
- resource GID;
- target URL;
- action type / mutation class;
- field;
- before fingerprint;
- after fingerprint.

Timestamp proximity, same brand/site, same recommendation text, similar copy, or semantic similarity cannot create comparison lineage.

### Descriptive comparison states

Recommended comparison states:

- `not_supplied`;
- `not_comparable`;
- `human_approved_executed_verified`;
- `human_approved_executed_failed_or_unavailable`;
- `human_approved_no_verified_execution`;
- `human_rejected_or_not_approved`;
- `human_manual_intervention`;
- `human_rollback_verified_closed`;
- `human_outcome_uncertain`.

The shadow comparison may then describe:

- `same_direction`;
- `different_direction`;
- `not_comparable`;
- `insufficient_human_evidence`.

These are descriptive alignment states only.

W09 must not label either the human or policy decision "correct," "better," "safer," "more accurate," or "optimal."

W09 must not infer causal outcome quality from a human action succeeding or failing.

## P8.7 historical pilot limitation

The certified P8.7 live pilot was a Shopify **collection** SEO `meta_description` mutation.

The current W01/W09 class is Shopify **product** SEO `meta_description`.

Therefore the P8.7 pilot is valid historical evidence of the human-governed execution pipeline, verification and audit semantics, but it is **not target-comparable to the initial W09 product shadow class** unless a future exact comparable Product human-governed action exists.

W09 must not force or fake comparability to P8.7.

## Mandatory rejection-behavior certification

W09 engineering must explicitly certify exact W01 rejection for at least these policy-control conditions:

- policy not active;
- policy expired;
- policy revoked;
- invalid evaluation expiry;
- control not running;
- unresolved manual intervention;
- provider-write uncertainty;
- unresolved rollback failure;
- non-proposal-review recommendation class;
- recommendation lineage not materialized;
- changed preview missing;
- nondeterministic proposal;
- AI-assisted candidate when forbidden;
- proposal edited after certification;
- proposal lifecycle ineligible;
- proposal generation method not allowed;
- bounded pilot absent;
- whole-site coverage requested;
- evidence insufficient;
- missing evidence present;
- quality not pass;
- quality not approval-eligible;
- quality below threshold;
- quality blockers;
- quality warnings;
- risk not low;
- provider not allowed;
- domain not allowed;
- resource kind not allowed;
- invalid Product GID;
- target URL not allowed;
- action type not allowed;
- field not allowed;
- provider scope not allowed;
- provider before-state mismatch;
- prior deployment exists;
- site mutation concurrency exhausted;
- same-target cooldown unsatisfied;
- mutation quota exhausted.

The harness should consume W01's exact rejection reasons; it must not create a second policy rule engine.

## Control-mode certification

Stage 0 must explicitly prove:

- `running` can permit policy admission when all other conditions pass;
- `pause` rejects;
- `drain` rejects;
- `kill` rejects.

No Stage 0 evaluation may itself mutate the control mode.

## Quota/cooldown/concurrency certification

Stage 0 must prove exact boundary behavior for:

### Quota

- used < limit can remain eligible;
- used == limit rejects;
- used > limit rejects;
- malformed/negative/inconsistent quota facts fail closed through W01 validation.

### Same-target cooldown

- elapsed < minimum rejects;
- elapsed == minimum is evaluated exactly according to the certified W01 boundary;
- elapsed > minimum may remain eligible;
- unresolved prior target timing must not be inferred.

### Concurrency

- active mutation count below allowed maximum may remain eligible;
- at/exceeding maximum rejects;
- unresolved/manual-intervention state remains blocking.

W09 must not reserve quota, consume quota, claim concurrency or start a cooldown.

## Audit-lineage completeness

Every W09 shadow decision must be independently checkable to one exact:

- source snapshot;
- W01 grant;
- W01 candidate;
- W01 evaluation;
- policy fingerprint;
- recommendation fingerprint/idempotency identity;
- proposal fingerprint;
- evidence-set fingerprint;
- quality fingerprint;
- risk fingerprint;
- target identity;
- before/after fingerprints;
- mutation-control fingerprint.

If a comparison is supplied, the exact human action/ledger identity and target-binding proof must also be present.

Completeness means required lineage is present and integrity-valid.

It does not mean the decision was good, executed, or successful.

## Zero-write proof

W09 Stage 0 engineering must provide explicit safety markers and static tests demonstrating:

- no W03 authorization creation;
- no W04 reservation creation or mutation;
- no W05 claim/control mutation;
- no W06 provider observation/preflight call;
- no W07 dispatch;
- no rollback;
- no provider/public-site mutation;
- no Task #51/#53/#54 execution;
- no scheduler/worker/startup/route binding;
- no DB read/write;
- no persistence;
- no migration/schema change;
- no credential/config/gate change;
- no deployment/publication.

Stage 0 may conceptually model what W01 would decide only.

## Provider-read boundary

W09-A performs no provider read.

If W09-B needs a fresh current-provider-state candidate snapshot, provider read authorization must be separately scoped.

A provider read used for shadow evidence does not authorize any provider write.

## Production database boundary

W09-A performs no Production DB read/write.

If W09-B needs direct Production candidate reads, a future authorization must name:

- exact canonical SHA/tree;
- exact database/environment;
- exact tables/views/queries;
- read-only role/connection;
- bounded row/item limit;
- allowed time window;
- no DDL/DML;
- no lock-taking beyond ordinary read semantics;
- expected evidence output.

If Stage 0 decisions are to be persisted, persistence requires a separate schema/storage review.

No migration is authorized by this specification.

## Shadow persistence

Initial W09 engineering should use no database persistence.

A future persistent Stage 0 evidence store, if desired, must be:

- append-only or immutable in purpose;
- derived evidence only;
- non-authoritative for policy execution;
- unable to become W03/W04/W05/W07 authority;
- separately reviewed and migrated.

## Session summary

A deterministic W09 session summary may include:

- total candidates;
- admitted count;
- rejected count;
- rejection counts by exact W01 reason;
- source-provenance counts;
- comparison supplied count;
- comparable count;
- same-direction count;
- different-direction count;
- insufficient-human-evidence count;
- idempotent replay count;
- conflict count;
- control-mode rejection counts;
- quota rejection count;
- cooldown rejection count;
- concurrency rejection count;
- unresolved-side-effect rejection count;
- lineage-complete count;
- lineage-incomplete count.

The summary must not produce:

- policy accuracy percentage;
- human accuracy percentage;
- confidence score;
- model score;
- policy fitness score;
- recommendation ranking;
- live-readiness score;
- activation recommendation.

Those judgments belong to a separately reviewed W10 activation decision.

## Certification status

Recommended per-session statuses:

- `engineering_fixture_pass`;
- `engineering_fixture_fail`;
- `real_shadow_evidence_complete`;
- `real_shadow_evidence_incomplete`.

A session becomes `real_shadow_evidence_complete` only when:

- every input is real-provenanced under the authorized source path;
- every decision replays deterministically;
- no source conflict exists;
- required rejection-control cases are certified in the evidence package or linked certified engineering matrix;
- audit lineage is complete;
- zero provider/public-site mutation is evidenced;
- any human comparison is integrity-valid and classified descriptively;
- no forbidden W03–W07 authority artifact was created.

This status still does not authorize W10.

## W09 engineering packages

After this specification is merged and separately authorized, recommended implementation split:

### W09-E1 — shadow source/decision contracts

- exact source-provenance envelope;
- exact W01 grant/candidate/evaluation binding;
- deterministic shadow decision ID/fingerprint;
- zero-write capability markers.

### W09-E2 — deterministic shadow session/replay fencing

- bounded item set;
- canonical ordering;
- exact replay collapse;
- conflicting replay fail closed;
- deterministic session fingerprint/summary.

### W09-E3 — human-governed descriptive comparison

- P8.6 integrity verification;
- exact target comparability;
- descriptive human-outcome and direction states;
- no correctness/causality inference.

### W09-E4 — rejection/control certification harness

- exact W01 rejection matrix;
- pause/drain/kill;
- quota;
- cooldown;
- concurrency;
- unresolved manual intervention / uncertain write / rollback failure;
- no duplicate policy engine.

### W09-E5 — integrity/static certification

- tamper/replay/session integrity;
- source provenance checks;
- lineage completeness;
- static no W03–W07/DB/provider/runtime binding;
- zero-write certification.

## Minimum engineering certification matrix

The implementation should prove at minimum:

1. one exact eligible snapshot produces one deterministic shadow decision;
2. exact replay is byte-for-byte deterministic;
3. shuffled session input produces the same canonical session;
4. conflicting source replay fails closed;
5. mixed policy fingerprints fail closed;
6. tampered source fingerprint fails closed;
7. tampered grant fails closed;
8. tampered candidate facts fail closed;
9. tampered W01 evaluation fails closed;
10. reject decision preserves exact ordered W01 reasons;
11. admit remains descriptive and creates no W03 artifact;
12. policy inactive rejects;
13. policy expired rejects;
14. policy revoked rejects;
15. pause rejects;
16. drain rejects;
17. kill rejects;
18. unresolved manual intervention rejects;
19. uncertain provider write rejects;
20. rollback failure rejects;
21. quota exhaustion rejects;
22. cooldown violation rejects;
23. concurrency exhaustion rejects;
24. prior deployment rejects;
25. provider before-state mismatch rejects;
26. unsupported provider/domain/resource/action/field/scope rejects;
27. insufficient evidence rejects;
28. quality failures reject;
29. non-low risk rejects;
30. human comparison with exact target lineage is accepted;
31. non-comparable human target remains not-comparable;
32. timestamp proximity cannot manufacture comparison lineage;
33. P8.7 collection pilot is not treated as product-comparable;
34. human verification unavailable remains unavailable;
35. human manual intervention remains manual intervention;
36. comparison direction does not imply correctness;
37. session summary is deterministic;
38. lineage completeness detects missing source/grant/evaluation fingerprints;
39. no DB read occurs;
40. no DB write/persistence occurs;
41. no provider/public-site read occurs;
42. no provider/public-site write occurs;
43. no W03 authorization is created;
44. no W04 reservation is created/mutated;
45. no W05 claim/control mutation occurs;
46. no W06 provider preflight occurs;
47. no W07 dispatch/rollback occurs;
48. no Task #51/#53/#54 execution occurs;
49. no route/startup/scheduler/worker binding exists;
50. no migration/schema/config/gate/deployment/publication action occurs.

## W09-B real Stage 0 proof package

After W09 engineering is merged and a separate real-shadow authorization is granted, the proof package should include:

- exact canonical application SHA/tree;
- exact W09 implementation fingerprint/version;
- exact W01 policy ID/version/fingerprint;
- exact source acquisition mode;
- exact bounded candidate set;
- exact session reference time/window;
- per-candidate source/evaluation/decision fingerprints;
- human comparison source IDs/fingerprints where supplied;
- rejection-behavior certification reference;
- zero-write static/runtime evidence;
- session fingerprint;
- lineage-completeness result;
- explicit statement that W03–W07 authority/materialization did not occur.

## W10 boundary

W10 remains a separate **Stage 1 activation package**.

No W09 artifact, shadow admit count, descriptive human alignment, zero-write success, real-shadow completion, or absence of conflicts may itself:

- enable provider writes;
- initialize/alter Production mutation control;
- create executable reservations;
- activate workers/schedulers;
- open `PUBLIC_SITE_WRITES_ENABLED`;
- enable `P8_8_POLICY_MUTATION_EXECUTION_ENABLED`;
- deploy/publish;
- authorize Stage 1.

A future W10 review must independently examine W01–W09 evidence and require explicit live activation authorization.

## Explicit non-authorization

This specification authorizes no:

- W09 implementation;
- direct Production DB read/write;
- Production persistence;
- migration or schema change;
- live provider/public-site read;
- provider/public-site write;
- W03/W04/W05/W06/W07 execution/materialization;
- Task #51/#53/#54 execution;
- scheduler/worker/startup activation;
- credential/scope/config/gate change;
- deployment/publication;
- W10.

## Next explicit authorization boundary

After this specification/review is merged and certified:

**Implement W09-E1 through W09-E5 exactly as defined above, pure/default-off and caller-supplied only.**

That future engineering authorization still does not authorize a real Production Stage 0 evidence run.

A real W09-B Stage 0 run requires a later explicit authorization naming its data-acquisition and persistence boundaries.

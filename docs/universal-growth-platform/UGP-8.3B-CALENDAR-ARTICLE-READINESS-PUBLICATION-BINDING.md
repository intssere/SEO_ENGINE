# UGP-8.3B — Article readiness + publication-plan binding

## Status
IMPLEMENTATION CANDIDATE — LINEAGE BINDING ONLY / NO SCHEDULER MATERIALIZATION / NO PUBLICATION EXECUTION

## Purpose
UGP-8.3B gives the UGP-8.3A calendar's opaque readiness fingerprint a canonical meaning and binds each scheduled calendar item to the exact UGP-7 / UGP-8.1 publication lineage.

A scheduled item is not considered readiness-bound merely because a caller supplied an arbitrary fingerprint.

## Canonical readiness
The canonical readiness fingerprint is derived from:
- exact UGP-7.4 draft ID and fingerprint;
- exact UGP-7.5 quality-gate ID and fingerprint;
- exact content-opportunity fingerprint.

The readiness builder fails closed unless:
- the draft passes integrity validation;
- the draft status is `draft_complete`;
- article body and finishing assets exist;
- the quality gate passes integrity validation;
- the quality gate is `pass`;
- `approvalEligible === true`;
- draft, brief, ledger, gate, and content-opportunity lineage agree.

The resulting deterministic readiness fingerprint must exactly equal the `readinessFingerprint` frozen into the UGP-8.3A calendar item.

## Publication-plan binding
The calendar item is also bound to one exact UGP-8.1 `ArticlePublicationPlan`.

The publication plan must reference the same:
- draft ID/fingerprint;
- quality-gate ID/fingerprint;
- article-draft provenance;
- article-quality-gate provenance;
- content-opportunity fingerprint.

UGP-8.3B does not rebuild or weaken UGP-8.1's capability, preview, verification, or authorization boundaries.

## Action alignment
The calendar's content action determines the allowed publication-plan preparation operation:
- `create_candidate` → UGP-8.1 `create` plan;
- `refresh_candidate` → UGP-8.1 `update` plan.

This increment deliberately does not reinterpret a content-calendar slot as authorization to invoke the separate public `publish` operation.

## Autopilot and review
UGP-8.3A review/autopilot flags are preserved in the binding.

Even when `autopilotPolicySelected === true`, UGP-8.3B still records:
- scheduler materialized: false;
- scheduler authorized: false;
- publication authorized: false;
- execution authorized: false.

## Safety boundary
UGP-8.3B:
- does not enqueue or persist a scheduler job;
- does not construct an execution request;
- does not construct an authorization reference;
- does not call any CMS, provider, Git host, or network;
- performs no provider/public-site write;
- performs no DB/schema, Railway, deployment, worker, or autonomy mutation.

## Next step
A later UGP-8.3 increment can define a scheduler-ready immutable work specification derived from this binding. Durable queue persistence and runtime scheduling remain deferred to UGP-11 and must consume—not manufacture—authorization.

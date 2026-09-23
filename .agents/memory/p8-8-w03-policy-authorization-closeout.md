# P8.8 W03 policy authorization artifact — closeout

W03 implements the pure/default-off provenance-distinct policy authorization artifact.

- issue: #416
- PR: #417
- implementation source: `p8-8-policy-authorization.ts`
- tests: `p8-8-policy-authorization.test.ts`
- code-only head: `8278efbcc81bac309489ccd265f7e8faa02c3140`
- code-only CI #728: success

Core invariants:

- W01 policy admission is rebuilt canonically and must be exact `admit`;
- W02 governed proposal is rebuilt canonically and must remain `materialized_unpersisted`;
- W01/W02 recommendation/proposal/target/before/after identities must agree exactly;
- provenance is exactly `policy_authorization`;
- no human approval ID/decision/actor/timestamp or Task #51/#54 human-path artifact is carried;
- human Task #51 envelope and Task #54 confirmation compatibility are explicitly false;
- reservation is caller-supplied only and before W04 must be synthetic/non-durable;
- W03 derives deterministic artifact-only policy action and policy authorization identities;
- `persistedActionId=null`, `persistedActionCreated=false`;
- caller-supplied canonical issued time; TTL 1–15 minutes and expiry clamped to W01 evaluation/grant expiry;
- `providerWriteAllowed=false`, `providerDispatchAuthorized=false`, `publicSiteWrites=false`, `automaticTransition=false`, `dispatchEligible=false`;
- exact replay stable; same W01/W02 lineage with conflicting authorization identity fails closed.

W03 performs zero DB read/write/persistence/schema mutation, zero provider/network read/write, zero approvals-row/action/reservation persistence, zero Task #51/#53/#54 execution, zero policy/scheduler/worker activation, zero credential/config/deployment/publication activity.

Final exact-head/merge/post-merge lineage is recorded on issue #416 after certification.

Next boundary: W04 durable reservation/idempotency design, separately authorized. W03 grants no W04–W10 authority.

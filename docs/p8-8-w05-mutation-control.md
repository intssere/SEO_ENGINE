# P8.8 W05 — durable mutation-control bridge engineering closeout

**Issue:** #443  
**PR:** #444  
**Status before merge:** W05 E1–E5 engineering implementation complete; Production DDL/DML, runtime/provider integration, deployment/publication and W06–W10 remain separately gated.

## Certified implementation scope

W05 implements the certified durable mutation-control bridge without activating it in Production.

Engineering files:

- `artifacts/api-server/src/lib/p8-8-mutation-control.ts`
- `artifacts/api-server/src/lib/p8-8-mutation-control.test.ts`
- `artifacts/api-server/src/lib/p8-8-mutation-control-store.ts`
- `artifacts/api-server/src/lib/p8-8-mutation-control-store.ephemeral.test.ts`
- `lib/db/migrations/0006_p8_8_policy_mutation_controls.sql`
- `lib/db/src/p8-8-w05-mutation-control-migration.test.ts`

CI wiring uses only:

`P8_8_W05_EPHEMERAL_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/seo_engine_test`

There is no W05 fallback to generic `DATABASE_URL`.

## W05-E1 — pure control and claim contracts

The pure W05 module defines:

- durable mutation-control versioning;
- exact control modes `running | paused | draining | drained | killed`;
- P9.6 action semantics `pause | drain | kill | resume`;
- durable control state/event fingerprints and monotonic revision lineage;
- deterministic W05 claim identity over the exact W03/W04 pair plus exact accepted control revision/fingerprint;
- mutation execution-phase projection separating new forward mutation from mandatory safety closure.

Permanent control precedence remains:

`kill > drain > pause > running`

W05 tightens mutation semantics:

- only `running` is claim-eligible;
- pause/drain/kill block all new forward mutation;
- killed cannot ordinary-resume;
- unresolved claimed/manual-intervention state blocks resume/drain completion;
- provider dispatch/write/public-site markers remain false.

## W05-E2 — additive engineering migration

Migration source:

`lib/db/migrations/0006_p8_8_policy_mutation_controls.sql`

adds exactly three dedicated tables:

- `policy_mutation_control_state`;
- `policy_mutation_control_events`;
- `policy_mutation_claims`.

The migration is additive and transactional.

It does not insert a default `running` row.

This preserves the fail-closed rule:

`control_not_initialized`

until a separately authorized runtime/Production activation creates durable control state.

The runtime schema recognizer understands the future 41-table W05 engineering state but does not auto-apply migration 0006.

## W05-E3 — durable PostgreSQL control store

`P88W05MutationControlStore` requires an explicit database URL.

Durable transitions:

- use PostgreSQL transaction time;
- lock the site control row before any reservation row;
- verify exact expected revision/fingerprint;
- atomically append a control event and update current state;
- preserve monotonic revision history;
- fail closed on missing/stale/uncertain control state.

Initialization exists only as an explicit store operation for isolated engineering certification. No route/startup/scheduler/worker automatically initializes Production control state.

## W05-E4 — atomic W04 reservation claim bridge

A new claim requires:

1. exact W03 authorization;
2. exact W04 durable authorized receipt;
3. certified W03/W04 pairing;
4. exact durable W05 control state;
5. current mode exactly `running`;
6. current database time within the W03 authorization window.

The transaction locks:

1. control row first;
2. exact W04 reservation row second.

A new claim atomically:

- inserts one immutable `policy_mutation_claims` row;
- transitions the exact W04 reservation `authorized -> claimed`;
- uses the same database transaction timestamp;
- returns a bounded durable W05 claim receipt.

Exact replay returns the existing claim.

A `claimed` W04 reservation without the exact immutable W05 claim row fails closed as uncertain.

Pause/drain/kill may release only an exact paired unclaimed W04 `authorized` reservation.

W05 never auto-releases or auto-expires:

- `claimed`;
- `manual_intervention`.

W05 does not own `claimed -> consumed`; that remains a later W07 execution/verification boundary.

## W05-E5 — real PostgreSQL certification

Dedicated localhost PostgreSQL tests certify:

- simultaneous exact duplicate claim -> one durable claim plus exact replay;
- claim racing pause/drain/kill -> serialized control ordering, never a claim under a closed revision;
- stale control revision rejection;
- exact paired authorized release only;
- claimed reservation remains blocking through pause;
- manual-intervention remains blocking;
- drain reaches `drained` only after zero unresolved blockers;
- killed state cannot ordinary-resume;
- expired authorization cannot claim;
- claimed-without-W05-claim fails closed as uncertain;
- conflicting immutable claim identity cannot produce a false W04 claimed transition;
- serialized pause -> drain -> kill revision history preserves precedence;
- human approvals/actions/deployments counts remain unchanged.

## Code-only CI certification

The repaired code-only head:

`6f5e302db014c153cfca2f86ca7f46136e0ab74f`

passed canonical:

- CI #825 / run `35869432936`;
- W05 migration/schema test;
- real PostgreSQL W05 persistence/concurrency test;
- full workspace tests;
- P11.10 scale;
- Chromium critical paths;
- typecheck;
- build.

An earlier head passed all runtime/database/browser tests but exposed four typecheck-only narrowing/cast defects. Those were repaired without changing W05 behavior, and CI #825 is the authoritative corrected code-only result.

## Human Task #51/#54 boundary

W05 does not alter or impersonate:

- human approvals;
- human `actions`;
- `controlled_execution_foundation_v1`;
- Task #54 preflight;
- `APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`;
- Task #54 deployments/verifications/rollback semantics.

No human approval/action/deployment row is created by W05.

## Capability boundary

W05 engineering does not authorize or perform:

- Production migration 0005;
- Production migration 0006;
- Production control-state initialization;
- Production reservation claim/release;
- Production DDL/DML;
- provider/network request;
- provider/public-site write;
- Task #51/#53/#54 execution;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config mutation;
- deployment;
- publication;
- W06–W10.

## Next boundary

After exact-head closeout CI and merge certification, the next P8.8 engineering work package is W06 — policy-aware mutation-free preflight.

W06 remains separately gated.

Production DDL for migrations 0005/0006 also remains separately gated and must identify the exact canonical SHA/tree and migration checksums.

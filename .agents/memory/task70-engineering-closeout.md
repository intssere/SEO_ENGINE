# Task #70 — Engineering Closeout

Task #70 — **Controlled Single-Job Signal Collection Execution Foundation v1** — is implemented, merged, CI-certified, and synchronized to the Replit workspace **without publication**.

## Canonical engineering release

- Issue: #114
- PR: #116
- initial PR head rejected after CI typecheck failure: `e5f7e81ad27cb3ed22cfea236b528bcf707cd6a2`
- corrected exact tested PR head: `44d970ded1697e7ecb2e8c9d527b1eee2cad93ed`
- corrected PR CI #213: success
- merged GitHub `main`: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- merged tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- post-merge `main` CI #214: success
- Replit HEAD/cached origin/main after engineering sync: same merge SHA
- Replit tree: same merged tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- publication/redeploy: **not performed**

The initial PR CI #212 passed schema validation, the Task #70 tests, and the full workspace suite, but failed TypeScript typecheck because one test helper inferred a narrower non-null `loadSiteContext` return type than the real dependency contract. The runtime implementation was not changed. The test helper was widened to the real dependency type; the corrected head then passed the full CI pipeline.

## Files changed

Task #70 changed exactly five files:

1. `artifacts/api-server/src/lib/signal-collection-execution.ts` — added
2. `artifacts/api-server/src/lib/signal-collection-execution.test.ts` — added
3. `artifacts/api-server/src/routes/signal-collection-execution.ts` — added
4. `artifacts/api-server/src/routes/index.ts` — modified only to mount the Task #70 router
5. `docs/task70-single-job-signal-collection-execution.md` — added

No migration, schema, provider credential, OAuth scope, target configuration, scheduler, worker, persistence table, or public-site connector change was made.

## Execution bridge delivered

Task #70 adds the smallest bounded bridge from a Task #69 authorization packet to a future read-only source runner.

Control lineage:

`Task #67 refresh plan`

→ `Task #68 SourceAdapterRequest`

→ `Task #69 exact expiring job packet + authorization`

→ `Task #70 durable one-job execution bridge`

The Task #70 version is:

`task70-single-job-signal-collection-execution-v1`

Durable job type:

`signal_collection_single_job_v1`

Dedicated runtime gate:

`SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`

The gate is default-off/effective false.

## Exact authorization

Task #70 consumes only the exact Task #69 authorization family:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

Execution independently re-runs the Task #69 preflight and requires the packet to remain unexpired and fingerprint/lineage correct.

A configured gate by itself is never authorization.

## Fail-closed execution order

The implemented order is:

1. Task #70 execution gate check first.
2. Structural packet/source/plan/request checks.
3. Exact Task #69 authorization equality.
4. Independent Task #69 preflight.
5. Source-runner capability/readiness check.
6. Operational site lookup.
7. Durable execution store availability.
8. Deterministic reservation.
9. Single claim.
10. Exactly one runner invocation.
11. Task #68 result normalization.
12. Terminal completion or failure receipt.

With the gate false, execution returns before runner capability, site lookup, store creation, or runner invocation.

## Production runner boundary

Task #70 defines a source-runner interface with explicit capability fields:

- configured
- credentialReady
- networkReady
- sourceReadOnly
- providerWrites
- publicSiteWrites

The production/default runner is deliberately unavailable:

- configured=false
- credentialReady=false
- networkReady=false
- sourceReadOnly=true
- providerWrites=false
- publicSiteWrites=false

Its `run` path performs no I/O and fails closed.

All Task #70 engineering tests use injected in-memory fake runners and stores. No real provider, competitor, search, trend, keyword, or SERP request occurred during engineering/CI.

## Durable replay lock

Task #70 reuses the existing `jobs` table and required no production DDL.

The deterministic UUID is derived from:

- Task #70 version
- Task #69 job ID
- Task #69 job fingerprint
- Task #69 replay fingerprint

Lifecycle:

- `pending` on reservation
- `active` on claim
- terminal `completed` or `failed`

An exact existing identity is treated as already consumed. A mismatched row under the same deterministic UUID is an identity collision and fails closed. Uncertain reservation state or uncertain terminal-write state returns manual intervention rather than automatic retry.

## Task #68 normalization handoff

A successful runner result is passed through canonical Task #68 `normalizeAdapterResult`.

The Task #70 durable receipt is bounded and retains only normalized metadata such as:

- observation ID/fingerprint
- stream ID
- status
- observed timestamp
- metric/diagnostic counts
- completeness
- confidence
- positive-evidence flag

The receipt explicitly retains no raw provider body, cookies, headers, tokens, API keys, OAuth credentials, or arbitrary exception text.

Runner errors are reduced to fixed `runner_failed`. Task #68 normalization rejection is reduced to `normalization_failed`.

## Persistence boundary

Task #70 does not persist normalized observations or evidence.

Success explicitly reports:

- raw payload retained: false
- observation persistence attempted: false
- evidence persistence attempted: false
- observation persisted: false
- evidence persisted: false
- target configuration mutated: false
- provider writes: false
- public-site writes: false
- automatic transition: false

Future observation/evidence persistence requires a separate task and authorization boundary.

## API/auth boundary

Task #70 adds:

- `GET /api/signal-collection-execution/capability`
- `POST /api/signal-collection-execution/run`

The Task #70 router additionally requires `admin` role.

The POST remains behind the existing global controls:

- authenticated session
- session-bound CSRF protection
- sensitive mutation rate limiting

No Task #70 route was invoked during engineering or Replit verification.

## Deterministic test certification

Task #70 tests cover:

1. default-off capability and closed safety markers
2. gate-first short circuit
3. deterministic UUID identity
4. authorization mismatch
5. expired/tampered Task #69 packet
6. unconfigured runner rejection before site/store
7. one-run happy path using an in-memory fake runner
8. exact replay rejection
9. deterministic identity collision
10. claim race
11. terminal runner failure without raw payload/persistence
12. Task #68 normalization rejection of raw/unknown fields
13. terminal completion-write uncertainty/manual intervention
14. reservation uncertainty/manual intervention

The full corrected PR CI and post-merge CI passed schema validation, task tests, all workspace tests, typecheck, and build.

## Replit engineering certification

After exact Replit synchronization:

- branch: `main`
- HEAD: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- cached origin/main: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree: clean
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`: false
- Task #64 one-target gate: false
- configured competitor targets: 0
- Task #59 collection gate: false
- Task #59 evidence-persistence gate: false
- public-site write gate: false
- no Task #70 route invoked during verification
- no provider/competitor/search/trend/keyword/SERP request during verification
- no publish/redeploy
- no state modification during verification

Database access was intentionally prohibited during the final Replit inspection, so that inspection did not independently query historical Task #70 rows. This does not alter the certification: Task #70 was not published, its route was not invoked, CI used in-memory stores, and the verification itself created no row.

## Runtime distinction

The currently published production application remains the certified Task #65 bundle.

Task #70 exists only in GitHub and the Replit workspace at this closeout. It has **not** been published/redeployed, and the production Task #70 route/runner is therefore not live from this engineering release.

## Next engineering boundary

The next safe milestone should prepare deterministic source-runner admission/selection without crossing into credentials or network execution.

Recommended next milestone:

**Task #71 — Source Runner Registry & Read-Only Capability Admission Foundation v1**

Safe scope:

- stable runner descriptors/identities
- exact binding from approved Task #67 source descriptors to eligible runner descriptors
- supported collection modes/signal types/market-category constraints
- explicit read-only capability assertions
- descriptive credential requirement classes only; no credential values/use
- runner manual-review/admission state
- deterministic runner selection and blockers
- duplicate/conflict fail-closed behavior
- compatibility with Task #70 runner capability interface
- deterministic network-free tests/docs

Task #71 must not configure a real production runner, use credentials, contact a provider/source, persist observations/evidence, enable Task #70, schedule work, mutate targets, perform production DDL, write to providers/public site, or publish/redeploy.

Any source-specific live runner implementation, provider enrollment, credential use, first real Task #70 job, or persistence remains separately authorized.
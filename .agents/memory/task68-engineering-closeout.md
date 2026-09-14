# Task #68 — Engineering Closeout

Task #68 — **Source Adapter Contract & Signal Observation Normalization Foundation v1** — is implemented, merged, CI-certified, and synchronized to the Replit workspace without publication.

## Canonical engineering release

- Issue: #104
- PR: #105
- first PR head: `c0b7deebdbca5b4de1a57c848b2defe60e93045d`
- first PR CI #201: schema validation, dedicated tests, and full workspace tests passed; typecheck correctly failed because the test helper inferred metric `unit` as required; build was skipped; this head was never merge-eligible
- corrected exact tested PR head: `73de8511cc86c421108d587171a8fba5d1e608f7`
- corrected PR CI #202: success
- merged GitHub main: `0f1371e0cfdd1678bb9ff78bc0bc54abec49caec`
- merged tree: `43b1b1a1948212ddd9d319e3e465698e06e1d124`
- post-merge main CI #203: success
- corrected full workspace suite: 344 tests, 344 pass, 0 fail
- Replit workspace: exact `main` sync to the merged SHA/tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- working tree: clean
- publication/redeploy: **not performed**

## Files added

Task #68 added exactly three files:

1. `artifacts/api-server/src/lib/signal-observation-normalization.ts`
2. `artifacts/api-server/src/lib/signal-observation-normalization.test.ts`
3. `docs/task68-source-adapter-observation-normalization.md`

No existing route, provider connector, schema, migration, environment/configuration, target configuration, scheduler, worker, execution path, or production persistence path was modified.

## Control-plane capability delivered

Task #68 creates the pure boundary between Task #67 refresh planning and any future separately authorized source collector.

The control-plane sequence is now:

`Task #66 market/category identity -> Task #67 source registry/refresh plan -> Task #68 adapter request + supplied-result normalization -> future separately authorized collection/persistence`

### Adapter request

A deterministic request binds:

- Task #67 source ID/fingerprint/class
- descriptive collection mode
- exact market fingerprint
- exact category fingerprint
- signal type
- optional exact refresh-plan ID/fingerprint

The request includes no credentials, token, secret, transport execution object, or provider mutation instruction.

### Supplied result normalization

Task #68 accepts only strict structural result fields. Unknown root and metric fields fail closed instead of being ignored.

Allowed statuses:

- `success`
- `empty`
- `partial`
- `error`

Semantics:

- success requires normalized evidence and no error code
- empty represents a successful no-evidence response and is not positive evidence
- partial requires evidence plus explicit diagnostics and reduced completeness/confidence
- error carries no evidence and confidence 0

Raw provider payload/body/copy retention is not authorized.

### Metrics

Task #68 metrics are bounded structural numeric evidence:

- max 64 metrics
- stable lowercase metric keys
- finite values only
- numeric range ±1e15
- optional bounded units
- lexical canonical order
- duplicate normalized keys rejected
- unknown metric fields rejected

### Observation identity and dedupe

A logical stream is defined by:

`source fingerprint + market fingerprint + category fingerprint + signal type`

Each normalized observation has a deterministic fingerprint/ID bound to exact request/source/scope/time/status/metrics/diagnostics/quality/completeness/confidence.

Pure batch behavior:

- default max 100 observations
- hard max 500
- exact duplicates collapse
- same stream + same observedAt + conflicting content fails closed
- mixed markets fail closed
- mixed categories fail closed
- output order and batch identity are deterministic
- no batch executor exists

## CI correction history

The initial Task #68 library behavior passed all runtime tests. CI #201 failed only at TypeScript typecheck because the test helper’s default metric array caused TypeScript to infer `unit` as mandatory, although Task #68 intentionally supports optional units.

The correction added an explicit local test input type with optional `unit`. No library/runtime behavior changed. CI #202 then passed schema validation, all tests, typecheck, and build.

## Deterministic tests

The dedicated Task #68 suite covers 15 cases:

1. closed capability markers
2. deterministic adapter request and exact Task #67 lineage
3. source/item mismatch and incomplete lineage fail closed
4. successful observation independent of metric input order
5. explicit empty semantics
6. explicit partial semantics and confidence reduction
7. explicit error semantics with no evidence/confidence
8. source/market/category/signal tamper rejection
9. malformed/future timestamp rejection
10. duplicate/malformed/out-of-range metric rejection
11. raw/unknown result field rejection
12. exact duplicate collapse
13. same-stream/same-time conflict rejection
14. deterministic bounded batch identity independent of input order
15. mixed-category batch rejection

## Safety certification

Task #68 capability remains contract/normalization-only:

- network collection authorized: false
- transport execution authorized: false
- provider enrollment authorized: false
- credential use authorized: false
- credential mutation authorized: false
- raw payload retention authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler: false
- batch executor: false
- autonomous worker: false
- retry loop: false
- provider writes: false
- public-site writes: false
- automatic transition: false
- schema mutation required: false

After the Replit engineering sync, sanitized read-only verification confirmed:

- Task #64 one-target dry-run execution gate: false
- configured competitor targets: 0
- Task #59 collection gate: false
- Task #59 evidence persistence gate: false
- public-site write gate: false
- no publish/redeploy occurred during verification
- no state modification occurred during verification

## Runtime distinction

The currently published production application remains the Task #65 application bundle. Task #68 is present in GitHub and the Replit workspace but was not separately published.

## Next engineering boundary

Recommended next milestone:

**Task #69 — Signal Collection Job Planning & Authorization Foundation v1**

The next layer should compose Task #67 refresh-plan identity and Task #68 adapter-request identity into a deterministic future collection-job packet without executing any source request.

Safe scope:

- deterministic collection-job ID/fingerprint
- exact source/market/category/signal/request/plan lineage
- bounded TTL/expiry and replay identity
- exact future authorization text
- fail-closed stale/tampered lineage preflight
- one-source/one-scope job semantics
- explicit no-credential/no-transport/no-network safety markers
- deterministic tests/docs

Still separately authorized and out of scope under generic `continue`:

- real provider/competitor network collection
- provider enrollment or credential/OAuth changes
- evidence persistence
- target activation/config mutation
- scheduler/batch executor/worker/retry-loop activation
- production DDL
- Task #64 execution
- Task #53/#54 execution
- provider/public-site writes
- publication/redeploy

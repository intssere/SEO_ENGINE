# Task #70 — Engineering Closeout

Task #70 — **Controlled Single-Job Signal Collection Execution Foundation v1** — is implemented, merged, CI-certified, and synchronized to the Replit workspace without publication.

## Canonical engineering release

- Issue: #114
- PR: #116
- exact tested PR head: `44d970ded1697e7ecb2e8c9d527b1eee2cad93ed`
- PR CI #213: success
- merged GitHub main: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- merged tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- post-merge main CI #214: success
- Replit workspace after engineering sync: exact same SHA/tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- publication/redeploy: **not performed**

## Files changed by Task #70 engineering

Task #70 changed exactly five engineering/docs files:

1. `artifacts/api-server/src/lib/signal-collection-execution.ts`
2. `artifacts/api-server/src/lib/signal-collection-execution.test.ts`
3. `artifacts/api-server/src/routes/signal-collection-execution.ts`
4. `artifacts/api-server/src/routes/index.ts`
5. `docs/task70-single-job-signal-collection-execution.md`

No production migration/DDL, provider connector enrollment, credential binding, observation/evidence persistence path, target configuration mutation, scheduler, batch executor, autonomous worker, retry loop, provider write path, or public-site write path was introduced or enabled.

## Control-chain role

Task #70 composes the existing bounded chain:

`Task #66 market/category identity`

→ `Task #67 source registry + selected refresh-plan lineage`

→ `Task #68 SourceAdapterRequest + supplied-result normalization`

→ `Task #69 exact expiring collection-job packet + authorization text`

→ `Task #70 default-off durable single-job execution bridge`

Task #70 adds execution mechanics only. It does not itself select a provider, configure credentials, authorize a network request, or persist resulting observations.

## Dedicated runtime gate

Task #70 introduces:

`SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`

Default/effective false returns before runner readiness, site lookup, durable reservation, runner invocation, or any possible source/network behavior.

The gate is only a capability gate. It never replaces exact per-job authorization.

## Exact authorization consumption

Task #70 accepts only the exact Task #69 authorization family:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

Execution independently reruns Task #69 preflight before durable reservation. Expired, stale, tampered, or lineage-inconsistent packets fail closed before the replay lock is consumed.

## Strict scalar execution scope

One Task #70 execution is exactly:

- one Task #69 job packet
- one source
- one market
- one category
- one signal type
- one Task #68 request
- one runner invocation
- one deterministic durable Task #70 execution identity

There is no batch mode, scheduler, autonomous worker, or retry loop.

## Durable replay lock

Task #70 reuses the existing `jobs` table. No migration or production DDL is required.

Job type:

`signal_collection_single_job_v1`

Lifecycle:

- reserve `pending`
- claim `active`
- terminal `completed` or `failed`

The deterministic UUID is bound to Task #70 version plus the Task #69 job ID, job fingerprint, and replay fingerprint.

`ON CONFLICT` never authorizes silent replay. Existing exact identity is treated as already consumed. A mismatched row under the same deterministic identity is an identity collision and fails closed.

Claim races fail closed. Uncertain reservation state or terminal-write uncertainty returns a manual-intervention outcome rather than an automatic retry.

## Production runner boundary

Task #70 defines an explicit source-runner capability contract:

- configured
- credentialReady
- networkReady
- sourceReadOnly
- providerWrites=false
- publicSiteWrites=false

The production/default runner is intentionally:

- configured=false
- credentialReady=false
- networkReady=false

Its default implementation performs no I/O and fails closed if invoked.

Engineering/CI tests inject fake in-memory runners only.

No source-specific provider runner, API-key binding, OAuth binding, or production credential use was configured in Task #70.

## Task #68 normalization handoff

A successful injected runner returns one bounded adapter result. Task #70 passes that result through canonical Task #68 normalization before terminal completion.

A successful receipt may retain only bounded normalized metadata/fingerprints such as observation identity, stream identity, status, observed time, metric/diagnostic counts, completeness, confidence, and positive-evidence status.

Task #70 does not retain:

- raw provider body/payload
- provider headers
- cookies
- tokens
- API keys
- OAuth credentials
- arbitrary runner exception text

Runner failure is reduced to a fixed failure category. Task #68 normalization rejection is also reduced to a bounded fixed failure category.

## Observation/evidence persistence boundary

Task #70 does **not** persist normalized observations or competitor evidence.

For Task #70 v1:

- observation persistence attempted: false
- evidence persistence attempted: false
- raw payload retained: false

A future persistence layer requires its own task and authorization boundary.

## Authenticated route boundary

Engineering code adds:

- `GET /api/signal-collection-execution/capability`
- `POST /api/signal-collection-execution/run`

Both require authenticated `admin` role.

The unsafe POST remains under the existing global authenticated-session, session-bound CSRF, and mutation-rate-limit protections.

There is no alternate-token or auth-bypass path.

## Deterministic/network-free test coverage

Task #70 engineering tests cover the required fail-closed semantics including:

- gate false short-circuit before DB/runner behavior
- deterministic execution UUID identity
- authorization mismatch before reservation
- expired/tampered Task #69 preflight rejection
- unavailable runner before reservation/network
- reserve/claim/complete happy path with fake runner
- one runner invocation only
- exact replay rejection as consumed
- identity collision failure
- claim-race failure
- runner failure terminal receipt
- Task #68 normalization failure terminal receipt
- terminal-write uncertainty/manual intervention
- zero observation/evidence persistence
- zero raw-content retention
- generic capability keeps live/persistence/write/scheduler authorization false

Engineering/CI performed zero live source requests.

## Sanitized Replit certification after engineering sync

Independent read-only Replit inspection confirmed:

- branch: `main`
- HEAD: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- cached `origin/main`: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree: clean

Effective safety state:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- configured competitor targets: `0`
- Task #70 scheduler enabled: false
- Task #70 batch executor enabled: false
- Task #70 autonomous worker enabled: false
- Task #70 retry loop enabled: false
- production/default Task #70 runner configured: false
- production/default Task #70 credential ready: false
- production/default Task #70 network ready: false

The inspection changed no state and caused no provider/public-site write.

## Runtime distinction

The currently published production application remains the certified Task #65 application bundle:

- source: `1f2a2a9cefd07676b0569b93401bd116ff995fa4`
- tree: `33b049d3bc35acaaef508db3432aabd8b2522de8`

Task #70 was **not** published as part of engineering closeout.

No real Task #70 source request occurred.
No production runner was configured.
No credentials were used or changed.
No observation/evidence persistence occurred.
No scheduler/worker/batch/retry loop was enabled.
No production DDL occurred.
No provider/public-site mutation occurred.

## Next boundary — read-only Task #70 prepublication certification

After this docs-only closeout PR is exact-head CI-green, merged, post-merge CI-green, and docs-only exact-synced to Replit, the next safe phase is read-only Task #70 prepublication certification.

That phase may verify:

- exact canonical GitHub/Replit SHA/tree alignment
- clean `0/0` Replit state
- tests/typecheck/build/bundle markers as appropriate
- development/production schema parity without DDL
- auth objects and auth configuration
- all Task #70/competitor/public-write gates closed
- runner still unconfigured
- production still serving Task #65
- no unexpected job/evidence/request/write deltas

Publication/redeploy is **not** authorized by generic `continue` and requires separate explicit authorization.

A later first real signal-source run additionally requires a source-specific read-only runner review, provider/credential-boundary review, fresh Task #67 refresh plan, fresh Task #68 request, fresh Task #69 packet, exact Task #69 authorization, and separately authorized temporary Task #70 gate deployment if needed.

Observation/evidence persistence remains separately gated even after a successful real read.

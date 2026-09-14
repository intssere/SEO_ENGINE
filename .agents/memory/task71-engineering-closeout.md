# Task #71 — Engineering Closeout

Task #71 — **Google Search Console Read-Only Runner Foundation v1** — is implemented, merged, CI-certified, and synchronized exactly to the Replit workspace without publication or live provider configuration.

## Canonical engineering release

- issue: #119
- engineering PR: #120
- exact tested PR head: `c8788667f77ff028c8f950c233c80a1dbca524b1`
- PR CI #219: success
- merged GitHub main: `abb62e1a95840b0e4b5a4bee63c9440c3d458e1a`
- merged tree: `40c9cf3729e4b7c35c2d4d147f315e977a8b3d39`
- post-merge main CI #220: success
- Replit workspace after engineering sync: exact same SHA/tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- new local commit beyond canonical main: false
- publication/redeploy: **not performed**

## Engineering diff

Task #71 engineering added exactly three files:

1. `artifacts/api-server/src/lib/gsc-search-analytics-runner.ts`
2. `artifacts/api-server/src/lib/gsc-search-analytics-runner.test.ts`
3. `docs/task71-gsc-search-analytics-runner-foundation.md`

No existing Task #70 execution route, runtime gate, auth path, schema, migration, environment configuration, deployment configuration, provider connector, target configuration, or public-site write path was modified.

## Control-chain role

Task #71 supplies the first source-specific runner foundation after the existing controlled chain:

`Task #66 market/category identity`

→ `Task #67 reviewed source + refresh plan`

→ `Task #68 adapter request + bounded observation normalization`

→ `Task #69 exact expiring collection-job packet + authorization`

→ `Task #70 default-off durable single-job execution + replay lock`

→ `Task #71 default-off GSC Search Analytics runner foundation`

Task #70 remains the authority for execution gating, exact authorization consumption, durable reservation, one-runner invocation, and replay rejection. Task #71 does not create a second execution path.

## Selected source

The selected first runner foundation is Google Search Console Search Analytics using the reviewed Task #67 first-party model.

Required source identity is intentionally narrow:

- source key: `google-search-console-search-analytics`
- source class: `first_party`
- trust class: `first_party_authoritative`
- collection mode: `provider_api`
- provenance complete: true
- manually reviewed: true
- v1 signal: `keyword`

Non-GSC or mismatched Task #67/#68/#69/#70 lineage fails closed.

## Least-privilege credential boundary

The only future Google OAuth scope represented by Task #71 is:

`https://www.googleapis.com/auth/webmasters.readonly`

Engineering does not create, store, bind, refresh, or use any OAuth client secret, access token, or refresh token. Application login/OIDC is not treated as Search Console API authorization.

No real Google account or Search Console property was enrolled or authorized.

## No built-in network transport

Task #71 intentionally introduces no Google SDK, no generic HTTP client, no built-in `fetch`, no provider endpoint executor, no arbitrary URL/method surface, and no credential lookup.

The runner accepts only a narrow injected Search Analytics transport interface. Engineering/CI tests use a fake in-memory transport. Production/default readiness remains closed because no live transport or credentials are supplied.

## Bounded request model

Task #71 v1 supports only a bounded Search Analytics model:

- domain-property identity: `sc-domain:<domain>`
- dimensions: `query`, `page`
- filter operators: `equals`, `contains`
- maximum date span: 31 days
- maximum filters: 5
- maximum rows per page: 5,000
- maximum pages per job: 2
- maximum modeled rows per job: 10,000
- timeout descriptor maximum: 10 seconds
- aggregate/no-dimension requests: one page only

Request dimension/filter ordering is canonicalized and deterministically fingerprinted.

## Task #68 normalization boundary

Only modeled numeric evidence crosses the Task #68 boundary:

- clicks
- impressions
- CTR
- position

Query/page dimension strings are validated but discarded before the Task #68 result. Raw Google payloads, headers, cookies, tokens, arbitrary provider text, and undocumented fields are not retained.

Status mapping is conservative:

- aggregate non-empty response → `success`
- valid zero-row response → `empty`
- dimensional/top-row output → `partial` with `gsc_top_rows_non_exhaustive`
- configured page cap reached → `partial` with `gsc_page_cap_reached`
- modeled provider/transport failure → sanitized `error`

Dimensional Search Analytics data is never silently treated as exhaustive evidence.

## Readiness remains fail-closed

Source-specific readiness defaults remain:

- configured: false
- credentials ready: false
- network ready: false
- live execution authorized: false

Task #70 runner capability cannot become ready unless all required Task #71 readiness/authorization inputs are separately supplied.

Task #71 engineering supplies none of them.

## Deterministic test certification

PR CI #219 passed on exact head `c8788667f77ff028c8f950c233c80a1dbca524b1`.

The CI validator passed:

- legacy schema validation
- focused Task tests
- all current workspace package tests
- TypeScript typecheck
- build

Tests cover default-closed readiness, deterministic request construction, strict source/lineage/bounds checks, success/empty/partial/error normalization, quota/rate sanitization, unknown/raw field rejection, non-GSC rejection, and Task #70 replay-lock authority with a fake transport.

Post-merge main CI #220 also passed on exact merge `abb62e1a95840b0e4b5a4bee63c9440c3d458e1a`.

Engineering/CI made zero live Google/provider requests.

## Sanitized Replit certification after engineering sync

Independent read-only Replit inspection confirmed:

- branch: `main`
- HEAD: `abb62e1a95840b0e4b5a4bee63c9440c3d458e1a`
- tree: `40c9cf3729e4b7c35c2d4d147f315e977a8b3d39`
- cached `origin/main`: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree: clean
- new local commit beyond canonical main: false

Effective safety state remained:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- Task #71 configured=false
- Task #71 credentialsReady=false
- Task #71 networkReady=false
- Task #71 liveExecutionAuthorized=false
- scheduler=false
- batch=false
- autonomous worker=false
- retry=false

The Git synchronization and inspection did not publish/redeploy, modify environment/database/credentials/targets/provider/public-site state, or make a live provider/competitor request.

## Production distinction

The currently published production application remains the certified Task #70 production bundle recorded in `task70-production-closeout.md`:

- published source: `d43629dc8b4c50bff1088fad6c74c15825ee0373`
- published tree: `9b5cc9b2e1153cba82f13859829544cff7581127`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`

Task #71 engineering has **not** been published.

No live GSC request occurred.
No Search Console credential was configured or used.
No Task #70 production execution occurred.
No observation/evidence persistence occurred.
No scheduler/batch/worker/retry loop was enabled.
No production DDL occurred.
No provider/public-site mutation occurred.

## Next boundary

After this docs-only closeout is CI-certified, merged, and exact-synced to Replit, the next safe phase is **read-only Task #71 prepublication certification**.

That phase may verify exact GitHub/Replit lineage, build/test status, all execution/write gates closed, Task #71 readiness still false, no real credential/provider binding, no unexpected Task #70 jobs/evidence/request activity, schema/auth sanity, and the currently published Task #70 production distinction.

Task #71 publication/redeploy requires separate explicit authorization.

A first real Search Console read requires a later separately authorized provider/credential boundary, a reviewed property binding, fresh Task #67/#68/#69 lineage, exact Task #69 authorization, and separately authorized Task #70 execution-gate behavior. Observation/evidence persistence remains separately authorized even after a successful read.

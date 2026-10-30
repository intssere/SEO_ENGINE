# PILOT-01 — UGP/CVI isolated integration rehearsal contract

**Scope:** Source-only specification for a disposable, no-network, mock-backed integration rehearsal. **No live pilot authorization.**  
**Baseline:** canonical `main` `519c82052f8b186350227b844aa0926548172386` (post-merge CI #41079348887 SUCCESS); UGP `initiative-universal-growth-platform` `7a209770c85a76ebe0709c7e063feec5e746bbfd`; CVI-OPS-02 PR #1234 head `b9142eb1cbdcd31b7de47a6c6f20d795b70a7613` draft/unmerged at inspection.  
**Parents:** #1181 integrated pilot, #1159 production DB certification, #1143 CVI authorization, #1152 startup policy, #1061 UGP job transport.  
**Policy:** Owner wants autonomous analysis and recommendations eventually, but **every live DiamondShelf.us change must require explicit approval**. Neither this document nor green CI permits startup, crawl, OAuth, external provider read, AI proposal generation, or publishing.

## Verified source interfaces and integration risks

| Interface | Source evidence | Unresolved integration gate |
| --- | --- | --- |
| Application startup | UGP `artifacts/api-server/src/index.ts` calls `app.listen` after a log-only missing-`DATABASE_URL` branch. Draft CVI-OPS-02 inserts `assertCviStartupDatabaseBinding(process.env)` before the DB identity check and listen. | Reconcile draft guard with UGP branch and certify a fail-closed deployed startup policy; do not treat the draft as merged. |
| Queue resume | UGP `startup-runtime.ts` requires both a nonblank `DATABASE_URL` and `PILOT_INGESTION_QUEUE_RESUME_ENABLED=true`. | Prove default-off and unknown-environment behavior, including no startup background task. |
| Pilot enqueue / claim | UGP `pilot-orchestration.ts` uses PostgreSQL job rows, transaction-scoped advisory lock for enqueue, stale-run failure marking, and a pending→active claim. | Need disposable fencing/lease and concurrent worker/timeout tests; do not infer production-safe exactly-once semantics. |
| Evidence producers | UGP `pilot-runner.ts` defines bounded crawl, GSC and Shopify provider observation contracts, baseline certification and diagnostics. | Provider read, partial/failure, evidence provenance and DB write scopes must remain separately authorized. |
| CVI security | #1143 tracks scoped edit/review grants, auth fail-closed behavior, global lock order, migrations and handler tests. | Never enable site edits or approvals through an unverified global role or dormant ACL grant. |
| User approval boundary | #1181 owner policy forbids automatic live site changes. | Proposed edits must be inert artifacts; approval must be exact-site, exact-diff, one-operation, auditable, revocable and never implied by analysis authorization. |

## Disposable integration harness — required interfaces

Harness must use **in-memory stubs and mock process executions only**; it must not instantiate a PostgreSQL client, listen on a public port, obtain or inspect secrets, call external providers, spawn actual jobs, or perform a Diamond Shelf request. Import production pure functions only where side effects are intercepted and proven absent.

Inputs: `TenantContext{tenantId,siteId,domain}`; `EvidenceReceipt{source,sourceVersion,observedAt,scope,contentHash,synthetic:true}`; `AnalysisResult{findings,confidence,provenance}`; `ProposalDraft{siteId,sourceReceiptIds,diffHash,requiresOwnerApproval:true}`; `JobClaim{runId,workerId,leaseGeneration,expiresAt}`; `Policy{allowReads:false,allowDbWrites:false,allowSiteWrites:false,allowAi:false}`.

Those interfaces are **proposed fixture contracts**, not representations of current exported TypeScript types. Map them to verified APIs and capture incompatibilities in the implementation rehearsal PR. All mock receipts must visibly identify synthetic provenance.

## Mandatory test table (rehearsal acceptance)

| ID | Fixture / failure | Required assertion |
| --- | --- | --- |
| R01 | Production/staging or unclassified environment with no/blank DB binding | No `listen`, no queue resume, no network/DB IO. |
| R02 | Explicit local test environment with no DB | Mock-only test pathway works, with no production surface or side effect. |
| R03 | Inactive/mismatched Diamond Shelf site UUID or cross-tenant evidence | Fail closed before producing an accepted finding, proposal or job. |
| R04 | Startup resume flag omitted/false despite queued work | Zero attempted resumes/launches. |
| R05 | Two workers claim one pending job | One fenced owner; loser cannot emit results or side effects. |
| R06 | Lease expiration and late original worker | Stale generation cannot commit; status remains auditable. |
| R07 | Repeated or interrupted job | Idempotent outcome and provenance; no duplicate proposal. |
| R08 | Provider unavailable, 429, timeout or partial response | Stable diagnostic categories; no fabricated success or whole-site certification. |
| R09 | Real-data label missing on synthetic receipt | Reject or visibly label as synthetic; never count as live SEO evidence. |
| R10 | AI/proposal/write feature flag absent or false | No model invocation, no publication, no remote mutations. |
| R11 | Proposal created by mock analyzer | Approval remains pending; cannot invoke Shopify write without exact separately approved grant. |
| R12 | Owner approves different site or diff, grant expired/revoked | No write; record denial without credentials or sensitive data. |
| R13 | Cancellation/kill-switch during acquisition or analysis | No subsequent outbound calls, no retry storm or unaudited continuation. |
| R14 | Database identity or schema ledger unknown | Never substitute mock success for Production G1–G5 evidence. |

## Exit evidence and stop criteria

For each test, record exact branch/head SHA, input fixture hash, test command, result, invocation counters (network/SQL/AI/Shopify must be **zero**), assertion output, UTC evidence time, reviewer and any unresolved gap. Require independent review and exact-head approval for any subsequent PR merge. **P1 disposable mock success does not authorize P2 real crawl**.

Stop and classify `BLOCKED` on environment/source provenance mismatch, live I/O observation, unverified site binding, missing ownership or job fencing, invalid authorization controls, unbounded retries, unexpected credential access, or inability to demonstrate no site writes.

## Next engineering action

Produce a **separately scoped source-only/mock-backed implementation PR** against an explicit integration base, after resolving CVI-OPS-02 branch and import compatibility. Do not change the existing UGP/CVI branches or merge their pending PRs implicitly. The current document is an acceptance contract only.

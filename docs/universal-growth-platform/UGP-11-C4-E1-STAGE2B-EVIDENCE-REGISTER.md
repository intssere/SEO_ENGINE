# UGP-11.C4-E1 — Stage 2B Evidence Register (offline proposal)

**Status:** Documentation-only preparation. No test execution, database access, package installation, schema changes, worker start, deployment, provider call, or merge authorized by this document.

**Governing sources:** [owner-controlled offline governance](UGP-11-C4-E1-OWNER-CONTROLLED-OFFLINE-GOVERNANCE.md), [Stage 2A readiness](UGP-11-C4-E1-STAGE2A-OFFLINE-READINESS-CONTRACT.md), [A01–A14 parity protocol](UGP-11-C4-TRANSPORT-PARITY-ACCEPTANCE-PROTOCOL.md), GitHub issues #1061 and #1054.

**Preparation baseline:** `initiative-universal-growth-platform@1df4e8dc6ab42ad0976fa353ccb9cc6ad5420220`; baseline can advance and must be re-frozen at any future execution gate. The current document captures **required evidence**, not successful test results.

## 1. Acceptance data model — required for EACH candidate and scenario

Each result record must contain `test_id`, `candidate_id` (A native / B pg-boss), immutable source SHA, runner SHA, exact package lockfile checksum, Node and PostgreSQL versions/image digest, approved isolated target identifier, deterministic fixture seed/reset identifier, synthetic tenant/site/work identity, P9 control revision and trust-source classification, fault injection coordinates, observed event trace, database transaction/fence/SQLSTATE when relevant, observer freshness proof, local mock effect-attempt count, performance measurements, teardown evidence, reviewer disposition and owner decision.

Disposition enum: `PASS`, `FAIL`, `SKIPPED`, `INCONCLUSIVE`, `NOT_RUN`. Only independently observable, complete `PASS` evidence may qualify. No aggregation may promote missing cases to PASS; provider dispatch and production authority remain false even after a synthetic PASS.

**Parity requirement:** identical inputs, seeds, initial state, time model, workload budgets, injection points and observation criteria for both candidates. Candidate-specific transport internals may vary but cannot relax any invariant.

## 2. A01–A14 evidence requirements

| ID | Independent observable evidence | Explicit fail-closed criterion |
| --- | --- | --- |
| A01 | P9 issuer absent; candidate claim attempts and mock dispatch counters | Any accepted operational claim or dispatch from fixture-only evidence |
| A02 | Two matching concurrent producers, one conflicting identity; immutable rows/tenants | Duplicate work, conflicting replay admitted, or tenant crossing |
| A03 | A epoch N then B epoch N+1; stale A heartbeat/settlement traces | Any stale-fence success, mutation or dispatch |
| A04 | Concurrent pause, drain and kill; committed control revision and lock order | New claim/dispatch after committed deny; kill unlatches |
| A05 | Durable pre-dispatch claim and independently observed zero-effect history | Unobserved effect inferred absent or automatic dispatch triggered |
| A06 | COMMIT ack loss before/after boundary; fresh independent DB observation | Optimistic success, blind retry or stale-snapshot conclusion |
| A07 | Local spy shows external effect might have started; final classification | Second dispatch or outcome other than manual intervention |
| A08 | Pre-marker snapshot, separately committed marker, new observer transaction | Old snapshot treated as current; unavailable evidence becomes authorization |
| A09 | >1,000 paginated synthetic items, missing page and invalid/deleted cursor | Incomplete inventory interpreted as proof of absence |
| A10 | Handler exceeds time budget while lease expires/control changes | Timeout treated as proof of no side effect; duplicate dispatch |
| A11 | Disposable v45→v46 interrupted index build, schema+index validity inspection | Version 46 called complete with invalid/unconverged indexes; unsafe rollback |
| A12 | Synthetic maintenance backlog and simultaneous claim/observer load; lock/WAL/xmin traces | Unbounded contention, resource caps exceeded or destructive read API |
| A13 | Expired/forged envelope, malformed tenant/site/scope, poisoned payload | Acceptance, cross-tenant read/write or secrets in logs |
| A14 | Cold import/construction/init with DB/socket/scheduler/worker/provider spies | Any unauthorized implicit startup, migration, enqueue or external effect |

Note: the repository's existing disposable PostgreSQL fixture tests are supporting design evidence, **not** new two-candidate A01–A14 results.

## 3. Performance acceptance contract (values not invented)

Before any authorized test, owner and appropriate technical reviewer must document independently justified numeric thresholds and budgets for:
- p50/p95/p99 enqueue-to-claim latency under named concurrency and dataset sizes;
- backlog-age distribution and duplicate-work ceiling;
- PostgreSQL lock wait, transaction duration and statement timeout;
- WAL/index/retention and memory growth ceilings;
- bounded recovery time, maximum attempts, total run duration and hard stop conditions.

**Threshold source:** [MISSING — application capacity/reliability requirements and signed reviewer rationale]. A test performed before thresholds are frozen cannot retrospectively be certified by choosing thresholds to fit results.

## 4. Disposable environment evidence index — all UNVERIFIED

| Gate | Required artifact / authority | Current disposition |
| --- | --- | --- |
| Target | Dedicated account/project/host, named owner/operator, exact disposable DB/schema and independent positive isolation proof | NOT_VERIFIED |
| Network | No production/shared DB/provider routes, no real credentials, blocked provider egress with tested deny trace | NOT_VERIFIED |
| Supply chain | Node patch, PG exact version/image digest, pg-boss 12.38.0 upstream pin plus published distribution hash, resolved lockfile/SBOM/advisories/license | NOT_VERIFIED |
| DB roles | Separately scoped DDL migration, runtime DML and read-only observer credentials; effective grants and search paths | NOT_VERIFIED |
| Migration | Complete 45→46 partition inventory/SQL, async index convergence, lock budgets, interrupted migration/restore and rollback plan | NOT_VERIFIED |
| Fixture | Complete synthetic datasets, deterministic seeds and injected fault matrix for both candidates | NOT_VERIFIED |
| Safety | Mock-only effects, issuer deny-first, immutable envelopes, no P9 operational trust, no production secrets | NOT_VERIFIED |
| Review | Owner-controlled offline acceptance; specialist DB/security/reliability/privacy signoffs where retained for the high-risk experimental scope | NOT_VERIFIED |
| Teardown | Named teardown operator, object/process/connection/role inventory, log custody and destruction receipts | NOT_VERIFIED |
| Authorization | New project-owner instruction naming exact scope, environment, versions, allowed network/DB operations, duration and stop rules | NOT_GRANTED |

Existing SEO ENGINE customer staging, P12.2 fixtures and live PostgreSQL services are not approved C4 disposable targets. A named test project proposal is not proof of provisioned isolation.

## 5. Proposed execution sequence — future authorization ONLY

Gate 0: freeze target source SHA, approvals, reviewed test runner, fixed thresholds and safety assertions. Gate 1: independently verify disposable target identity and denied production/provider connectivity. Gate 2: verify package/runner provenance and DB privilege separation before permitted installs. Gate 3: perform separately approved migration-only tests with interruption/restore controls. Gate 4: run paired deterministic A01–A14 fixtures and collect traces. Gate 5: independently observe schema/index completion and job/effect counters. Gate 6: teardown with independent evidence; publish a fail-closed architecture decision record.

If target, observations, package integrity, network isolation, resource budget, reviewer signoff or authorization is uncertain, **STOP** and report `NOT_CERTIFIED`. Do not use generic `continue` as authority to proceed.

## 6. Current disposition

`SOURCE_ONLY_READINESS_REGISTER_PREPARED`; `STAGE_2B_EXECUTION_NOT_AUTHORIZED`; `CANDIDATE_PARITY_NOT_RUN`; `P9_TRUST_NOT_GRANTED`; `NO_MERGE_OR_DEPLOYMENT_AUTHORITY`.

# UGP-11.1 — Durable Job Transport Adoption and Safety Contract

**Scope:** architecture, source-backed gap analysis and acceptance gates only. **Runtime admission: NOT_GRANTED.**  
**Verified starting commit:** `32a72d4378a84c8a15748f21791fa5caea2f8e2a` on `initiative-universal-growth-platform`.

## 1. Source inventory and gap

| Existing source | Certified behavior | Remaining transport gap |
|---|---|---|
| `artifacts/api-server/src/lib/read-scheduler-queue.ts`, `docs/p9-1-read-scheduler-queue-architecture.md` | fixed, deterministic P9.1 due-slot and proposed read intent | no durable enqueue, worker claim or transport acknowledgement |
| `docs/p9-5-failure-retry-dead-letter-idempotency.md` | deterministic attempt/retry/dead-letter review; expiry-bound and fail closed | no persisted transport attempts or dead-letter reconciliation |
| `docs/p9-6-worker-observability-controls.md` | deterministic P9.6 pause, drain, kill, resume/heartbeat semantics | no atomic mapping of control and transport claims |
| `docs/universal-growth-platform/ROADMAP.md` | UGP-11.1 transport adapter, UGP-11.2 control mapping, UGP-11.3 schedules | none of these steps grants operational activation |

These sources are control-plane artifacts, not authorization to execute work. Existing Task #69/#70, P2, article publication and outreach guardrails remain authoritative.

## 2. Adoption decision: candidate, not selection

Evaluate `pg-boss` against a thin SEO ENGINE-owned `JobTransport` port because the stack uses TypeScript/PostgreSQL. **Dependency installation is deferred.** Record the precise candidate version, published license, maintenance/security posture, Postgres version and extension compatibility, queue schema and migration lifecycle, worker cancellation guarantees, scheduling/retry/archival behavior, telemetry, data retention, and operational failure modes before choosing it.

A transport must be replaceable without rewriting P9 policies. No version or license claim is certified by this document. If the candidate cannot meet safe claim fencing or fail-closed recovery, evaluate a minimal DB-backed adapter or another maintained transport as a separate decision.

## 3. Exact adapter responsibilities

A future transport adapter may implement these operations only after isolated review and tests:

- `enqueue(admittedWorkEnvelope)`: durable deduplicated placement **only after** an independently issued fresh admission, never from a bare P9.1/P9.5 intent;
- `claim(queueScope, workerIdentity)`: short leased exclusive claim with fencing token and exact site/tenant scope;
- `heartbeat(claimIdentity, expectedFence)`: bounded renewal; mismatch fails closed;
- `complete(claimIdentity, expectedFence, receipt)`: atomic terminal accounting, never a declaration of external side-effect success without separate verification;
- `releaseOrDeadLetter(claimIdentity, expectedFence, classifiedFailure)`: adhere to original P9.5 expiry, capped attempts, quarantine/uncertain-write rules;
- `inspect` and `reconcile`: read-only evidence and reconciliation; no synthetic permission.

Transport receipts are not policy grants, human approvals, provider receipts, execution success, or verification evidence.

## 4. Mandatory immutable work envelope

A future admission envelope must bind version, site and tenant identifiers, job class, exact upstream object IDs/fingerprints, content/resource/connection scope, source branch/contract version, original schedule slot and expiry, P9.5 idempotency identity, P9.6 durable control revision/fingerprint, exact admissible executor kind, issued/expiry instants, and separately authorized capability markers. Do not infer absent fields or obtain privileges from payload-provided boolean flags.

The initial executable allowlist must be reviewed **per class**. Content publication, provider mutation and outreach send default **DENIED**; customer-selected schedules alone grant no write authority.

## 5. Claim-time admission and safety

1. Reconstruct and validate exact source lineage. Reject stale or conflicting versions.
2. Under transactionally ordered locks, recheck tenant/site boundary and **durable P9 control state**; missing control state is closed.
3. Require `running` for new claims, honoring `kill > drain > pause > running` and latched kill.
4. Check window expiry, bounded concurrency, per-site quotas, suppression where relevant, and exact deterministic idempotency key.
5. Persist claim and fence before any external side effect; enforce unique active ownership and compare-and-swap acknowledgements.
6. Before each execution/dispatch, separately re-evaluate job-specific authorization and fresh external state. Expiration or lost lease closes new dispatch.
7. Any possible external side effect with uncertain result must enter `manual_intervention_required`; never auto-retry unknown sends/publishes/writes.
8. Reconciliation must never manufacture P9.1 missed slots, reset P9.5 budgets, revive dead-letter entries, or clear a kill latch.

Pause blocks new claims; drain blocks new claims and waits for in-flight completion; kill stops new admission and treats started/uncertain work as reconciliation-required, not automatically safe. Worker shutdown and DB disconnection must not cause implicit replay of side-effectful work.

## 6. Failure matrix required before implementation

| Failure | Required behavior |
|---|---|
| duplicate enqueue or concurrent claim | exact replay deduplicated; conflicting identity rejected |
| worker crash before dispatch | verified never-started claim can be recovered within original window after fresh policy check |
| worker crash after possible dispatch | quarantine/manual intervention; no blind retry |
| lease expiry/clock skew | stale worker fenced; DB-clock authoritative where persisted |
| PostgreSQL outage or uncertain commit | stop dispatch and fail closed; reconcile from durable evidence |
| control pause/drain/kill races | lock ordering and control epoch recheck prevent new claim/dispatch |
| window expiry | no catch-up and no new attempt; review/dead-letter according to P9.5 |
| poison item or malformed payload | reject/quarantine with bounded diagnostic metadata, no raw credentials |
| provider read timeout | retry only if classification and source-specific policy permit |
| external write/send outcome unknown | manual intervention, never an automatic retry |

## 7. Ordered delivery increments

- **11.1A (this PR):** architecture and adoption contract; no code or schema changes.
- **11.1B:** pure TypeScript transport port, canonical envelope, strict validators, in-memory deterministic fake and contract tests; no runtime integration.
- **11.1C:** dependency assessment and pinned-version adoption decision with license/security/migration analysis, against fresh source.
- **11.1D:** explicit-URL isolated Postgres transport adapter and disposable-DB concurrency/fencing tests; schema is engineering-only.
- **11.2:** atomic mapping to P9.5/P9.6 durable controls, claim/reconcile/kill and DLQ safety proof.
- **11.3:** separately approved schedule-class admission, staged read-only pilot and runtime certification; mutation/send/publication paths remain disabled.

Do not deploy, start a worker, connect production credentials, apply production DDL, grant write/send capability or enable timers on any of the above documentation/engineering merges.

## 8. Acceptance checklist

- [x] P9.1/P9.5/P9.6 and UGP roadmap boundaries inspected.
- [x] Candidate transport separated from authority.
- [x] Immutable work-envelope and fencing requirements recorded.
- [x] Failure/uncertain-side-effect matrix defined.
- [x] Ordered isolated increments and explicit authorization boundaries documented.
- [ ] UGP-11.1B adapter contract implemented and tested.
- [ ] pg-boss exact version/license/security review and candidate decision completed.
- [ ] Disposable Postgres failover/concurrency/lease tests passed.
- [ ] P9 durable control mapping implemented and certified.
- [ ] Any runtime activation independently authorized and certified.

**Current disposition:** UGP-11 design initiated; transport not selected, implemented or enabled. Production admission `NOT_GRANTED`.

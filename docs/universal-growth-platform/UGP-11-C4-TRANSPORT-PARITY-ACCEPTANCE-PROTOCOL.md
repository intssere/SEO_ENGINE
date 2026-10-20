# UGP-11.C4 — Comparative disposable transport acceptance protocol (design only)

**Baseline:** `initiative-universal-growth-platform` at `6b58058a98d50cbda02c1cc1a2b0f5fc9b96a078` (after CVI PR #1182); base push CI [#39271990363](https://github.com/intssere/SEO_ENGINE/actions/runs/39271990363) passed. **Scope:** prospective parity-test *specification*, not execution. **Issue #1061:** OPEN. **Independent trust #1054:** OPEN. **Decision:** no transport selection, package installation or runtime admission.

## Preconditions and required recorded evidence (all not yet satisfied)

A responsible independent DB/security reviewer must approve a **specific disposable-only** environment, named owner, tenant isolation, exact Node/PostgreSQL versions, isolated schema and database, package artifact/hash/lockfile/SBOM, DDL migration plan, teardown and rollback. No production/shadow/Railway/P12.2 credentials or databases are eligible. Approve the action and exact scope separately *before* running an experiment. The C2 independent issuer must remain unconfigured/deny-only in this workstream; fixture-signed evidence cannot issue positive P9 claims.

## Comparable test harness and pass/fail

For every test, run the same synthetic immutable work envelope, timestamp model, P9 control sequence, injection point and expected terminal classification against (A) the **engine-owned thin PostgreSQL fixture/adapter** and (B) an isolated, exact-version **pg-boss wrapper** *only after separate explicit authorization*. Every scenario records code commit, package and engine version, fixture reset identity, transaction ID/DB clock, job/fence/control revision, SQLSTATE where applicable, event trace, side-effect counter and teardown evidence. Simulate providers with a local no-network spy recording dispatch attempts; **zero real external dispatch is mandatory**.

| Case | Setup and fault | Required pass invariant |
|---|---|---|
| A01 no issuer | No independent P9-issued trust/grant, only a fixture-looking envelope | **Deny claim and dispatch**, no new positive runtime authority |
| A02 duplicate producer | Two same-fingerprint producers concurrently enqueue; third conflicts on immutable identity | Exact replay deduped; incompatible replay denied; no crossed tenants |
| A03 lease fencing | Worker A claims epoch N, expires; B reclaims epoch N+1; A heartbeats/completes afterward | A's stale operations fail CAS; no write/send dispatch follows stale fence |
| A04 control ordering | Race pause/drain/kill with claim and durable revision change | Control-first lock order; kill latched, no new claim/dispatch after committed deny |
| A05 pre-dispatch crash | Crash after durable claim but with independently confirmed never-started side effect | Recovery can only be *classified* as eligible for future separately approved work, not auto-dispatched |
| A06 ambiguous commit | Break connection before/after COMMIT acknowledgment | No optimistic success or blind retry; independent read-only fresh reconciliation; otherwise manual intervention |
| A07 possible side effect | Local spy indicates dispatch may have started before timeout/crash/kill | `manual_intervention_required`; **no automatic second dispatch** |
| A08 observer boundary | Read-only snapshot begins before marker, marker commits concurrently | Old snapshot cannot prove fresh marker; new transaction required; unavailable fails closed |
| A09 partial inventory | >1,000 synthetic rows with paginated reads, including deleted cursor/missing page | Incomplete enumeration marked unavailable; missing item never inferred absent |
| A10 handler overrun | Synthetic task exceeds time budget, kill/lease expires | Worker signal/timeout not treated as proof of no side effect; no duplicate dispatch |
| A11 migration interruption | In approved disposable schema only, interrupt 45→46 during async index build | Record exact schema/version/index validity; no silent success, approved teardown/restore path |
| A12 background maintenance | Large synthetic retention backlog and simultaneous read/claim workload | Bound transaction/lock budget with measured trace; destructive APIs absent from read-only surface |
| A13 poison & tenant | Malformed, cross-site, cross-tenant, expired slot or forged scope | Quarantine/deny; no credentials or private payloads in logs |
| A14 no automatic runtime startup | Import module and initialize application boundary with no explicit approved start | No implicit DB install, migration, scheduler, worker, enqueue, retry or provider send |

## Minimum nonfunctional acceptance

- Measure p50/p95/p99 enqueue-to-claim latency, backlog aging, duplicate rate, memory, DB transaction duration, lock wait, WAL and index/retention impact under *identical* synthetic load. **Do not invent SLO thresholds**; reviewer must pre-register thresholds from the application's actual constraints before evaluation.
- The control-first lock order, original schedule expiry, bounded P9 attempt ceiling and irreversible kill must hold independently of transport. Queue receipts and pg-boss warnings cannot substitute for P9 authority.
- Capture the precise SQL/schema and migration/rollback artifacts for both implementations; record failure cases and test flakiness, not only green CI.
- A FAIL, SKIPPED, missing provider-spy trace, ambiguous outcome, or unknown version is **NOT CERTIFIED**, never an implied PASS.
- Publish an evidence-indexed architecture decision record with operator, independent security/DB reviewer, privacy/retention reviewer, cost estimate and risk acceptance before choosing a candidate.

## Explicit stop/go separation

**This document authorizes no tests**, dependencies, schema creation, migrations, Railway access, secret reads, workers, schedules, claims, provider calls, retries, deployment, `main` change, or production admission. It is a review-ready contract for a future narrowly scoped approval. Even a full isolated PASS does not close #1054 or allow writes/sends/publication. Until independently authorized and certified, **DEFER SELECTION / NO OPERATIONAL AUTHORITY**.

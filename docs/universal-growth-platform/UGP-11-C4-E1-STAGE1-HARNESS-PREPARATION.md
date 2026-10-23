# UGP-11.C4-E1 — Stage 1 isolated experiment harness preparation

**Status:** DESIGN ONLY / NOT EXECUTED / NO TRANSPORT SELECTION. **Authorization:** user explicitly approved Stage 1 preparation only on 2026-10-20, excluding dependency installation, database access, migrations, workers, providers, deployment, `main` modification and merge.

**Original authorized starting reference:** `intssere/SEO_ENGINE` `initiative-universal-growth-platform@e66269acf7dacb556b70d4fe920f2050a3ee7d62`, PR #1184 post-merge CI [#39394094173](https://github.com/intssere/SEO_ENGINE/actions/runs/39394094173) success. **Preparation branch:** `workstream/ugp-11-c4-e1-stage1-harness-preparation`. Trust approval #1054 and transport evaluation #1061 remain open.

**Current refreshed PR base:** `initiative-universal-growth-platform@433199971576a85a1ffece6d4cec395fbf1ebb85` (after separate CVI PR #1189). The scope and A01–A14 mapping are unchanged; prior review of #1188 is historical evidence and must be reconfirmed on this refreshed draft. No Stage 2 approval is implied.

## Objective and scope

Prepare reproducible *design contracts* for a future independently approved disposable-only experiment comparing an engine-owned thin PostgreSQL adapter with a pinned-version pg-boss wrapper. This increment does not introduce code capable of connecting to databases, enqueuing or claiming work. The already merged [comparative acceptance protocol](UGP-11-C4-TRANSPORT-PARITY-ACCEPTANCE-PROTOCOL.md) remains normative for A01–A14; this document translates it into harness boundaries, fixtures, stop conditions and evidence artifacts.

## Proposed harness boundary (NOT IMPLEMENTED)

A future implementation must separate four layers:

1. **Pure scenario definition:** immutable, non-executable synthetic scenario descriptions with `case_id`, seed, initial state, ordered events, fault injection, expected classification, forbidden transitions and required evidence. No secrets, credentials, import-time IO or external hostnames.
2. **Deterministic reference oracle:** pure validation of expected P9 controls (deny-first, tenant/site isolation, stale-fence rejection, immutable envelope replay, kill precedence, uncertainty `manual_intervention_required`). May never mint a real positive P9 grant.
3. **Two isolated adapters:** thin SQL transport and pg-boss wrapper implementing the same minimal operations (`offer`, `claim`, `heartbeat`, `complete`, `readFreshStatus`, `stop`) and explicit fault hooks. **These are interface proposals only**; absence of native transport identity/grants is not repaired by a queue library.
4. **Independent evidence recorder:** synthetic event trace and zero-network provider spy, immutable fixture identifier, clocks and fence/revision markers, SQLSTATE when applicable, pre-registered thresholds, cleanup outcomes. Evidence must distinguish observed, inferred and unavailable facts.

### Proposed case fixture schema (design-level, not database DDL)

```text
case_id: A01..A14
candidate: native_pg | pg_boss
synthetic_seed: stable deterministic identifier
database_identity: placeholder until approved disposable environment
initial_control: revision, paused/drained/killed state, scope, original expiry
immutable_work: site, tenant, idempotency fingerprint, synthetic payload digest
injection: stage, trigger, fault kind, bounded timeout
expected: allowed/denied/manual_intervention_required + forbidden effects
observed: transaction marker, db_time, fencing epoch, call trace, network_calls
verdict: PASS | FAIL | NOT_RUN | INCONCLUSIVE | BLOCKED
```

**Do not** represent `NOT_RUN`, missing output, uncertain provenance or `INCONCLUSIVE` as PASS. A queue receipt, log line, or fixture-signed signature is not P9 authorization.

## A01–A14 executable-design mapping (all NOT RUN)

| ID | Proposed fixture/fault primitive | Oracle or evidence requirement |
|---|---|---|
| A01 | fake envelope, no independent issuer | no positive claim or dispatch |
| A02 | two same-fingerprint producers and one conflicting envelope | exact replay dedupe, mismatch deny |
| A03 | A lease N expires, B epoch N+1, A stale completion | stale epoch fails CAS and dispatch |
| A04 | pause/drain/kill revision races claim | committed kill priority, no subsequent claim |
| A05 | synthetic pre-dispatch crash | classify only; never auto-send |
| A06 | inject unknown COMMIT acknowledgement | reconcile on fresh read or manual intervention |
| A07 | simulated possibly-started side effect | manual intervention, no repeat send |
| A08 | long-lived snapshot and fresh marker transaction | old snapshot cannot certify fresh status |
| A09 | partial, paginated inventory and missing page | enumeration incomplete => fail closed |
| A10 | overlong handler, lease expiry and kill | no automatic inferred non-effect or duplicate |
| A11 | interrupt v45→46 asynchronous index stage | record invalid-index/schema/version diagnostics (future disposable only) |
| A12 | synthetic retention backlog plus claims | capture lock, latency and maintenance budgets |
| A13 | forged scope/tenant/expiry/poisoned envelope | deny/quarantine; no sensitive logs |
| A14 | module import and app construction with start prohibited | zero implicit DDL, enqueue, scheduler or network |

## Operational prerequisites / approval checklist

- [ ] Named accountable test owner, independent DB reviewer, independent security reviewer and privacy/retention approver; documented sign-off for a specific experiment (not satisfied).
- [ ] Explicit second-stage authorization naming isolated ephemeral database, region/hosting, permitted SQL/DDL and packages; exclude Railway, shared and production resources (not satisfied).
- [ ] Exact Node patch and PostgreSQL `SHOW server_version` captured **in separately approved environment**, along with PG image digest, SBOM, package lockfile and library artifact integrity (not satisfied).
- [ ] Review pg-boss `migrate`/`createSchema`/`schedule`/`supervise`/`reindex` default behavior; prohibit any application import/startup from creating schema without separately authorized migration phase (not satisfied).
- [ ] Separate migration identity from least-privilege runtime role; validate allowed schema and enforce disposable target assertion **before** any connection-changing operation (not satisfied).
- [ ] Authorize fault injection, concurrency limits, bounded synthetic data and cleanup/restore before running any A01–A14 tests (not satisfied).
- [ ] Preserve independent P9 C2 trust issuer denial-only; no providers, claims, outbound calls, scheduler or live tenant data (not satisfied).
- [ ] Pre-register thresholds and evidence review/signature; compare both candidate verdicts and produce an ADR *only after* runtime evidence (not satisfied).

## Evidence inventory and exit criteria

**Stage 1 deliverables:** this design, approval checklist, A01–A14 mapping, provenance and stop/go language. **Stage 1 can close as preparation only** after review and CI; it cannot assert runtime readiness.

**Stage 2 requires a separate, explicit authorization.** Upon authorization alone, any future experiment must still validate approved DB identity, isolated credentials, exact package/hash, network-deny sandbox and teardown; on any ambiguity stop without retry.

**Hard stop:** source revisions, test fixtures or reviewers cannot bypass issues [#1054](https://github.com/intssere/SEO_ENGINE/issues/1054) and [#1061](https://github.com/intssere/SEO_ENGINE/issues/1061). P9 dispatch, production DB writes and provider calls remain forbidden. No license to install pg-boss, migrate, deploy, merge this branch or modify `main` is conveyed by this design.

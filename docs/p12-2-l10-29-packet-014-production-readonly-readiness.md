# P12.2 L10.29 — Packet 014 Production SELECT-only certification readiness

**Issue:** #946  
**Mode:** Repository-only review and authorization design, NOT a Production execution receipt.  
**GitHub baseline:** `65a1cfee9922aa5a173dd96029299b7be62c2fb0` (post-merge CI run `37830096904`: SUCCESS).  
**Operational state:** Unknown until independently reverified. A GitHub merge does **not** deploy the Production Railway image.

## 1. Source-backed facts

- `CURRENT_STATE.md` identifies the historical Packet 014 run as 3,044/3,044 finalized URLs, with one raw terminal failure for `https://diamondshelf.us/blogs/news`.
- The historical reconciliation treats that URL as `sitemap_orphan_absence`: one raw failure, one expected absence, zero effective unresolved failures. The legacy raw flag remains `wholeSiteCertified=false`; no legacy completed run or recovery receipt was created.
- PR #929 (L10.26) introduced `artifacts/api-server/src/lib/p12-2-l10-26-packet-014-comparable-preflight.ts`. Its query-set version is `p12-2-l10-26-packet-014-comparable-readonly-preflight-v1`, and it produces **three ordered SELECT statements**:
  1. `packet_014_comparable_candidate`
  2. `packet_014_raw_history_immutability`
  3. `packet_014_comparable_guard`
- PR #936 (L10.27) added a localhost-only PostgreSQL CI test for the same generated queries; the final merge and push-to-main CI succeeded. That is synthetic/ephemeral SQL execution evidence, **not** current Production data evidence.
- The exact SQL must be generated from the **certified source**, never copied or reconstructed from documentation. The canonical query-set fingerprint is computed by `p122L1026QuerySetFingerprint()`; a runtime operator must independently verify and pin its expected value before any Production query action.

## 2. Read-only expected-state contract

| Query ID | Expected result | Failure classification |
|---|---|---|
| `packet_014_comparable_candidate` | Exactly one row with `candidate_count=1` | Zero or multiple candidates blocks certification |
| `packet_014_raw_history_immutability` | `completed_run_count=0`, `recovery_receipt_count=0`, `raw_uncertified_count=1` | Any mismatch blocks certification |
| `packet_014_comparable_guard` | Exactly one row with `comparable_guard=1` | SQL exception, missing result, or any other value blocks certification |

The guard is an intentional `SELECT 1 / CASE ... ELSE 0 END`; an invalid state can raise division-by-zero. Treat this as a **failed certification**, not as a transient reason for automatic retries or changes to historical evidence.

**Important limitation:** These three queries establish the eligibility and immutability checks for **the exact historical Packet 014**. They do not, on their own, establish that Packet 014 remains the globally latest comparable crawl or that the current website has healthy SEO. No such additional claim is permitted.

## 3. Required independent preconditions BEFORE requesting Production SELECT authority

1. **Release identity:** Obtain a fresh, timestamped Railway environment/service/deployment report from the actual Production target. Bind project, environment, service, deployment ID, source image digest and health state. The historical F24 details in `CURRENT_STATE.md` are not fresh runtime proof.
2. **Source-to-runtime lineage:** Independently determine whether the deployed image includes the relevant schema and data/reader contract. The current GitHub SHA is not proof that the running immutable image contains recent source changes. No image transition is implied or authorized.
3. **Database identity:** Verify the exact approved Production Postgres service, database, schema/relations, and site ID using a separately authorized least-privileged method. No `DATABASE_URL`, password, token, or connection string may be placed in the issue, CI logs or report.
4. **Least privilege:** Prepare a dedicated role/session with SELECT only on the relevant tables; prohibit DDL, DML, function execution beyond needed built-ins, provider calls, persistence, scheduled work and autonomous retries.
5. **Query integrity:** Pin the ordered query IDs, query-set fingerprint, source SHA/tree, and exact generated SQL bytes from the certified L10.26 module. Reject drift, additional statements, parameter substitutions or a changed target.
6. **One-shot scope:** Fix maximum one invocation of each of the three queries, explicit timeouts and result-cardinality ceilings, a finite permission window, and a separate immutable/redacted evidence destination. Avoid logging confidential payloads, SQL credentials, arbitrary row data, or unbounded debug details.
7. **Human authorization:** A future exact bounded authorization must identify the target, pinned queries/fingerprint, operation count, role/read-only guarantees, evidence destination and expiration. `continue` is not that authorization.

None of these independently required Production prerequisites is established by repository CI alone.

## 4. Proposed bounded Production operation (SPECIFICATION ONLY)

1. Acquire the approved identity evidence without writing to the service, database, providers or public site. Fail closed on mismatch, stale deployment, unknown schema, or inaccessible least-privileged role.
2. In an **explicit read-only transaction** with an appropriate statement timeout, run the exact three pinned SQL statements, once each, in declared order. The transaction and role must prevent writes regardless of SQL text.
3. Validate each result against Section 2; preserve both success and blocker details without changing historical rows, classifying expected absence as effective certification only.
4. Emit a redacted, deterministic receipt with execution timestamp, GitHub SHA/tree, deployed image digest, verified Production target identifiers (no secrets), query-set fingerprint, per-query statuses and values, no-write attestation, and terminal PASS/BLOCKED outcome.
5. Reject contradictions; do not attempt remediation, retry, backfill, repair, migration, deployment or live crawl within this operation. Request a new specific authorization for any future action.

**No actual query was run against Production in L10.29.** The above is an operator review plan, not executable authority.

## 5. Evidence-to-claim decision table

| Evidence | Current status | Permitted conclusion |
|---|---|---|
| L10.26 source and exact query contract | Source reviewed, merged, GitHub CI certified | Three ordered SELECT-only query definitions exist |
| L10.27 isolated PostgreSQL positive/negative tests | Merged and GitHub CI certified | SQL contract executes against controlled fixtures and fails closed in tested cases |
| Historical Packet 014 expected-absence accounting | Documented in `CURRENT_STATE.md` and earlier artifact lineage | Historical effective unresolved count is zero; raw failure is preserved |
| Current Railway deployment/image identity | **Not freshly established in this workstream** | No claim about currently running image content |
| Current Production schema/data and Packet 014 SELECT results | **Not executed / not established** | No Production certification claim |
| Current globally latest comparable baseline | **Not established by these queries** | No latest-baseline claim |
| P12.3–P12.10 end-to-end Production acceptance | **Outstanding** | SEO ENGINE v1 not declared complete |

## 6. Review outcome and next gate

**Decision: REVIEW-READY ONLY, LIVE CERTIFICATION NOT GRANTED.** The next permissible activity is an independently bounded, separately authorized preflight to establish current Production identity and read-only eligibility; only after that may an exact one-shot SELECT packet be proposed. If the deployed image cannot support the reader contract, stop and route any immutable-image release through its independent build/attestation/fixture/authorization workflow.

**Prohibited in L10.29:** Production DB access (including SELECT), Production DDL/DML, live crawl, OAuth/provider actions, Railway deploy/config changes, public-site writes, schedulers/workers, credential changes, test fixture reuse in Production and any automatic remediation.

# INT-02C-06 — Railway-native metadata inspection: operator-run procedure and decision record

> **Current status overlay — 2026-10-13 (INT-02D-03):** INT-02C Path B target architecture was owner-approved and merged by PR #1108 at main `f61932a1f241b7ed41b4b4f6fc7dfc471be87299` (post-merge CI #38408381426 succeeded). The G0 architecture *selection* is complete; the pre-merge wording below is historical. G1–G5 live authority/evidence gates remain open, including independent binding attestation, safe least-privilege SQL channel, fresh bounded authorization, database identity and historical migration proof. This overlay does **not** waive any stop condition, permit a collector, credentials, variable resolution, SQL, migration or deployment.


**Status: PROCEDURE DESIGNED / LIVE INSPECTION BLOCKED.** This is a source-only, offline operational handoff. No credentials, database connections, configuration changes, migrations, or deployments are authorized by this document.

## Current verified provider boundary

- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`; Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`.
- Primary **candidate**, not certified authority: `Postgres` service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`, persistent volume `5e7f09d1-c436-4a49-9526-c3150d0e820a`.
- Excluded restored instance: `ad459f76-e3fa-4aef-bcb7-0bff509aa326`. Do not contact it as part of this procedure.
- Application `seo-engine-shadow` contains a `DATABASE_URL` variable **name**, not independently evidenced target binding.
- The connected Railway integration offers provider-resource descriptions; it does **not** provide a constrained metadata-only PostgreSQL SQL execution interface. `list_variables` may render secret values; **do not call it**. Do not enable a TCP proxy, create a new service/role, or run a job as an implied workaround.
- A Draft architecture supersession proposal in PR #1108 does not by itself grant Production database authority.

## Decision: execution mechanism

**Accepted for design, not yet authorized to run:** A designated operator uses a provider-supported, already-approved, access-controlled private database session; the operator proves its exact provider target without copying a connection URL, credentials, host, or authentication token into ChatGPT, GitHub, logs, or evidence artifacts. If such a mechanism cannot be proven available under the current permissions, STOP. There is **no supported direct connector path today**.

**Explicitly rejected:** public TCP proxy; resolved Railway variable export; reusing the running application service or its Production credentials; automatic CI connection; deploying a collector to Production; connection to restored Postgres; promoting an unverified fixture adapter.

## Preconditions before a new live attempt

1. **Accountable architecture owner** explicitly approves the Railway PostgreSQL architecture supersession and names the Production candidate service and recovery lineage. This is separate from merging Draft code.
2. **Independent provider-side witness** records project, environment, service, volume, current deployment, UTC observation time and source reference. The same witness verifies the *unresolved* application `DATABASE_URL` reference targets the expected service. If the app points to another provider or the value is unavailable without secret resolution, STOP.
3. **Existing least-privilege principal proof**: operator verifies the role is not a superuser or database owner, cannot change role, and has no customer-table read privileges. New role creation/configuration is outside the current authorization.
4. **Private execution environment**: evidence of private endpoint, authenticated transport and a user-specified operator identity; no public endpoint or provider mutations.
5. **Statement allowlist**: use the exact source-pinned query set and SHA-256 fingerprint from `int-02c-05a-railway-metadata-query-contract.mjs`. Never accept free-form queries or modified parameters.
6. **Execution constraints**: a database-enforced read-only transaction, bounded lock/statement timeout, one attempt, verified current database/role and expected results schema. Fail closed on any mismatch. The query contract module is not an execution adapter and cannot attest these conditions.
7. **Evidence custody**: separate collector and reviewer, tamper-evident store controlled by the organization, recorded query-set SHA-256, target identifiers, results with **only approved catalog metadata**, UTC timestamps and reviewer decision. Secret material and customer rows are never recorded.

## Exact staged gates

| Gate | Exit criterion | Present state |
|---|---|---|
| G0 architecture | Signed Railway-specific ADR approved by accountable owner | Proposed; not attested approved |
| G1 binding | Independent unresolved structural app-to-database reference | Missing |
| G2 safe transport | Verified pre-existing private least-privilege session with no secrets exposed | Missing |
| G3 permitted scope | Exact target, fixed query set, read-only guarantees, witness and single-run live authorization | Not granted for new mechanism |
| G4 inspection | Independently witnessed provider and database session identities and catalog results | Not executed |
| G5 migration history | Separate allowlisted, metadata-only ledger-column and ledger-row contract if a candidate ledger is identified | Not designed; no historical claims permissible |

**Stop conditions:** uncertainty on target, role, unresolved variable binding, private transport, query fingerprint, independent witness, elevated privileges, timeouts, unexpectedly large catalog, malformed result, or ledger identity. No retries or fallbacks without fresh review.

## Important distinction: 05A vs historical ledger

The current fixed query set retrieves at most 128 public table names, 256 constraint names and 32 *candidate migration-ledger table names*. It does **not** retrieve migration row identifiers, checksums or timestamps; it cannot resolve collisions among UGP/main migrations `0008–0011`. A second separately approved, schema-pinned ledger metadata contract will be necessary **after** existence/shape is verified.

## Next action for the operator / reviewer

Before seeking any new live SQL authority, obtain the provider-native **unresolved** `seo-engine-shadow` database binding and evidence that a credential-safe, least-privilege private session already exists. Return only non-secret attestations and witness/source identifiers. If either is impossible with current Railway capabilities, report `INT-02C-06 BLOCKED: SAFE EXECUTION CHANNEL UNAVAILABLE` and request a separately scoped infrastructure design approval. Never interpret a user's generic “continue” as permission to deploy infrastructure or expose credentials.

**Disposition:** `PROCEDURE_READY / EXTERNAL_EVIDENCE_MISSING / NO_LIVE_SQL / NO_MIGRATION_AUTHORITY`.

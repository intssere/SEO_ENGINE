# INT-02C-G2 — restricted metadata-reader provisioning design (SOURCE ONLY)

**Status:** Offline design only. No live reader is provisioned, no role/session/database privileges have been inspected, and no operational database authority is granted. Existing Railway default credentials are not a certified least-privilege principal. G1 owner-reported same-hostname and service-ID checks remain **owner observed, not independently attested**.

## Deduplication / authoritative source

- INT-02C-05A owns the exact target and four allowlisted bounded SELECT query shapes; import its `TARGET` and `metadataQueryFingerprint()`. No duplicate SQL, new query, executable DDL, or collector.
- INT-02C-06 owns G1–G5 gates and the demand for an already approved private inspection channel, non-superuser/non-owner account, external witness, and newly scoped execution authorization.
- INT-02C-05C/05D prohibit caller-supplied attestations and secret-based shortcuts.
- RT01-A12.23 handles mainline/legacy UGP 0008–0015 migration history STOP, A12.24 independently verified identity/roles/grants/RLS, A12.25 provenance and freshness, A12.26 trust-anchor revocation and atomic replay; they are **not** replaced by the G2 paperwork checker.
- A12.27 controls acquisition-scope design and holds all live authority false.
- P12.2 recovery/PITR and rollback certification remain separately gated.

## Proposed role security profile, NOT instructions to execute

A future, separately approved DBA procedure must create or verify a uniquely named **dedicated metadata-only LOGIN principal**, distinct from the Railway bootstrap/default role and from the application role. The proposed role must be NON-SUPERUSER, NO-CREATEDB, NO-CREATEROLE, NO-REPLICATION, NO-BYPASSRLS, neither database/schema/table owner nor able to SET ROLE into elevated accounts. It must not receive customer table SELECT or modification rights, schema/database creation rights, unnecessary temporary-object capability or unsafe function EXECUTE rights. Restrict `CONNECT` to the exact database and rely only on permitted system catalog/information_schema views needed by the preexisting 05A allowlist. Review **PUBLIC grants, nested role memberships, inherited grants, ownership and object defaults**: an apparent lack of explicit user grants is insufficient.

A proposed least-privilege grant/role spec is not proof of enforcement. PostgreSQL permits broad system catalog visibility by default; reviewer must evaluate catalog metadata sensitivity, built-in/public execution and actual effective privileges as applicable. If 05A metadata cannot be collected with this minimal role, STOP: do not expand privileges or introduce alternate query shapes without a new source-only review and explicit authorization.

## Private session and secret custody requirements

Only after *separate* operational approval, a designated DBA could use an **existing** authenticated private channel to the exact project/environment/Postgres service with short enforced `statement_timeout` (design target 15 seconds) and `lock_timeout` (design target 5 seconds), a database-enforced READ ONLY transaction, one attempt and a pinned 05A query fingerprint. Transport must remain private and authenticated. **Do not** open TCP proxy, reuse default Railway app credentials, run a CI-to-production job, or create an interim collector. Channel existence and principal privileges are presently UNVERIFIED.

The DBA or security custodian must keep password/connection material in the organization's restricted secret store, never in GitHub, ChatGPT, logs, approvals or witness manifests. The evidence handoff contains only opaque references, exact target and deployment IDs, UTC time, query fingerprint, independently observed role properties and a tamper-evident digest. Collector and reviewer must be different people. Role identity, memberships, PUBLIC grants, effective table/function privileges, safe transport and binding must be verified by a separate independently authenticated process; a synthetic flag never suffices.

## Stage-gated independent verification (future work, not permission)

1. **G1** Independently witness unresolved app-to-Postgres binding and exact deployed resource identity; owner-observed matching hostnames alone do not certify this.
2. **G2a** Obtain separate owner/security/DBA approval for any new role provisioning, if strictly needed, without expanding database or service scope. No such approval in this PR.
3. **G2b** Independently verify the proposed role's identity, effective permissions, inherited/PUBLIC grants and nonownership without inspecting customer rows; define and approve a bounded verification method separately.
4. **G2c** Prove existing private session transport and credential custody without copying secret values into evidence.
5. **G3** Request new exact-HEAD, exact-target, one-run metadata inspection authorization; review available evidence and stop if any proof is missing.
6. **G4** If separately approved, execute only INT-02C-05A allowlist through an independently validated channel. Historical ledger receipts remain excluded.
7. **G5** Require a new schema-pinned, separately approved ledger query plan and authenticated historical receipts before assessing main/UGP collisions.

## Fail-closed disposition

`int-02c-g2-metadata-reader-design.mjs` evaluates an **offline proposal** with deterministic `PASS/BLOCKED/UNVERIFIED` outcomes and all operational authority flags false. Even a synthetic PASS means **design completeness only**. Negative tests refuse default account reuse, superuser/CREATEROLE/BYPASSRLS/inheritance risks, customer SELECT, public proxy, missing independent reviewer, query-set drift, a declared resolution of UGP 0008–0015, fabricated live verification, connection URL leakage and purported live execution authority.

**Known evidence:** owner reports only default Railway credentials used; exact dedicated reader existence not established. The candidate Postgres service has an advertised private endpoint; this is not an authenticated least-privilege SQL channel. Operational database identity, installed migration ledger and recovery remain unverified.

**Governance:** dedicated draft PR, no merge. Exact-HEAD Standard CI and dedicated offline CI success, Tahseen formal GitHub APPROVED review, zero unresolved threads, and separate owner exact-HEAD merge authorization required. No existing DB access, SQL, credentials, role creation, Railway provider operations, migrations, runtime wiring, workers, public writes or deployments.

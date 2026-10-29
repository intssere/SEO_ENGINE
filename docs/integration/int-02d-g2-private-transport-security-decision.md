# INT-02D — G2 private transport security decision (design-only)

**Status:** TRANSPORT OPTION IDENTIFIED / G2 NOT CERTIFIED / NO EXECUTION AUTHORITY  
**Date:** 2026-10-29  
**Baseline:** `main` `0353536d1d186bfe9810d52fdd1959ebfedef456`  
**Parent:** #1159; read together with `docs/integration/int-02c-06-railway-operator-inspection-procedure.md` and `docs/integration/int-02d-g1g2-operator-evidence-handoff.md`.

## Decision

For a *future, separately approved* G2 operator assessment, **evaluate a provider-supported authenticated private SSH transport as a design candidate only**. This is not selection, implementation, approval, or evidence of a currently working, appropriately authorized connection. Do not use the default Railway database connection workflow as the proposed evidence collector. The provider-documented database connect workflow may retrieve or display resolved credentials and can initiate a connection; neither operation is permitted by this document.

Relevant official provider documentation (verify at the time of a future authorization):  
- https://docs.railway.com/cli/connect  
- https://docs.railway.com/cli/ssh

Railway service metadata presently shows no public TCP proxies on the candidate primary, application or distinct restored database. Lack of a public proxy **does not** demonstrate private transport availability, authenticated operator identity, scope isolation or least-privilege SQL access.

## Explicitly ruled out as shortcuts

- A public TCP proxy, published database endpoint, ad hoc tunnel, or opening a database connection under generic `continue`.
- Export, print, copy, log or paste resolved `DATABASE_URL`, database credentials, connection host strings, tokens or secret-bearing CLI output into chat, a GitHub issue/PR, terminal recording or CI.
- Use of the running application service's runtime identity, owner/superuser credentials, Production worker, new collector deployment, new database role, elevated grants or CI automation to bypass G2.
- Treating the operator-reported October 10 read-only `psql` sessions as evidence of a dedicated read-only role today.
- Contact with `Postgres-restored-20261010-1701` or alteration of Railway project state.

## Gate A — independent non-secret feasibility assessment

A designated operator and an independent reviewer must attest, *without a database session or credential extraction*:

1. Authorized human/operator account and permission boundary for the **existing** Railway private-access capability.
2. Exact intended Railway project and environment; service `Postgres` (`b69e0633-7ab9-40ab-85f3-c9edd6acb031`), volume `5e7f09d1-c436-4a49-9526-c3150d0e820a`; never the restored service.
3. An independently verifiable non-secret method of binding the private transport to the primary service, preventing accidental cross-environment or restored-service access.
4. Whether a **pre-existing** database principal can be independently attested as non-superuser, non-owner, with only specifically permitted catalog visibility and no customer-data read, role escalation, arbitrary schema change or mutation rights. A role **name alone** is not proof.
5. A credential-safe workflow in which the transport and authentication remain entirely in the operator's approved secure environment; evidence records only opaque witness/source identifiers and redacted control attestations.
6. Security owner, operator and independent reviewer identities, UTC timestamp, provider document version and all unresolved gaps.

If any item fails or cannot be witnessed safely: **STOP / G2_BLOCKED**. Do not initiate a connection as a diagnostic substitute.

## Gate B — separate execution design and authorization, not included here

Only after Gate A evidence is approved may a *new* scope propose exact connection mechanics and a one-time read-only catalog inspection. That subsequent approval must independently pin:

- Non-restored service identity, principal identity and proof of least privilege.
- An allowlisted, source-commit-pinned catalog-only SQL query set and SHA-256 digest.
- DB-enforced read-only transaction, bounded statement and lock timeouts, row/output limits and abort conditions.
- Operator-controlled credential custody, independent witness, no customer rows, no secret values in evidence.
- A single execution window and no automatic retries, side effects or fallbacks.
- Security/recovery owners' explicit sign-off and rollback/incident response for uncertainty.

Gate B **does not exist as an authorization** merely because this design note is reviewed or merged. G3, G4, G5 and PITR remain independently gated.

## Gate record

| Requirement | Current observation | Verdict |
| --- | --- | --- |
| G1 structural reference | Operator reports reference to `Postgres`; Railway service-name-to-ID mapping corroborated | independent provenance/session attestation pending |
| Provider private transport | Official Railway SSH capability documented; project-specific authorized use unproven | CANDIDATE ONLY |
| Existing least-privilege role | Not independently evidenced | BLOCKED |
| G2 access mechanism | No certified existing session/transport/role combination | BLOCKED |
| G3 exact SQL authority | Not granted | NOT AUTHORIZED |
| G4/G5 live catalog and migration ledger | No authorized observation | NOT EXECUTED |
| PITR Production recovery | Previous partial operator-reported rehearsal insufficient | NOT CERTIFIED |

**Permanent invariants:** `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`. No live SQL, role changes, credential operations, migrations, deployment, OAuth activation, public-site writes or provider mutation permitted by this document.

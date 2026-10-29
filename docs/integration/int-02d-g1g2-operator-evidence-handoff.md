# INT-02D — G1/G2 operator evidence handoff (offline only)

**Date:** 2026-10-29. **Canonical baseline:** `1e5dd6e83fd8f93d2401f31a95314196da1590c9`. **Disposition:** `G1_BLOCKED / G2_BLOCKED / NO_LIVE_SQL`. This file is an operator evidence request, not a runnable inspection procedure, secret disclosure request, or authority for Production operations.

## Verified control-plane objects

| Role | Railway service | Persistent volume |
|---|---|---|
| Application | `seo-engine-shadow` / `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` | none directly mounted |
| Intended primary | `Postgres` / `b69e0633-7ab9-40ab-85f3-c9edd6acb031` | `postgres-volume` / `5e7f09d1-c436-4a49-9526-c3150d0e820a` |
| Excluded restore | `Postgres-restored-20261010-1701` / `ad459f76-e3fa-4aef-bcb7-0bff509aa326` | `postgres-restored` / `bf4673b5-3aa8-4cf3-ba14-8edfc37d2403` |

Project `52265e29-921b-4652-ac0d-9da4e5e69936`; Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`. Railway reports these resource objects live, but **does not certify** the application's connection to the primary database, PostgreSQL roles, SQL transport, schema, migration ledger or PITR history.

## G1 — operator-only structural binding attestation

A named operator using an authorized Railway UI session may inspect the application **reference editor** for the `DATABASE_URL` variable **without revealing a resolved value**. Do not click controls that display, copy, expand, download, or export a connection string or credentials. If the UI cannot show the *unresolved* service reference safely, STOP and report `G1_SAFE_BINDING_VIEW_UNAVAILABLE`; do not fall back to the secret-resolving API.

Operator returns **only** these non-secret fields:

- Observation timestamp (UTC), operator identity, witness identity and source screen path.
- Project, environment and app service identifiers above.
- `DATABASE_URL` variable **name** and whether the UI explicitly shows a structural service reference.
- Referenced service **ID**, if independently visible without credential exposure.
- Classification: `TARGETS_INTENDED_PRIMARY`, `TARGETS_RESTORED_OR_OTHER`, or `UNVERIFIABLE`.
- Evidence object identifier for a *redacted* screenshot/attestation. Avoid showing actual values in ChatGPT or GitHub, including hostnames, username, passwords, connection strings and tokens.

A reference name resembling `Postgres` is insufficient if the referenced service cannot be independently disambiguated. Require exact service ID and independent correspondence to its registered primary volume before G1 completion. G1 structural binding alone does not prove the application's live database session identity.

## G2 — pre-existing least-privilege inspection transport evidence

Separately identify whether an **already authorized** private PostgreSQL inspection channel exists. Provide only operator/witness names, control-plane evidence identifiers, channel classification, database-session identity attestation method, DB-enforced read-only boundary and role/privilege attestation method (not the connection details). Distinguish a documented proposed channel from an actually available, approved one.

**Do not create or enable** any TCP proxy, tunnel, service, database role, CI runner, credential, temporary deployment or collector to fill this gap. Do not connect to any database or test channel while collecting this design-stage evidence.

## Reviewer decision record (do not pre-fill)

| Gate | Required verdict | Evidence |
|---|---|---|
| G1 | VERIFIED_STRUCTURAL_PRIMARY / WRONG_TARGET / BLOCKED | Operator witness and safely redacted reference provenance |
| G2 | VERIFIED_EXISTING_PRIVATE_LEAST_PRIVILEGE_CHANNEL / BLOCKED | Independent controls/witness and role plan |
| G3 | NOT AUTHORIZED | No live SQL authorization supplied |
| G4 | NOT EXECUTED | No SQL session or catalog proof |
| G5 | NOT EXECUTED | Migration history still unknown |
| PITR | NOT CERTIFIED | Restore/recovery evidence separate |

Review must reject missing witnesses, inferred service identity, copied variables, leaked credentials, restored-instance ambiguity, and any suggestion that green CI or running replicas certify Production schema.

## Stop conditions and next handoff

Stop if any credential might be displayed, source service is ambiguous, role is elevated/unknown, transport is public, an inspection requires database connection, or any operator proposes Production changes. Record only a redacted denial reason. Once G1/G2 independently satisfy their non-secret requirements, prepare a **separate exact-target G3 authorization request**, pinning the approved query manifest, timeouts, operator/reviewer and safe evidence destination. It must not itself perform inspection.

All standing safety invariants continue: `PUBLIC_SITE_WRITES_ENABLED=false`; `AI_PROPOSAL_GENERATION_ENABLED=false`; no Production SQL, migration, DDL/DML, secret resolution, provider writes, deployment, OAuth activation or merge from generic `continue`.

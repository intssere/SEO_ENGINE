# INT-02C-07 — Historical structural binding evidence reconciliation

> **Current status overlay — 2026-10-13 (INT-02D-03):** The formal Path B **target architecture** is owner-approved and merged in PR #1108, main `f61932a1f241b7ed41b4b4f6fc7dfc471be87299` (post-merge CI passed). The table's `Formal Path B architecture adoption | Proposed` entry below reflects the historical assessment when authored, not current target-architecture status. All reported binding observations remain historical and **do not** attest the current unresolved reference or Production database authority. No permission for secrets, SQL, migration, infrastructure changes or deployment follows.


**Status: operator-reported structural reference FOUND; independent current binding ATTESTATION STILL PENDING.**

## Direct evidence located

The committed canonical document `docs/p12-2-l10-56h-1-railway-pitr-evidence-handoff.md` (October 10, 2026) states that the previous operator's Railway UI showed the unresolved `seo-engine-shadow` application `DATABASE_URL` reference as `${{Postgres.DATABASE_URL}}`. This is an **operator-reported historical observation**, not provider-native independently signed binding evidence and not proof the binding remains current.

Matching Railway control-plane identifiers independently inventoried:
- project `52265e29-921b-4652-ac0d-9da4e5e69936`;
- environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application `seo-engine-shadow` service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`;
- candidate `Postgres` service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`, volume `5e7f09d1-c436-4a49-9526-c3150d0e820a`;
- distinct restored service `ad459f76-e3fa-4aef-bcb7-0bff509aa326`.

The read-only connected Railway `get_service_config` response exposed the app's `DATABASE_URL` **name only**, not the unresolved reference. This safe control-plane API cannot independently confirm the historical operator statement. We deliberately did not call `list_variables`, which may return plaintext credentials.

## Updated evidence classification

| Requirement | Result | Residual uncertainty |
|---|---|---|
| Historical unresolved app reference | **Reported: `${{Postgres.DATABASE_URL}}`** | Historical human UI observation only |
| Current app variable name | **Verified: `DATABASE_URL`** | Variable target not shown |
| Live target service/volume | **Identified candidate** | Source-of-truth status unapproved |
| Provider-native structural reference | **Missing** | No safe reference-only endpoint verified |
| Database internal identity | **Not collected in INT-02C** | Prior P12 source/operator observations are not exact INT-02C ledger attestations |
| Historical migration ledger | **Missing** | Cannot infer from schema parity, deployments, source hashes |
| Formal Path B architecture adoption | **Proposed** | Draft PR is not an approved supersession |

**Do not incorrectly report 'no binding evidence exists'.** Existing repository evidence supports the narrower claim: *an operator reported the app variable references the primary named Railway Postgres service at the time of the observation; the independently attested current binding remains unverified.*

## Minimal next step

A designated operator and independent reviewer should capture a timestamped **unresolved** reference-only Railway UI observation showing the current `seo-engine-shadow` variable expression with the target service identity and app deployment revision, redacting all resolved values and credentials. Obtain immutable evidence custody with independent witness. If that is not safely available, STOP. This is an evidence-only request, **not** approval for SQL, secrets, deployments, provider mutations, restored-service inspection, or Production migration.

**Gate:** `HISTORICAL_BINDING_REFERENCE_REPORTED / LIVE_BINDING_UNATTESTED / MIGRATION_LEDGER_UNKNOWN / PRODUCTION_AUTHORITY_UNCERTIFIED`.

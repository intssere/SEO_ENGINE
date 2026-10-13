# INT-02C — Source-only evidence custody and reviewer handoff

**Status:** documentation for a future separately authorized review; no live observations or database-access permission. **Branch:** `audit/int-02c-db-authority-lineage-source`.

## Separation of responsibilities

| Role | Required action | Must not assert |
| --- | --- | --- |
| Architecture owner | Identify current approved ADR and intended Production authority | That an intended Neon project is currently active solely because an ADR names Neon |
| Provider evidence collector | Under separate authorization, preserve immutable non-secret resource and configuration metadata | That a service name or connection success independently proves identity |
| Database read-only collector | Under separate authorization, inspect an approved allowlist of metadata and historical ledger | That catalog shape or source SQL proves a migration was executed |
| Independent reviewer | Corroborate provider, runtime binding, ledger origin, and execution lineage from independent channels | Trust a witness string, digest, or approval flag written by the submitter |
| Release authority | Decide whether to commission a separate exact-target installation plan | Treat inspection approval as authorization to run DDL |

## Evidence custody requirements

For each independently collected artifact, retain: opaque artifact ID; observation UTC; collection principal and role; exact authorization reference and scope; source system and provider-native immutable resource reference; source revision/snapshot where applicable; content digest; secure retained location; separate witness identity and method; and an explicit list of limitations. Do not include credentials, connection strings, customer records or raw application row values.

Capture the provider resource identity and the deployed application's independently resolved structural binding **separately**. A reference copied from deployment configuration into an attestation is not an independent confirmation. Disagreeing or absent resource IDs make the result `UNVERIFIED_DATABASE_AUTHORITY`.

For historical migrations, keep *recorded execution evidence* distinct from SQL files and computed source hashes. Missing execution logs mean `HISTORICAL_SOURCE_PENDING`. If original UGP 0008–0011 appear in a database alongside main 0008–0011 semantics, mark `HISTORICAL_COLLISION`; never rewrite ledger rows, re-stamp or replay SQL to make history appear contiguous.

## Review checklist

- [ ] Current authority decision has accountable approval, or remains explicitly unresolved
- [ ] Read-only target and scope authorization supplied separately
- [ ] Provider native resource lineage and application binding corroborated
- [ ] Ledger presence, source origin and migration execution ordering independently evidenced
- [ ] Full schema catalog identity corroborated without exposing data rows
- [ ] Legacy standalone UGP and combined 0012–0015 cases distinguished
- [ ] Independent reviewer has verified receipt custody and limitations
- [ ] Evidence and decision stored with immutable references and retention controls
- [ ] No credentials, providers, write SQL, migrations, or deployment actions were triggered by the review

**Default outcome:** `HISTORICAL_SOURCE_PENDING` and `UNVERIFIED_DATABASE_AUTHORITY`. Review eligibility is not execution permission. This is a source-only handoff and cannot alter those defaults.

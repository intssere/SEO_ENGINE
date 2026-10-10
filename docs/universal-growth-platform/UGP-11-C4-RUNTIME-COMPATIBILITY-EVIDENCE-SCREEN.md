# UGP-11.C4 — Runtime Compatibility Evidence Screen

**Source baseline:** `initiative-universal-growth-platform` `e6b581c42b65dae40def402f90e5e2a470cb7fc6`.
**Linked:** #1061, C2 prerequisite #1054.
**Disposition:** ISOLATED SOURCE-LEVEL TEST ONLY / NO TRANSPORT CERTIFICATION.

This increment implements an in-memory, side-effect-free version and provenance gate. It **does not connect to Railway or PostgreSQL**, and does not install `pg-boss`. The hard-coded minimums `Node >=22.12.0` and `PostgreSQL >=13` follow the earlier *publisher-reported* `pg-boss@12.37.0` requirements: they are **not** independent proof that the package version is currently approved, licensed or secure.

## Evidence contract
To produce `compatibleMinimums=true`, a future **separately authorized disposable nonproduction probe** must record:
- Exact executed Node.js `process.version` (not a `node-version: 22` workflow selector).
- Actual PostgreSQL `SHOW server_version` observation (not an image `:18` tag).
- Explicit provenance labels `executed_runtime` and `sql_server_version`.
- Disposable nonproduction environment identity and immutable `sha256:` image digest.

Malformed, absent or unsupported provenance fails closed. This screen does **not** cryptographically authenticate the recorded evidence: reviewers must validate observation and custody independently. A passing version screen leaves `transportCertified=false`, `claimAllowed=false`, and `dispatchAllowed=false` by construction.

## Remaining acceptance requirements
Independent release artifact/license/SBOM/advisories/migration review; exact supported pg-boss version; isolated PostgreSQL migration and fencing tests; C2 identity/signing authority; separate user approval for any database, credentials, dependency install, deployment or runtime activation. Existing P12.2 and Railway Postgres resources remain untouched.

**No runtime probe executed, no provider or database query, and no operational authority granted.**

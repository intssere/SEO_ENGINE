# UGP-11.C4 — Railway Runtime Inventory (Read-only)

**Source branch:** `initiative-universal-growth-platform`, baseline `445763fd389253dfa0787bd7c40174b9cc7807f3`.
**Scope:** Railway metadata inspection only. **Issue:** #1061. **Disposition:** no transport installation, provider decision or operational authorization.

## Observed (Railway connector, 2026-10-11)

Railway project `SEO ENGINE` (ID `52265e29-921b-4652-ac0d-9da4e5e69936`) contains `production` and `p12-2-fixture` environments. The production environment includes the following services. This observation is an **inventory**, not an attestation of SQL connectivity or engine capabilities.

| Service | Observed deployment state | Image metadata | Reported region |
|---|---|---|---|
| `Postgres` | SUCCESS | `ghcr.io/railwayapp-templates/postgres-ssl:18` | `europe-west4-drams3a` |
| `Postgres-restored-20261010-1701` | SUCCESS | `ghcr.io/railwayapp-templates/postgres-ssl:18` | `europe-west4-drams3a` |
| `seo-engine-shadow` | SUCCESS | `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2` | `europe-west4-drams3a` |
| `p12-2-iad-regional-canary-once` | SUCCESS | P12.2 L10.19 certification image, pinned digest | `us-east4-eqdc4a` |

The Railway Postgres images are **tagged 18**, different from GitHub CI's `postgres:17-alpine`. No `SHOW server_version` SQL query was executed, so actual running PostgreSQL version and available extensions are **not confirmed**. The `seo-engine-shadow` application image is digest-pinned; application Node.js runtime patch/version is **not established** by that digest metadata alone. No claim is made about whether these are the intended UGP operational services; UGP is not deployed.

## Repository source comparison

- CI workflow `.github/workflows/ci.yml` uses `node-version: 22` and `postgres:17-alpine`, but does not pin Node patch version.
- `artifacts/api-server/package.json` includes `postgres` and `drizzle-orm`, but has no `pg-boss` dependency.
- `UGP-11.1C-PG-BOSS-ADOPTION-ASSESSMENT.md` cites publisher minimum Node >=22.12 and PostgreSQL >=13 for `pg-boss@12.37.0` and marks selection **CONDITIONAL / DO NOT INSTALL**.
- `ugp-11-1d6-closed-claim.ts` rejects all fixture claims without independent `certified_p9` controls. Its SQL is disposable-fixture-only.

## Outstanding evidence and responsible boundaries

1. Obtain read-only exact runtime Node patch version and PostgreSQL `server_version` from an explicitly designated *nonproduction* service/database. Do not assume metadata image tag equals the engine version in a live instance.
2. Investigate CI PostgreSQL 17 vs Railway tagged-18 migration compatibility and isolated schema handling before candidate adoption.
3. Resolve C2 independent identity and signing gate (#1054). No transport candidate can issue P9 authorization.
4. Independently review pg-boss pinned release artifact, license, transitive dependencies and schema migrations before any dependency installation.
5. Preserve existing P12.2 workloads and the Postgres restored service untouched. **No SQL, environment mutation, shell commands, service restart, deployment or secret access occurred.**

**Conclusion:** Railway inventory reduces deployment uncertainty but is insufficient to certify `pg-boss`, Node compatibility, PostgreSQL engine version, worker claim fencing, or C2 trust. All authority remains NOT_GRANTED.

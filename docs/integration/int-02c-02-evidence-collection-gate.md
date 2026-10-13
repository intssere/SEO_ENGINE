# INT-02C-02 — Credential-safe evidence collection gate

**Status:** Prepared evidence-request contract; not an authenticated database attestation, not an authority change, and not permission to execute SQL. Follows the explicitly authorized INT-02C-01 read-only provider inventory recorded in `int-02c-01-live-read-only-discovery.md`.

## Facts established by INT-02C-01

Railway has SEO ENGINE project `52265e29-921b-4652-ac0d-9da4e5e69936` and production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`. Two independently mounted PostgreSQL services are visible: `Postgres` (`b69e0633-7ab9-40ab-85f3-c9edd6acb031`) and `Postgres-restored-20261010-1701` (`ad459f76-e3fa-4aef-bcb7-0bff509aa326`). Application `seo-engine-shadow` (`1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`) exposes a `DATABASE_URL` **name**, not an attested provider target. Connected Neon `list_projects` returned an empty list: **account-limited visibility only**. Railway had no staged production patch at the last inspection.

## Minimum independently originated evidence packet

1. **Architecture approval** — current approved ADR with accountable owner; Path A requires external Neon. Any Railway-PostgreSQL substitution requires a new explicitly approved ADR, never an inference from environment names.
2. **Provider identity** — provider-native project/account and database/branch/endpoint/volume lineage IDs, observed state, revision and collector/time. Exact Railway service IDs above are discovery targets, not certified DB authority.
3. **Structural application binding** — separately produced *unresolved* service-to-resource reference with app project/environment/service, running deployment ID and exact binding revision. DO NOT return resolved `DATABASE_URL`, host/user/password, hashes of secrets or environment maps. Railway `describe_service` exposes variable names only; that is insufficient.
4. **Migration history** — a separately approved least-privilege, metadata-only collector obtains immutable execution ledger or archival provenance containing original migration identifier, actual applied time, runner/source, recorded content hash if available, provenance chain and relevant transaction/audit reference. Never infer execution from repository SQL, table counts, successful tests, or an invented receipt.
5. **Independent witness** — reviewer distinct from collector verifies provider reference, immutable evidence location/digest, observation UTC and competing lineage hypotheses. An unauthenticated `witness` field or signed-by-self file is not an independent anchor.

## Explicit alternatives and decision branches

- **Neon project found through a different authorized owner/account:** verify exact Neon project + branch + compute endpoint + database, then corroborate Railway app's unresolved structural link. Do not reclassify either Railway Postgres instance from the new Neon observation.
- **Railway PostgreSQL proposed instead of Neon:** pause certification; obtain an architecture amendment approving precise service and recovery lineage *first*. Compare both current and restored volumes; restoration timestamps/service names do not show which instance is authoritative.
- **Both endpoints reachable or ambiguous:** `UNVERIFIED_DATABASE_AUTHORITY`; no chosen target and no SQL.
- **Historical ledger missing/untrustworthy:** `HISTORICAL_SOURCE_PENDING`; no fabricated backfill/re-stamping.
- **Original UGP 0008–0011 ledger identities conflict with canonical main 0008–0011:** `HISTORICAL_COLLISION`; halt migration review.
- **Evidence fully collected:** independent review eligible only; still no deployment, execution or migration admission.

## Collection authorization envelope for any future SQL-bearing metadata query

Exact provider project/branch/database must first be identified; define a named collector and independent witness, allowlisted metadata views/columns and query statements, read-only principal and transaction, bounded timeout and row limit, capture location/retention, and stop conditions. No current repository artifact or generic `continue` substitutes for that exact-target approval. Under INT-02C-01, no SQL was executed and no historical execution records were obtained.

**Gate:** `UNVERIFIED_DATABASE_AUTHORITY + APPLICATION_BINDING_UNVERIFIED + HISTORICAL_SOURCE_PENDING`. Do not promote to Production or merge/deploy based on this packet.

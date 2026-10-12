# INT-02C-05A — Railway PostgreSQL offline metadata collector contract

**Status:** source-only fixed query contract and offline regression tests. **No PostgreSQL connection, SQL execution adapter, network operation, credential retrieval, migration or deployment.**

## Target and prerequisites

Pin Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`, Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`, primary *candidate* service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`, attached volume `5e7f09d1-c436-4a49-9526-c3150d0e820a`. The restored PostgreSQL service remains excluded. These control-plane IDs do not independently prove database identity or application binding.

The query contract is `int-02c-05a-railway-metadata-query-contract.mjs` with tests in `int-02c-05a-railway-metadata-query-contract.test.mjs`. Fingerprint covers pinned target and normalized, ordered queries. A future execution adapter must refuse any change in fingerprint and require a **new exact-target authorization** before live execution.

## Four bounded metadata statements

1. Session database/role identity and recovery state.
2. Public base-table names (maximum 128, no row content).
3. Public constraint names and types (maximum 256).
4. Migration-ledger *candidate table names only* (maximum 32).

**No ledger rows are selected.** Even if candidate tables are found, collecting migration identifiers, checksums or applied timestamps requires verifying their column schema and a new separately approved fixed query set. System catalog metadata may still disclose object names; the evidence custodian must handle it as internal metadata.

## Execution requirements NOT implemented

An independent read-only collector must verify a bounded connection to the exact service and volume; a role proven non-superuser/non-owner with only catalog metadata privileges; read-only transaction with statement timeout; no search-path ambiguity; independent audit/witness; immutable evidence custody; no dynamic SQL or user-selected target; and a stop on unexpected identity, permission, result shape, or provider mismatch.

The available Railway connector does not expose an approved SQL-only read mechanism, and rendered variables may contain credentials. **Do not call resolved variable tools or expose credentials** to implement this contract. No service, TCP proxy, Railway Function, CI workflow, production image, or other network execution path is provisioned by this increment.

## Security disposition

`evaluateLiveMetadataAdmission()` always rejects. Validating a static query set and recording a hash does NOT establish a read-only database identity, historical execution record, Production authority, or user approval of live SQL.

**Gate:** `OFFLINE_QUERY_CONTRACT_READY / LIVE_EXECUTION_UNAVAILABLE / APPLICATION_BINDING_UNVERIFIED / HISTORICAL_SOURCE_PENDING / PRODUCTION_MIGRATION_BLOCKED`.

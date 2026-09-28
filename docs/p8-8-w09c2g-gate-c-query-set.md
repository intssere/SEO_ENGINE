# P8.8 W09-C2G — Gate-C SELECT-only catalog query set

**Issue:** #600  
**Version:** `p8-8-w09c2g-gate-c-query-set-v1`  
**Status:** FROZEN OFFLINE QUERY CONTRACT — NOT AUTHORIZED FOR PRODUCTION EXECUTION

## Frozen migration identity

- 0005: `b25d111af1610ea1a13333b6fbdaf4f521aea131`
- 0006: `1079b9687472abf387cb67421efa7d1f1ffcbc35`
- 0007: `a98ca47f9735d7fe4f53feebde38562102cbf6f2`

Expected pre-state: exactly 34 ordinary/base tables in `public`.

Expected absent migration tables:
`policy_mutation_reservations`,
`policy_mutation_control_state`,
`policy_mutation_control_events`,
`policy_mutation_claims`,
`policy_mutation_dispatches`,
`policy_mutation_dispatch_events`.

This list corrects the illustrative table names in W09-C2F and is authoritative because it is derived from the frozen migration blobs above.

Expected absent explicitly-created indexes:
`ux_policy_mutation_reservations_active_site`,
`ux_policy_mutation_reservations_active_target`,
`idx_policy_mutation_reservations_site_history`,
`idx_policy_mutation_control_events_site_history`,
`idx_policy_mutation_claims_site_history`,
`ux_policy_mutation_dispatches_blocking_site`,
`ux_policy_mutation_dispatches_blocking_target`,
`idx_policy_mutation_dispatches_site_history`,
`idx_policy_mutation_dispatch_events_history`.

The migrations contain no explicitly named `CONSTRAINT` clauses. Gate C therefore checks migration-table absence plus explicit-index absence, rather than guessing PostgreSQL-generated constraint names.

## Session envelope

A future separately authorized executor must open at most one Production session only after Gates A and B pass and must establish a read-only transaction before Q00:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
```

The executor may then run Q00–Q09 exactly once each, in order, and must end with `ROLLBACK;` regardless of PASS/FAIL. The transaction-control statements are the only non-SELECT statements in the envelope; they create no persistent state and grant no DDL/DML authority.

## Frozen SELECT set

### Q00 — database identity
```sql
SELECT current_database() AS database_name;
```
Expected: exact Gate-A database name.

### Q01 — schema/search-path identity
```sql
SELECT current_schema() AS current_schema,
       current_schemas(false) AS explicit_search_path;
```
Expected: `current_schema = 'public'`; any unexpected explicit schema fails closed.

### Q02 — public base-table count
```sql
SELECT count(*)::integer AS public_base_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
```
Expected: exactly `34`.

### Q03 — sites(id) FK prerequisite
```sql
SELECT
  c.data_type,
  c.udt_name,
  c.is_nullable,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'sites'
      AND con.contype IN ('p','u')
      AND con.conkey = ARRAY[c.ordinal_position::smallint]
  ) AS id_has_single_column_key
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'sites'
  AND c.column_name = 'id';
```
Expected: exactly one row; `udt_name='uuid'`; `is_nullable='NO'`; `id_has_single_column_key=true`.

### Q04 — migration-table absence
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'policy_mutation_reservations',
    'policy_mutation_control_state',
    'policy_mutation_control_events',
    'policy_mutation_claims',
    'policy_mutation_dispatches',
    'policy_mutation_dispatch_events'
  )
ORDER BY table_name;
```
Expected: zero rows.

### Q05 — explicit migration-index absence
```sql
SELECT indexname
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'ux_policy_mutation_reservations_active_site',
    'ux_policy_mutation_reservations_active_target',
    'idx_policy_mutation_reservations_site_history',
    'idx_policy_mutation_control_events_site_history',
    'idx_policy_mutation_claims_site_history',
    'ux_policy_mutation_dispatches_blocking_site',
    'ux_policy_mutation_dispatches_blocking_target',
    'idx_policy_mutation_dispatches_site_history',
    'idx_policy_mutation_dispatch_events_history'
  )
ORDER BY indexname;
```
Expected: zero rows.

### Q06 — migration-like partial-object sentinel
```sql
SELECT n.nspname AS schema_name,
       c.relname AS object_name,
       c.relkind::text AS object_kind
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    c.relname LIKE 'policy_mutation_reservation%'
    OR c.relname LIKE 'policy_mutation_control%'
    OR c.relname LIKE 'policy_mutation_claim%'
    OR c.relname LIKE 'policy_mutation_dispatch%'
  )
ORDER BY c.relname, c.relkind;
```
Expected: zero rows. This catches tables, indexes, sequences, and other relation-like remnants in the migration namespace without reading application rows.

### Q07 — conflicting active DDL/migration sessions
```sql
SELECT pid,
       usename,
       application_name,
       state,
       wait_event_type,
       wait_event
FROM pg_catalog.pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state <> 'idle'
  AND (
    query ~* '(^|[[:space:];])(alter|create|drop|truncate|reindex|cluster|vacuum[[:space:]]+full)([[:space:]]|$)'
    OR query ~* '000[567]_p8_8_policy_mutation'
    OR query ~* 'policy_mutation_(reservations|control|claims|dispatch)'
  )
ORDER BY pid;
```
Expected: zero rows. Returned evidence must omit the `query` text itself.

### Q08 — current transaction is read-only
```sql
SELECT current_setting('transaction_read_only') AS transaction_read_only,
       current_setting('transaction_isolation') AS transaction_isolation;
```
Expected: `on` and `repeatable read`.

### Q09 — public table-name baseline evidence
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
Expected: exactly 34 rows and exact equality to the separately certified 34-table baseline list. This query returns catalog object names only, never application rows.

## Fail-closed rules

Any SQL error, permission denial, timeout, missing expected row, extra row, count other than 34, unexpected migration-like object, conflicting active DDL/migration session, database/schema mismatch, non-read-only transaction, isolation mismatch, or inability to compare Q09 to the certified baseline fails Gate C.

No repair, retry, fallback query, metadata expansion, application-row read, write, lock acquisition, migration, or schema change is authorized.

## Safety certification

The query set reads only PostgreSQL identity/catalog/activity metadata. It contains no INSERT, UPDATE, DELETE, MERGE, COPY, CREATE, ALTER, DROP, TRUNCATE, GRANT, REVOKE, COMMENT, ANALYZE, VACUUM, REINDEX, CLUSTER, CALL, DO, advisory-lock call, temporary-object creation, or application-table row SELECT.

The only future session-control statements are `BEGIN ... READ ONLY` and `ROLLBACK`.

## Execution boundary

Merging this contract does not authorize Production execution. A future W09-C2F live-preflight authorization must bind this exact version and the exact Git blob/fingerprint of this file, the then-current canonical commit/tree, exact Production identity, one bounded read-only session, and zero-write/no-retry constraints.

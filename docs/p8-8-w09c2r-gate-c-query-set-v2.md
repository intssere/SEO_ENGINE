# P8.8 W09-C2R — Gate-C SELECT-only catalog query set v2

**Issue:** #624
**Version:** `p8-8-w09c2r-gate-c-query-set-v2`
**Status:** OFFLINE QUERY CONTRACT — NOT AUTHORIZED FOR PRODUCTION EXECUTION
**Supersedes for future authorization:** W09-C2G v1; v1 remains immutable historical evidence.

## Frozen identities

Migration blobs remain:
- 0005: `b25d111af1610ea1a13333b6fbdaf4f521aea131`
- 0006: `1079b9687472abf387cb67421efa7d1f1ffcbc35`
- 0007: `a98ca47f9735d7fe4f53feebde38562102cbf6f2`

Gate C v2 additionally requires the exact W09-C2R 34-table baseline artifact from this issue. A count-only baseline is forbidden.

## Session envelope

A future separately authorized executor may open at most one Production session only after the then-current identity/lineage and recovery gates PASS. It must establish:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
```

Run Q00–Q09 exactly once each, in order, then `ROLLBACK;` on PASS or FAIL. No retry. No application-row reads.

## Q00 — database identity

```sql
SELECT current_database() AS database_name;
```

Expected: exact independently attested database name.

## Q01 — schema/search-path and sites resolution

```sql
SELECT
  current_schema() AS current_schema,
  current_schemas(false) AS explicit_search_path,
  to_regclass('sites')::oid AS unqualified_sites_oid,
  to_regclass('public.sites')::oid AS public_sites_oid;
```

Expected: `current_schema='public'`; both OIDs non-null and equal. Any search-path state that causes unqualified `sites` not to resolve exactly to `public.sites` fails closed.

## Q02 — public base-table count

```sql
SELECT count(*)::integer AS public_base_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
```

Expected: exactly 34. This is necessary but not sufficient; Q09 exact-name equality is mandatory.

## Q03 — public.sites(id) FK prerequisite using pg_attribute.attnum

```sql
SELECT
  c.data_type,
  c.udt_name,
  c.is_nullable,
  a.attnum,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint con
    WHERE con.conrelid = rel.oid
      AND con.contype IN ('p','u')
      AND con.conkey = ARRAY[a.attnum]::smallint[]
  ) AS id_has_single_column_key
FROM information_schema.columns c
JOIN pg_catalog.pg_namespace nsp
  ON nsp.nspname = c.table_schema
JOIN pg_catalog.pg_class rel
  ON rel.relnamespace = nsp.oid
 AND rel.relname = c.table_name
JOIN pg_catalog.pg_attribute a
  ON a.attrelid = rel.oid
 AND a.attname = c.column_name
 AND a.attnum > 0
 AND NOT a.attisdropped
WHERE c.table_schema = 'public'
  AND c.table_name = 'sites'
  AND c.column_name = 'id';
```

Expected: exactly one row; `udt_name='uuid'`; `is_nullable='NO'`; `attnum>0`; `id_has_single_column_key=true`. This intentionally uses `pg_attribute.attnum`, not `information_schema.columns.ordinal_position`, because `pg_constraint.conkey` stores attribute numbers.

## Q04 — migration-table absence

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

## Q05 — explicit migration-index absence

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

## Q06 — migration-namespace relation absence

```sql
SELECT c.relname, c.relkind
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

Expected: zero rows.

## Q07 — activity visibility and conflicting DDL/migration sessions

```sql
WITH capability AS (
  SELECT
    r.rolsuper
    OR pg_catalog.pg_has_role(current_user, 'pg_read_all_stats', 'member')
      AS full_activity_visibility
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = current_user
),
conflicts AS (
  SELECT count(*)::integer AS conflicting_session_count
  FROM pg_catalog.pg_stat_activity
  WHERE datname = current_database()
    AND pid <> pg_backend_pid()
    AND state <> 'idle'
    AND (
      query ~* '(^|[[:space:];])(alter|create|drop|truncate|reindex|cluster|vacuum[[:space:]]+full)([[:space:]]|$)'
      OR query ~* '000[567]_p8_8_policy_mutation'
      OR query ~* 'policy_mutation_(reservations|control|claims|dispatch)'
    )
)
SELECT
  capability.full_activity_visibility,
  CASE
    WHEN capability.full_activity_visibility
      THEN conflicts.conflicting_session_count
    ELSE NULL
  END AS conflicting_session_count
FROM capability
CROSS JOIN conflicts;
```

Expected: exactly one row, `full_activity_visibility=true`, `conflicting_session_count=0`. If the role is not superuser and is not a member of `pg_read_all_stats`, Gate C fails closed because absence of visible conflicting DDL cannot be established. Retained evidence must never include another session's `query` text.

## Q08 — transaction fence

```sql
SELECT current_setting('transaction_read_only') AS transaction_read_only,
       current_setting('transaction_isolation') AS transaction_isolation;
```

Expected: `on` and `repeatable read`.

## Q09 — exact canonical public table-name baseline

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected: exactly 34 rows and exact ordered equality to the separately frozen W09-C2R canonical 34-table baseline. Count equality without exact names fails closed.

## Fail-closed rules

Any SQL error, permission denial, timeout, missing/extra row, object-resolution mismatch, insufficient activity visibility, conflicting session, count other than 34, exact-name baseline mismatch, migration-like object, transaction-fence mismatch, or independently attested database mismatch stops the gate. Always attempt `ROLLBACK`; no automatic retry.

This contract authorizes no Production execution. A future live packet must pin this exact artifact blob/version, the baseline blob, migration blobs, then-current canonical source, and independently certified current deployment/database lineage before a session may be opened.

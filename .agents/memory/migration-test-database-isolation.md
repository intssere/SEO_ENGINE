# Migration test database isolation

Migration integration tests must never fall back to a generic runtime database variable such as `DATABASE_URL`.

## Rule

Every migration integration test that can execute DDL/DML must:

- use a dedicated task-specific ephemeral database environment variable;
- skip or fail closed when that dedicated variable is absent;
- require an explicitly recognized local/CI database identity before mutation;
- verify the expected pre-migration schema state before applying anything;
- never attempt compensating DDL against a shared Development or Production database;
- keep Development/Production reconciliation as a separate explicitly authorized operation.

## P12.2 precedent

P12.2 uses `P12_2_EPHEMERAL_DATABASE_URL`.

This rule was added after an early local P12.2 migration test accidentally inherited Replit Development `DATABASE_URL` and applied migration 0004 there. Production was not touched.

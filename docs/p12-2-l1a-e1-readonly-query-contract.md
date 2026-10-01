# P12.2-L1A-E1 — exact read-only Production observation query contract

## Result

**FIXED QUERY SET IMPLEMENTED / NO PRODUCTION SQL EXECUTED.**

This repository artifact converts the merged L1A observation packet into an exact, fingerprinted query set. It creates no database connection and contains no execution adapter.

## Canonical parent

`9e67a2f72cdd2f5a0a94f248bd3b20a048f88555`

## Fixed query set

The future separately authorized observation may execute exactly seven SELECT statements, in this order:

1. database/session identity;
2. count public base tables;
3. inventory the three P12.2 table names;
4. inspect columns for only those three tables;
5. inspect constraints for only those three tables;
6. inspect indexes for only those three tables;
7. primary-key lookup of exactly one `sites` row.

The exact site query is:

`SELECT id::text AS id, canonical_origin FROM public.sites WHERE id = $1::uuid`

with the single parameter:

`eb1da9ee-539c-4200-8f04-f64ccaea7768`

No other `sites` columns or rows are admissible.

## Metadata scope

The schema queries are restricted to:

- `information_schema.tables`;
- `information_schema.columns`;
- `pg_catalog.pg_constraint`;
- `pg_catalog.pg_class`;
- `pg_catalog.pg_namespace`;
- `pg_catalog.pg_indexes`.

The P12 table filter is exactly:

- `first_party_crawl_checkpoints`;
- `first_party_crawl_completed_runs`;
- `first_party_crawl_incremental_receipts`.

## Static safety rules

The contract fails closed if:

- query count/order changes;
- any query is not a SELECT;
- any query contains a semicolon/multiple statements;
- mutation/DDL/control keywords are introduced;
- the exact site query or parameter changes.

No free-form SQL is part of this contract.

## Authorization identity

The module derives a deterministic SHA-256 fingerprint from the ordered query IDs, normalized SQL and parameters.

A future live observation must use the exact literal:

`AUTHORIZE:P12_2_L1A_READ_ONLY_OBSERVATION:<querySetFingerprint>`

The literal is not pre-authorized by this PR. It merely defines the exact future authorization identity.

## Execution requirements for a future live observation

A future executor must additionally prove before sending any query:

- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`;
- environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- Postgres service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
- one bounded observation attempt;
- read-only transaction/session semantics;
- exact query-set fingerprint;
- exact user authorization literal.

It must stop on the first unexpected result or execution error. No retry is implied.

## Hard exclusions

This task performs and authorizes none of:

- Production SQL execution;
- Production DDL/DML;
- migration 0004;
- crawl/network requests;
- persistence writes;
- provider/OAuth access;
- scheduler/worker activation;
- Railway configuration changes;
- deployment/publication;
- Production image transition.

## Next boundary

After this query contract is CI-certified and separately merged, the project may prepare the exact live L1A one-attempt execution authorization using the fingerprint emitted by the merged contract.

The live observation itself still requires explicit user authorization.

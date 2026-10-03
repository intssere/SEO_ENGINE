# P12.2-L7.1 — Production migration 0008 read-only applicability certification

## Purpose

L7.1 creates a fresh, non-replayable, SELECT-only Production schema certification surface for:

`lib/db/migrations/0008_first_party_crawl_l2_invocations.sql`

This milestone does **not** apply the migration.

## Exact migration identity

- repository blob: `1635c7da4cb1deac343b1d6aa73f334e1dd7e15a`
- file SHA-256: `a3604fc210374392426e1a75a1dacc3a89651942466ff4b6d76c620e120dd25b`

CI hashes the actual repository file and fails if it differs from the bound SHA-256.

## Read-only query surface

The certification runner executes exactly nine statements:

1. database/user/server identity;
2. public base-table count;
3. any-schema presence of `first_party_crawl_l2_invocations`;
4. public L2 table columns;
5. public L2 table constraints;
6. public L2 table indexes;
7. exact legacy P12 table inventory;
8. exact legacy P12 columns;
9. exact Diamond Shelf site row.

Every statement must begin with `SELECT`, contain no semicolon, and pass a mutation-keyword deny list.

The PostgreSQL session additionally enforces:

`default_transaction_read_only=on`

and a 15-second statement timeout.

## Production binding

The authorization fingerprint is bound to:

- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`;
- Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- Postgres service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
- exact migration path/blob/SHA-256;
- exact query-set fingerprint;
- one attempt, zero retries, zero fallback.

## Authorization stages

L7.1 intentionally separates:

1. repository merge;
2. immutable certification image release;
3. Railway one-shot read-only certification execution;
4. migration apply.

Each stage requires its own exact authorization. No authorization may be reused across stages.

## Out of scope

This milestone does not authorize:

- applying migration 0008;
- changing the Production application image;
- restarting or redeploying Postgres;
- live crawl execution;
- scheduler or worker activation;
- provider writes or public-site writes.

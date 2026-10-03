# P12.2-L7.2 — one-shot Production migration 0008 apply runner

## Purpose

L7.2 creates a separately authorized, fail-closed Production runner for the exact migration:

`lib/db/migrations/0008_first_party_crawl_l2_invocations.sql`

L7.2 repository work does not apply the migration.

## Certified prerequisite

L7.1 observed Production with:

- 37 public base tables;
- no `first_party_crawl_l2_invocations` table in any schema;
- the three legacy P12 crawl tables present with expected columns;
- Diamond Shelf site `eb1da9ee-539c-4200-8f04-f64ccaea7768` active at `https://diamondshelf.us`;
- one SELECT-only attempt, zero retries, zero fallback.

## Exact migration identity

- Git blob: `1635c7da4cb1deac343b1d6aa73f334e1dd7e15a`
- SHA-256: `a3604fc210374392426e1a75a1dacc3a89651942466ff4b6d76c620e120dd25b`

The runtime image copies these exact repository bytes and validates the SHA-256 before any database process starts.

## Execution contract

The Production apply runner:

1. validates exact Railway project/environment/Postgres binding;
2. validates the exact apply authorization literal;
3. validates `DATABASE_URL` shape without printing it;
4. hashes the copied migration file and requires the exact SHA-256;
5. starts exactly one `psql` process;
6. inside that process, verifies the certified pre-state;
7. includes the exact migration file via psql `\\i`;
8. records post-apply table count, L2 table presence, columns, constraints, indexes, and Diamond Shelf site binding;
9. requires 38 public base tables and the L2 invocation table present.

The psql session uses:

- `ON_ERROR_STOP=1`;
- 15-second statement timeout;
- 5-second lock timeout;
- one process;
- one attempt;
- zero retries;
- zero fallback.

## Authorization separation

There are four distinct boundaries:

1. PR merge authorization;
2. immutable apply-image release authorization;
3. Production migration-apply authorization;
4. later Production application-image transition authorization.

No authorization is reusable across boundaries.

## Out of scope

This milestone does not authorize:

- Production app image changes;
- live crawl execution;
- scheduler/worker activation;
- provider/public-site writes;
- Postgres restart/redeploy.

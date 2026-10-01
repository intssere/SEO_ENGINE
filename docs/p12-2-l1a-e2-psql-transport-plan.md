# P12.2-L1A-E2 — bounded external psql transport plan

## Result

**REPOSITORY-ONLY PSQL COMMAND PLAN IMPLEMENTED / NO DATABASE CONNECTION OR SQL EXECUTION.**

The Railway scoped-agent attempt proved that the available Railway agent transport cannot execute arbitrary PostgreSQL SQL. E2 therefore defines, but does not execute, a narrowly bounded external `psql` transport.

## Canonical parent

`294ea23d730ae3574236d1cdeaa7debb86a5efc2`

## Source of truth

E2 imports the merged E1 contract directly:

`p12-2-l1a-e1-readonly-query-contract.ts`

It does not duplicate or independently redefine the seven approved SELECTs.

The E1 query-set fingerprint remains the transport identity.

## What E2 produces

E2 builds exactly seven command descriptors, one for each E1 query, preserving exact order.

Each descriptor is:

- executable name: `psql`;
- `--no-psqlrc`;
- `--set ON_ERROR_STOP=1`;
- `--tuples-only`;
- `--csv`;
- one `--command` argument containing exactly one SELECT;
- retries: zero.

E2 itself:

- does not call `psql`;
- does not spawn any process;
- does not read `DATABASE_URL`;
- does not inspect environment variables;
- does not materialize credentials;
- does not open a network connection.

## Site parameter handling

The seventh E1 query uses one positional UUID parameter.

For a future external `psql` invocation, E2 renders only the already-certified site ID:

`eb1da9ee-539c-4200-8f04-f64ccaea7768`

as a quoted UUID literal in the exact final SELECT.

No arbitrary parameter input is accepted.

## Fail-closed properties

The E2 plan rejects:

- E1 query-count drift;
- query-set fingerprint mismatch;
- authorization-literal mismatch;
- command order drift;
- executable drift;
- missing safety flags;
- non-SELECT SQL;
- semicolon/multi-statement SQL;
- retries;
- fallback transport;
- credential reads;
- process execution inside the repository module.

## Future live transport

A future separately authorized operator may use a trusted environment that already possesses the Production Postgres connection string and execute the seven descriptors exactly once.

That live operator must:

1. bind to Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`;
2. bind to Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
3. bind to Postgres service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
4. use the exact certified E1 query-set fingerprint;
5. execute commands 1 through 7 once, sequentially;
6. stop immediately on the first failure;
7. perform zero retries;
8. emit sanitized result evidence only;
9. never print the connection string or credentials.

The future live authorization literal is:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:<E1-query-set-fingerprint>`

This document does not grant that authorization.

## Hard exclusions

E2 performs or authorizes none of:

- Production DB connection;
- SQL execution;
- Railway variable/credential reads;
- Railway Function creation;
- DDL/DML;
- migration 0004;
- crawl/network requests;
- persistence writes;
- provider/OAuth access;
- scheduler/worker activation;
- deploy/redeploy/restart/publication.

## Next boundary

After CI certification and merge of E2, the next step is a separately authorized one-shot live `psql` observation using the exact E2 authorization literal. If no safe trusted execution environment with access to the Production connection string is available, stop rather than creating infrastructure or changing Railway configuration implicitly.

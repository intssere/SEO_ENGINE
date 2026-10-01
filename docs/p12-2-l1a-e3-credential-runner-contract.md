# P12.2-L1A-E3 — credential-bearing one-shot psql runner contract

## Result

**PURE ONE-SHOT RUNNER CONTRACT IMPLEMENTED / NO PRODUCTION CONNECTION OR SQL EXECUTION.**

E3 turns the canonical E2 command plan into an injectable execution wrapper while keeping all credential-bearing behavior outside repository tests.

## Canonical parent

`822e1dde4ba82fcbc1d94c3e305aa199402870cf`

## Runtime inputs

A future live invocation must provide exactly:

- the canonical E2 live authorization literal;
- one in-memory `DATABASE_URL`;
- one injected process executor.

E3 does not fetch Railway variables, discover credentials, create infrastructure, or provide a default executor.

## Execution behavior

The wrapper:

- imports the canonical E2 plan;
- revalidates the E2 plan before execution;
- requires an exact authorization literal match;
- accepts only a PostgreSQL/Postgres URL-shaped runtime value;
- passes the credential only in the child-process environment as `DATABASE_URL`;
- executes E2 commands 1 through 7 sequentially;
- stops on the first non-zero exit;
- performs zero retries;
- performs no fallback transport;
- never returns or serializes the database URL.

## Output sanitization

Captured stdout/stderr are sanitized by replacing any exact occurrence of the supplied connection string with:

`[REDACTED_DATABASE_URL]`

The receipt reports only:

- query ordinal and query ID;
- exit code;
- sanitized stdout/stderr;
- completion/stopped ordinal;
- certified fingerprint/authorization identity;
- fixed one-attempt/zero-retry/no-fallback assertions.

## Repository-test boundary

Tests use a fake injected executor only. They do not:

- spawn `psql`;
- read `DATABASE_URL` from the environment;
- connect to Railway;
- execute SQL;
- access Production.

## Future live prerequisite

A future live runner environment must already possess both:

1. a working `psql` client; and
2. the exact Production Postgres `DATABASE_URL` injected without printing it.

The live runner must use the existing authorization literal:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

The authorization already granted in the prior conversation remains unconsumed because no SQL has run, but this repository artifact itself neither consumes nor re-grants it.

## Hard exclusions

E3 performs or authorizes none of:

- Railway variable-value reads;
- Railway Function/service creation;
- Production DB connection in repository tests;
- DDL/DML;
- migration 0004;
- crawl/network requests;
- persistence writes;
- provider/OAuth access;
- scheduler/worker activation;
- deploy/redeploy/restart/publication.

## Next boundary

After CI certification and merge of E3, a separately authorized credential-bearing execution surface may inject the already-existing Production connection value and invoke E3 exactly once. If the environment cannot provide the credential without exposing it, stop rather than adding an implicit transport.

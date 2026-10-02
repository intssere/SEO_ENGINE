# P12.2-L1A-E4 — credential-bearing execution surface and audit record

## Result

**EXECUTION-SURFACE PREREQUISITES + SANITIZED AUDIT CONTRACT IMPLEMENTED / NO LIVE EXECUTION.**

## Canonical parent

`4d5d75a51b95cc644370adbdeb398ebbbbc583a7`

## Exact Production binding

A future live E3 invocation is eligible only when all three identifiers match:

- Railway project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- Production environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- Postgres service: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`

## Mandatory live prerequisites

Before the one-shot may be consumed, the execution surface must prove:

1. `psql` is available;
2. the exact Production `DATABASE_URL` is injected at runtime;
3. the credential is not printed;
4. the authorization literal exactly equals:
   `AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`;
5. retries configured = 0;
6. fallback transport configured = false;
7. project/environment/service IDs match the fixed binding above.

Any mismatch blocks execution before E3 is invoked.

## Preflight audit receipt

The preflight receipt records only non-secret facts:

- contract version;
- exact Railway IDs;
- E3 version;
- authorization literal;
- one-attempt/zero-retry/no-fallback assertions;
- credential-material-recorded = false;
- deterministic SHA-256 fingerprint.

It records no connection string, username, password, host, or rendered environment-variable value.

## Outcome audit receipt

After E3 returns, E4 derives a second deterministic receipt containing only:

- preflight fingerprint;
- completed vs stopped;
- stopped ordinal;
- observed query-receipt count;
- attempts = 1;
- retries = 0;
- fallback transport used = false;
- credential material recorded = false;
- deterministic outcome fingerprint.

E4 refuses to produce an outcome receipt if E3 reports authorization drift, more than one attempt, any retry, fallback transport, or credential material.

## Authorization state

The previously granted live authorization remains the operative authorization:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

E4 neither consumes nor renews it. Consumption occurs only when the live E3 executor sends the first certified Production SELECT.

## Hard exclusions

This repository task performs and authorizes none of:

- Production credential-value reads;
- Production DB connection or SQL;
- Railway service/function creation;
- variable/config mutation;
- DDL/DML or migration 0004;
- crawl/network/provider/OAuth activity;
- persistence writes;
- scheduler/worker activation;
- deployment/publication.

## Next boundary

After CI certification and merge of E4, the project may implement or select a credential-bearing execution surface. That surface must satisfy E4 exactly before it is allowed to consume the already-granted one-shot authorization.

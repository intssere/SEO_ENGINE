# P12.2-L1A-E5 — one-shot credential runner entrypoint

## Result

**CANONICAL OPERATOR ENTRYPOINT IMPLEMENTED / NO LIVE EXECUTION.**

E5 packages the already-merged E3 runner and E4 execution-surface/audit contracts into one callable one-shot entrypoint.

## Canonical parent

`d3610a9e9ce550cafa3ba4734bcd05f2cbea52b6`

## Purpose

E5 removes the remaining repository-side composition gap between:

- E4 preflight certification;
- E3 seven-query one-shot execution;
- E4 outcome attestation.

It does not create or discover a credential-bearing environment.

## Runtime contract

A future live caller must provide:

- the exact existing authorization literal;
- the Production `DATABASE_URL` as an in-memory runtime value;
- confirmation that `psql` is available;
- confirmation that the credential will not be printed;
- retries configured = 0;
- fallback transport configured = false;
- one injected process executor.

E5 itself does not:

- read process environment variables;
- fetch Railway variables;
- spawn `psql` directly;
- connect to PostgreSQL;
- execute on import/startup;
- create services/functions;
- deploy anything.

## One-shot consumption semantics

The existing Production authorization is considered **consumed when the injected executor is invoked for the first certified SELECT**.

Therefore:

- preflight failure => authorization remains unconsumed;
- failure before executor invocation => authorization remains unconsumed;
- query 1 invocation, regardless of success/failure => authorization is consumed;
- there are zero retries and no fallback transport.

The E5 receipt exposes this explicitly as:

`productionSqlAttemptConsumed`

## Receipt composition

A successful E5 call returns:

1. E4 preflight receipt;
2. E3 execution receipt;
3. E4 outcome receipt;
4. one-shot consumption state.

All credential material remains excluded. Any accidental appearance of the exact runtime connection string in child output is redacted by E3.

## Existing authorization

The already-granted live authorization remains:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

E5 neither renews nor automatically consumes it. Consumption occurs only at the first live executor invocation.

## Hard exclusions

This repository task performs or authorizes none of:

- Production credential acquisition;
- Production database connection;
- SQL execution in CI/tests;
- Railway service/function creation;
- Railway variable/config mutation;
- migration 0004;
- crawl/network/provider/OAuth activity;
- persistence writes;
- scheduler/worker activation;
- deployment/publication.

## Next boundary

After CI certification and merge of E5, repository engineering for the L1A live observation path is complete.

The only remaining L1A blocker will be an actual trusted runtime that simultaneously has:

- a working `psql` binary; and
- the exact Production Postgres `DATABASE_URL` injected without exposing it.

Once such a runtime exists and satisfies E4, the already-authorized E5 one-shot can be executed exactly once.

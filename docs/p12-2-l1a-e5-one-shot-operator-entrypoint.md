# P12.2-L1A-E5 — one-shot credential runner entrypoint

## Result

**CANONICAL OPERATOR ENTRYPOINT IMPLEMENTED WITH RUNTIME RAILWAY BINDING VERIFICATION / NO LIVE EXECUTION.**

E5 packages the already-merged E3 runner and E4 execution-surface/audit contracts into one callable one-shot entrypoint.

## Runtime binding correction

E5 now requires the caller to supply the **runtime-observed** Railway identifiers:

- project ID;
- environment ID;
- Postgres service ID.

Those actual values are passed to E4 preflight and must exactly match the certified Production binding. E5 no longer substitutes the expected E4 IDs itself.

This closes the fail-closed gap where a runner in the wrong Railway context could otherwise inherit expected constants and pass preflight.

## Runtime contract

A future live caller must provide:

- runtime-observed Railway project/environment/Postgres service IDs;
- the exact existing authorization literal;
- the Production `DATABASE_URL` as an in-memory runtime value;
- confirmation that `psql` is available;
- confirmation that the credential will not be printed;
- retries configured = 0;
- fallback transport configured = false;
- one injected process executor.

Any runtime binding mismatch fails before the first executor invocation and therefore leaves the one-shot authorization unconsumed.

## One-shot consumption semantics

The existing Production authorization is considered **consumed when the injected executor is invoked for the first certified SELECT**.

Therefore:

- runtime-binding/preflight failure => authorization remains unconsumed;
- failure before executor invocation => authorization remains unconsumed;
- query 1 invocation, regardless of success/failure => authorization is consumed;
- there are zero retries and no fallback transport.

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

This correction neither renews nor consumes it.

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

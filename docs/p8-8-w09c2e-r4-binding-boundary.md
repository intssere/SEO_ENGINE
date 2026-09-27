# P8.8 W09-C2E-R4 — Side-effect-free Production binding composition boundary

## Purpose

The R3 Production attempt failed closed because the only bound R2 supplier was exported by the API startup module. Importing that module also performs database identity initialization and starts the server, which is outside the zero-session P3 authority.

R4 separates binding composition from runtime startup. It grants no Production authority.

## Contract

`p8-8-w09c2e-r4-binding-boundary-v1`:

- reads only the already-designated `DATABASE_URL` process binding at module composition time;
- passes that opaque value directly to certified R2 `createProductionBindingSupplier`;
- exports the resulting inert supplier;
- performs no parsing, logging, hashing, persistence, network access, database connection/session, SQL, provider access, server startup, scheduler/worker activation, or fallback lookup;
- does not inspect alternate binding variables.

The existing API startup imports this supplier. Its subsequent database identity initialization and listen behavior remain unchanged.

## Synthetic certification

Tests must prove:

1. the boundary exports the exact R4 version and an inert supplier;
2. only `DATABASE_URL` is eligible; alternate variables are not fallbacks;
3. the binding is captured once at composition time;
4. R1/R2/parser certified implementations remain unchanged.

## Production re-certification

After merge, the new canonical generation invalidates the prior H3/H4/H5/H6 provenance tuple. A future Production reattempt therefore requires a fresh canonical freeze and fresh H3 → H4 → H5 → H6 chain before a newly authorized P3 invocation.

No Production binding access, deployment/publication, database/provider action, migration, Railway mutation, UGP action, or W09-C Stage 0 is authorized by this change.

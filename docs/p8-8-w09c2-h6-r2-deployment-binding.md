# P8.8 W09-C2 H6-R2 — Replit deployment-identity binding extension

## Purpose

The first authorized P2-H6 observation proved the exact canonical application SHA, tree SHA, source branch, and serving-provenance fingerprint, but failed closed because H6-R1 did not observe the Replit deployment/publication identity required by the R3 gate.

H6-R2 closes only that evidence gap. It grants no Production action authority.

## Trust model

H6-R2 is a pure two-channel attestation.

1. **Serving channel:** the existing certified H6-R1 loader validates the immutable build-provenance artifact served by the running application.
2. **Control-plane channel:** the authorized observer obtains exactly one Replit publication-status observation for the target app and supplies only the allowlisted non-secret tuple: deployment/publication identity, terminal status, and Production URL.
3. **Pure binding:** H6-R2 requires exact equality between both observations and the pre-authorized expected commit/tree/branch/fingerprint/deployment/URL tuple.

The application does not call Replit, inspect undocumented deployment environment variables, read DATABASE_URL, or infer deployment identity from a caller assertion.

## Version

`p8-8-w09c2-h6-r2-deployment-binding-v1`

## PASS requirements

A PASS requires all of:

- H6-R1 result is `pass/ok`;
- canonical application SHA exactly equals the authorized SHA;
- canonical tree SHA exactly equals the authorized tree;
- source branch is exactly `main`;
- serving-provenance fingerprint exactly equals the authorized fingerprint;
- Replit control-plane observation has exactly the allowlisted keys;
- observed deployment/publication identity is a UUID and exactly equals the authorized identity;
- observed publication status is exactly `success`;
- observed Production URL is an HTTPS origin URL with no credentials/query/fragment and exactly equals the authorized URL.

Any absence, malformed evidence, non-success status, mismatch, or ambiguity fails closed.

## Observation procedure for a future H6 reattempt

A future separately authorized H6-R2 operation must be one bounded logical attestation:

1. revalidate GitHub main and the frozen expected identity before consuming the H6 observation;
2. obtain one Replit control-plane publication-status observation for the already-published deployment;
3. obtain one serving H6-R1 provenance observation from the exact observed Production URL;
4. pass only the sanitized control-plane tuple and H6-R1 result into H6-R2;
5. return only the H6-R2 sanitized result;
6. do not retry either evidence channel after an attempted H6-R2 operation without new explicit authorization.

The authorization must bind the exact commit, tree, branch, fingerprint, deployment/publication identity, Production URL, H6-R1 version, and H6-R2 version.

## Hard boundaries

H6-R2 permits no database/provider/public-site mutation, DATABASE_URL or Production-binding access, SQL/catalog/session access, migration, persistence, filesystem secret read, additional environment lookup, config/credential mutation, build/publication/restart, scheduler/worker/autonomous activation, Railway staging action, UGP action, P3 binding attestation, or W09-C Stage 0.

Tests are synthetic only. H6-R1 remains unchanged.

## Certification criteria

The implementation is certifiable only when:

- branch starts from the exact canonical main used for this corrective cycle;
- scope is H6-R2 module, synthetic tests, and this specification;
- exact-head required CI succeeds;
- zero unresolved review threads remain;
- no Production/Replit mutation or new H6 observation occurs;
- no Railway or UGP action occurs.

Merge requires separate explicit authorization. A merge does not authorize build, publication, H6 reattempt, P3, migration, or Stage 0.

Closes #582.

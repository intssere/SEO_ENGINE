# CVI-1C.23 — Private Express-to-DB historical GSC readback composition

Date: 2026-10-10. Status: new stacked draft; exact-head full CI pending.

## Certified predecessors
- PR #1013 CVI-1C.21 exact HEAD 6125e44de444224e79db0c5df71225b9507a3086 — terminal full GitHub CI SUCCESS, run 38038832103.
- PR #1017 CVI-1C.22 exact HEAD f565433baa29676a5f15580362371449e4944425 — terminal full GitHub CI SUCCESS, run 38038837286, including disposable PostgreSQL proof.
- All implementation PRs remain draft/open/unmerged; no production migrations are applied.

## New increment
- Draft PR #1018: https://github.com/intssere/SEO_ENGINE/pull/1018
- Head workstream/cvi-1c23-private-express-db-composition-pr1017-dependent
- Base workstream/cvi-1c22-disposable-server-scope-pr1013-dependent
- Initial HEAD 8f7c18f293c0537faca16b9d4ff28ceac049565c
- CI proof branch ugp-cvi-1c23-ci-proof-20261010; run 38039331794 in progress at checkpoint.
- Source artifacts/api-server/src/lib/cvi-gsc-private-express-db-composition.ts
- Unit tests artifacts/api-server/src/lib/cvi-gsc-private-express-db-composition.test.ts.

## Flow
1. Accept only acquisitionId, untrusted historical lineage, and protected req.auth reference (not a tenant/site/connection/session request parameter).
2. CVI-1C.20 independently requires enabled/configured app authentication and an unexpired coherent Express req.auth principal. Disabled general application auth mode is explicitly rejected.
3. CVI-1C.21 resolves tenant/site/Google readonly connection using a parameterized, row-locked SQL query with subject/session and active site/membership/grant requirements.
4. CVI-1C.17 adapter executes CVI-1C.16 independent scoped SQL query against current authorization records and the immutable acquisition tombstone.
5. Returns only DENY or UNTRUSTED_HISTORICAL_REVIEW_ONLY with provider-origin verification, future access authorization, execution and publication flags permanently false.

## Security review
- The two SELECTs independently recheck revocation. This is not a single atomic cross-statement authorization transaction or permanent capability.
- The composition itself has no HTTP route, API mount, middleware order enforcement or real production DB connection. It trusts the supplied req.auth to be protected by existing authenticated middleware and the postgres.Sql instance to come from reviewed server configuration.
- The acquisition ID remains a locator, not authentication. No client-supplied tenant or session fields are accepted as scope source.
- No Google HTTPS/OAuth provenance, factual accuracy or content licensing proof exists in this increment.
- No production migration, live provider requests, secrets, CMS writes, PR merge or deployment.

## Next
1. Verify terminal full CI success at PR #1018 HEAD, repair if necessary.
2. Add integration test with real disposable postgres.Sql traversing both statements and deny on revocation between independent checks, without creating a public route.
3. Before any real endpoint, independently audit Express attachAuthSession + requireApiAuthentication order and require explicit bounded authorization and current granted session data.

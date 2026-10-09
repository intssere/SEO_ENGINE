# CVI-1B.4K — recognized provider read scopes in SQL preflight

Date: 2026-10-09
Status: DRAFT STACKED PR, exact-head CI pending, NOT DEPLOYED.

## Verified predecessor
- CVI-1B.4I PR #951 HEAD 19985b0e1ec5ec2aa80c4dfee9fdf0ab3c327e67: full CI SUCCESS, run 37904321622.
- CVI-1B.4J PR #954 HEAD d2e677edf17fdd7ba6058385ecca7addd5d0a7af: full CI SUCCESS, run 37904329024.
- Both remain draft, open and unmerged.

## Current increment
- CVI-1B.4K PR #956: https://github.com/intssere/SEO_ENGINE/pull/956
- Branch: workstream/cvi-1b4k-recognized-read-scopes-pr954-dependent
- Base: workstream/cvi-1b4j-provider-scope-resource-binding-pr951-dependent
- Exact HEAD at handoff: 70f5cb19def6dc8e98faf092fb5d77ce30ecd0c0.
- CI proof branch at same HEAD: ugp-cvi-1b4e-ci-proof-20261009-k.

## Code
- artifacts/api-server/src/lib/cvi-trusted-read-preflight.ts: replaces any nonempty scope with explicit GSC webmasters.readonly or Shopify read_content scope, rejects scopes that are write/edit/manage-capable, and requires syntactically valid Shopify permanent external domain.
- lib/db/src/cvi-1b4e-disposable-acl-migration.test.ts: actual PostgreSQL tests for irrelevant Google Analytics scope, read+write mixed scopes, unsupported providers, mismatched Shopify domain, positive read-scope preflight and recovery after fixture reset.
- SQL remains read-only, parameterized and NOT invoked by production runtime. All returned flags are necessary-condition checks only, never independent site authorization.
- Scope requirements reuse existing OAuth manager constants semantically but SQL expresses literal recognized scope strings. Verify drift with follow-on contract tests.

## Threat and production limitations
- Neither scopes nor external account strings prove provider property ownership; there is no verified OAuth provider attestation or GSC/Shopify resource entitlement.
- The preflight only inspects stored server-side connection rows, which require authoritative lifecycle management before being trusted.
- An eligible SQL result only means PENDING_INDEPENDENT_SITE_BINDING, never VERIFIED_READ or permission to execute/publish.
- No schema migration, runtime route, provider call, production deployment, merge, CMS write or worker activation occurred.

## Next
1. Verify PR #956 CI exact HEAD and disposable Postgres test. Fix any SQL and test defects on branch; rerun exact-head CI.
2. Investigate independent provider property access attestation and canonical resource binding with time-bounded, revocation-aware server-only resolver.
3. Separately prioritize CVI trusted source acquisition, factual verification, editorial workflows and UGP integration. Do not conflate these with security preflight completion.

## CI repair and current exact head (2026-10-09)
- First PR #956 HEAD `70f5cb19def6dc8e98faf092fb5d77ce30ecd0c0` FAILED disposable PostgreSQL certification, run 37906511912. Root cause: JavaScript string.replace interpolation treated the SQL regex `$'` as replacement-template suffix, corrupting the TypeScript SQL literal; not a provider or database policy failure.
- Repaired SQL literal using direct string construction, then replaced regexp backslash-escaped dots with unambiguous PostgreSQL character classes `[.]`.
- PR #956 CURRENT HEAD: `0cf039beeaebe48fed20f458842aaa5186c8edfb`.
- New exact-head GitHub CI proof branch `ugp-cvi-1b4e-ci-proof-20261009-k-r3` triggers run 37906724434, IN PROGRESS at handoff. Earlier proof branches must NOT substitute for this head.
- No runtime, database, production or provider operation was performed. Static inspection does not substitute for successful current-head disposable PostgreSQL certification.

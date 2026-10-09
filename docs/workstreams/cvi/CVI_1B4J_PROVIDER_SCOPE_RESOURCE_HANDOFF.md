# CVI-1B.4J — provider scope and declared resource binding

Date: 2026-10-09. Status: DRAFT, exact-head CI rerun pending. NO authorization or production actions.

## Stack and heads
- PR #951 CVI-1B.4I original HEAD 67250311d121510397b87426c72b1105f4544c42 had **FAILED** full CI (run 37903593597) because lib/db test directly imported API-server TypeScript, violating db tsconfig rootDir/project boundaries (TS6059, TS6307). Dedicated disposable PostgreSQL test itself had PASSED.
- PR #951 repaired HEAD `45893cd02d4fa87551377376eaa8919c7bdc300e`; new exact-head validation branch `ugp-cvi-1b4e-ci-proof-20261009-i-r2`. It reads the precise SQL template from source text and executes against disposable database without TS cross-project import.
- PR #954 CVI-1B.4J: https://github.com/intssere/SEO_ENGINE/pull/954
- Implementation branch `workstream/cvi-1b4j-provider-scope-resource-binding-pr951-dependent`, base PR #951 branch.
- PR #954 repaired HEAD `deaf597ecd130a2999afc699bc5a0ac11fd99526` includes identical rootDir compatibility repair.
- New CI proof branch `ugp-cvi-1b4j-ci-proof-20261009-r2` at exact PR #954 HEAD.
- Upstream PRs #923, #928, #931, #932, #935, #937, #939, #940, #943, #945, #949, #950 remain stacked, open, draft, unmerged. Neither #951 nor #954 is merged.

## Implemented
- `artifacts/api-server/src/lib/cvi-provider-resource-read-scope.ts` checks existing OAuth declared read-scope constants and UGP site/connection identity agreement.
- Google Search Console requires its read-only webmasters scope; Shopify content requires read_content. Wrong/empty scope, write scopes, inactive/revoked connection, missing/mismatched external resource and site drift DENY.
- `artifacts/api-server/src/lib/cvi-provider-resource-read-scope.test.ts` covers accepted declarations, invalid domain impersonation, missing scope, write scope, Shopify domain mismatch and revoked access.
- When attributes match, result is only PENDING_INDEPENDENT_PROVIDER_ATTESTATION, with independentlyVerified=false, authorizationGranted=false, publicationAuthorized=false and executionAuthorized=false. Declared values are not externally verified.

## Critical limitations
- No provider call, OAuth session trust verification, GSC property-permission attestation or Shopify shop binding verified outside declarations.
- No authenticated authorization capability; provider scopes and resource strings can be spoofed and must never be supplied as trusted by end users.
- No public API endpoint, runtime resolver, actual publishing grant, schema migration, Railway or CMS operations.
- A real resolver must independently verify property entitlement and binding against current provider evidence and enforce per-operation revocation/snapshot safety, preferably under separately certified schema governance.
- Future CVI work should prioritize evidence truth, high-value human editorial assessment and UGP pipeline integration rather than treating these pure contracts as complete production features.

## Next exact actions
1. Monitor/check exact-head full CI for repaired #951 and #954; verify both their dedicated DB proof and full TS typecheck.
2. Repair failures on respective PR branches, refresh dependent stacks without unauthorized rebase/merge.
3. Review provider-specific scope semantics and independent attestation source before enabling any authorization.

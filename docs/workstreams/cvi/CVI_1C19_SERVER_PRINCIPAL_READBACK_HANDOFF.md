# CVI-1C.19 — Server-derived principal facade for historical GSC readback

Date: 2026-10-10. Status: NEW DRAFT; exact-head CI pending.

## Predecessor remediation
- PR #1007 CVI-1C.18 had disposable PostgreSQL proof SUCCESS, but full CI failed TypeScript because literal dynamic import of API source from lib/db pulled API files outside db's rootDir.
- Fixed by using runtime-only computed module path; new PR #1007 head 3d1e0929e4da6b3a8cf67099f37d58ecd9d158ea. Proof branch ugp-cvi-1b4e-ci-proof-20261010-x, run 38036226000. Must verify terminal full CI.
- All CVI implementation PRs remain drafts/unmerged.

## New implementation
- Draft PR #1011: https://github.com/intssere/SEO_ENGINE/pull/1011
- Branch workstream/cvi-1c19-server-principal-readback-pr1007-dependent
- Base workstream/cvi-1c18-disposable-real-adapter-pr1006-dependent
- Initial exact HEAD 3db00868e9bd8644c8bc7b741e0f9e7d9880a98d
- CI proof branch ugp-cvi-1c19-ci-proof-20261010.
- Files artifacts/api-server/src/lib/cvi-gsc-server-principal-readback.ts and matching test.

## Function
- A readback facade accepts only acquisitionId and existing CVI-1C.13 lineage packet. Tenant/site/connection/subject/session cannot be specified as top-level request parameters.
- Trusted server dependencies supply AuthPrincipal, currently selected tenant/site/connection IDs, and wall-clock; facade validates a UUID session, canonical UUID scoped identities, session expiry and principal subject.
- Facade invokes CVI-1C.16 scoped readback which rechecks database current membership/grants/revocation before allowing historical access.
- Missing/expired/invalid principal, wrong lineage tenant/session/site/subject, bad request IDs, missing DB row and store errors all fail closed.
- Output remains either DENY or UNTRUSTED_SCOPED_HISTORICAL_REVIEW_ONLY; all origin, principal-independent-verification and execution/publication flags false.

## Trust gap
- The dependency ports are injectable. They do not independently establish that getAuthenticatedPrincipal uses real signed HttpOnly session cookies or database state. Neither the trusted Express runtime nor provider token service is wired in.
- Caller cannot pass scope fields through the facade's intended surface, but a malicious server factory could still substitute identities. Production wiring needs authenticated principal and proven site/connection selection with strict prevention of request body/header fallback.
- No production migration, runtime route, provider calls, CMS writes, merge or deploy.

## Next
1. Verify full CI results for #1007 and #1011 at exact HEAD. Repair and rerun if needed.
2. Investigate existing authenticated middleware and session store; design trusted runtime adapter after code audit; do not wire a public readback route without separate approval.
3. Continue independent Google TLS/token provenance verification and editorial truth/licensing controls.

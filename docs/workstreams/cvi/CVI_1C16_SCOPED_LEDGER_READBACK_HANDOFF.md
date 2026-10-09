# CVI-1C.16 — Tenant-scoped, revocation-checked historical acquisition readback

Date: 2026-10-09
Status: DRAFT PR, CI in progress; no live production actions.

## Dependencies
- CVI-1C.15 PR #1001 exact SHA 388b1e79cd78a81b98e2da97303c9fc28aecec16; dedicated disposable PostgreSQL test success at prior checkpoint; check terminal full CI separately.
- CVI prior implementation PRs remain open/draft/unmerged.

## Current work
- Draft PR #1003: https://github.com/intssere/SEO_ENGINE/pull/1003
- Head branch workstream/cvi-1c16-scoped-ledger-readback-pr1001-dependent
- Base workstream/cvi-1c15-disposable-gsc-readback-pr997-dependent
- Initial exact HEAD cdf976a6714c4abeca555351be4bd788a9c9e380
- Disposable CI proof branch ugp-cvi-1b4e-ci-proof-20261009-t
- GitHub Actions run 37972350680; full CI pending.

## Source changes
- artifacts/api-server/src/lib/cvi-gsc-scoped-ledger-readback.ts
- artifacts/api-server/src/lib/cvi-gsc-scoped-ledger-readback.test.ts
- lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts appended CVI-1C.16 PostgreSQL test.

## Access pattern
- Parameterized SELECT filters historical nonce ledger by acquisition ID, tenant UUID, site UUID, connection UUID, authenticated subject, session UUID.
- Joins sites, connections, authenticated session, active tenant membership and active site read_evidence grant.
- Checks present active site, connected provider/read-only scope, unrevoked/unexpired session, membership and grant.
- Uses FOR SHARE locks on rows holding access state to serialize SELECT with concurrent UPDATE/revocation at READ COMMITTED.
- Tests exact exported SQL on isolated localhost disposable PostgreSQL after dormant migrations 0014-0016; ensures eligible row reads, other tenant/session/subject blocked, revoked grant and membership blocked.

## Critical limitations
- Identifiers must come from a trusted server-side authenticated principal; supplying them from HTTP requests would defeat the access model.
- Readback permission is a single-statement historical read, never access to live Google, provider truth, factual verification or permission to publish. Previous unscoped readback contract remains test-only and MUST NOT be exposed as an application endpoint.
- No runtime DB adapter is wired, no production migrations applied, no provider calls, secret access, CMS writes, merge or deployment.
- No current production release approval exists for CVI.
- Verify terminal full CI and repair failures with fresh exact-head proof.

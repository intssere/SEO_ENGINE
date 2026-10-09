# CVI-1B.4G — revocation and bounded concurrency certification

Date: 2026-10-09
Status: DRAFT STACKED PR; exact-head CI pending; no production use

## Prior exact-head certification
PR #945 CVI-1B.4F at HEAD `075e486f3accff41270ef6f04663a90e04579806` completed SUCCESS GitHub validate run 37830453218. This included disposable database audit UPDATE/DELETE/TRUNCATE rejection certification.

## New development
- PR #949 https://github.com/intssere/SEO_ENGINE/pull/949
- Work branch `workstream/cvi-1b4g-revocation-concurrency-pr945-dependent`
- Base `workstream/cvi-1b4f-audit-immutability-pr943-dependent`
- HEAD at creation `7c4e60f6c2385c50b39ff12ee2fd97f4797a1246`
- Proof-only branch `ugp-cvi-1b4e-ci-proof-20261009-g` at same commit; drives existing guarded GitHub CI disposable database test.
- File `lib/db/src/cvi-1b4e-disposable-acl-migration.test.ts` extended without runtime changes.
- PR stack #923 > #928 > #931 > #932 > #935 > #937 > #939 > #940 > #943 > #945 > #949 remains separate, draft and unmerged.

## Bounded tests
1. In a dedicated `seo_engine_cvi_disposable` localhost database, add a separate organization, site, membership and grant.
2. Reader transaction observes an active membership/grant then locks the membership row via SELECT FOR UPDATE; second DB connection attempts a membership revocation, first transaction releases lock, and fresh read checks authorization joins no longer match.
3. Site grant revocation separately updates active grants to revoked and verifies no active grant remains.
4. These tests do **not** implement or certify real session/tenant resolver, actual provider resource scope, irreversible cancellation of in-flight provider requests, distributed consistency or production concurrency limits.
5. Test step remains gated to `ugp-cvi-1b4e-ci-proof-*`, database `seo_engine_cvi_disposable`, localhost only, and CI cleanup.

## Remaining concerns
- Review correct DB transaction scheduling, active membership predicate on reads, and whether revoke was actually waiting on the row lock (test observes before/after but does not prove scheduler wait).
- Add separate controlled in-flight authorization vs revocation race fence and transaction boundary requirements before live resolver.
- Define audit issuer and immutable grant lifecycle with human or organizational authorization for activation. Triggers cannot protect from privileged DB owner bypass.
- No live schema migration, credentials, public endpoint, CMS publish, scheduler, provider write or merge was performed.

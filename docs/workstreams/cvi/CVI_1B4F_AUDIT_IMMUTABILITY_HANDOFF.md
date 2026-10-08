# CVI-1B.4F — authorization audit immutability certification handoff
Date: 2026-10-09 (Asia/Karachi)
Status: DRAFT STACKED PR; EXACT-HEAD CI PENDING; NO PRODUCTION CHANGES

## Verified baseline
- PR #943 CVI-1B.4E at HEAD 34256b6496a568c0a207a235d57df1f59cac9e6e: GitHub validate completed SUCCESS (run 37828846897), including dedicated disposable ACL PostgreSQL certification.
- New PR #945 https://github.com/intssere/SEO_ENGINE/pull/945
- Implementation branch: workstream/cvi-1b4f-audit-immutability-pr943-dependent
- Head: 075e486f3accff41270ef6f04663a90e04579806
- Base: workstream/cvi-1b4e-disposable-acl-db-test-pr940-dependent
- Proof-only GitHub Actions branch: ugp-cvi-1b4e-ci-proof-20261009-f (exact same SHA).
- GitHub CI run: 37830453218, queued at time of handoff.
- Stacked dependencies: #923 > #928 > #931 > #932 > #935 > #937 > #939 > #940 > #943 > #945, all draft and unmerged.

## Changes
- lib/db/migrations/0013_cvi_acl_audit_immutability_draft.sql: dormant follow-on migration requiring 0012. Creates a PostgreSQL trigger function raising SQLSTATE 55000 and BEFORE UPDATE / DELETE / TRUNCATE triggers on cvi_tenant_authorization_audit.
- lib/db/src/cvi-1b4e-disposable-acl-migration.test.ts: extends isolated DB certification to apply 0013 only in explicit localhost seo_engine_cvi_disposable and verify INSERT succeeds, UPDATE/DELETE/TRUNCATE fail, original row persists.
- Existing CI step runs only for ugp-cvi-1b4e-ci-proof-* refs and drops its isolated database on exit. No runtime bootstrap or prod migrations.

## Assurance limits
- These triggers block ordinary SQL mutation by callers with trigger execution active. Privileged DB owners/superusers can still disable triggers or alter/drop schema, and they do not establish independently verifiable offsite append-only custody.
- No authenticated audit-event issuer, retention schedule, tamper-evident signed receipt, privileged maintenance policy, or tenant onboarding is implemented.
- No tenant READ authority, publication authority or provider-write authority has been granted. No network/provider/CMS operations.
- Do not deploy dormant 0012 or 0013 or merge a PR without separately authorized exact-head review.

## Next steps
1. Verify PR #945 exact-head CI and PostgreSQL audit test; repair failures without bypass and rerun on new proof ref if necessary.
2. Review SQL constraints, trigger security model and nonproduction rollback.
3. Add independently authorized concurrency/revocation and source provenance tests as follow-on PRs.
4. Only after schema security review plan the production tenant membership migration, access-grant governance, and trusted server-only resolver; do not infer access from user-provided hashes or auth role.

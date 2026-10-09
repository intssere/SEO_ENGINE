# CVI-1C.10 — Authorization revocation vs nonce-admission serialization

Date: 2026-10-09. Status: NEW DRAFT PR, exact-head CI in progress. No production changes.

## Predecessor
- CVI-1C.9 PR #986: full CI SUCCESS at exact HEAD 4a41f63756c0125624a3e3024545b6a98a639b6b, run 37963531337.
- All CVI implementation PRs remain draft, open, unmerged.

## Current increment
- Draft PR #988: https://github.com/intssere/SEO_ENGINE/pull/988
- Branch: workstream/cvi-1c10-revocation-serialization-pr986-dependent
- Base: workstream/cvi-1c9-server-keyring-boundary-pr985-dependent
- Exact initial HEAD d9eab0273c66793b4c6857f3f96a5516a1ff7f22
- Proof-only branch ugp-cvi-1b4e-ci-proof-20261009-r
- Workflow run 37964857280; full CI pending certification.

## Code and test
- lib/db/migrations/0016_cvi_acquisition_revocation_serialization_draft.sql
  Dormant replacement of CVI nonce insertion trigger, with deterministic FOR SHARE row locking on active site, connected read-scoped connection, valid session, active tenant membership and active site read_evidence grant.
- lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts
  Fourth disposable PostgreSQL test applies 0016 after 0014/0015 and confirms actual exported CVI-1C.7 INSERT SQL serializes two revocation race scenarios:
  1) member revocation UPDATE holds lock, concurrent acquisition INSERT waits on Lock, revocation commits, INSERT rejects;
  2) grant revocation similarly holds lock, acquisition waits, then rejects.
  No new acquisition ledger rows should exist for either race.
- Test is confined to isolated localhost seo_engine_cvi_disposable and uses the existing CI disposal trap.

## Security boundaries
- The migration remains DORMANT. No production runtime bootstrap/configuration is altered, no production schema migration, provider API call, CMS publication, merge or deploy.
- Row locking addresses concurrent UPDATE/INSERT ordering at statement time; it is not universal authority for later provider reads or publication.
- No independently authenticated GSC/Shopify source, factual truth, source licensing, trusted human review or production secret manager are implemented.
- INSERT receipts remain recorded_untrusted and immutable; replay uniqueness alone does not provide provider/source authenticity.
- Must verify exact-head CI terminal PASS and repair failing concurrency assertions if needed.

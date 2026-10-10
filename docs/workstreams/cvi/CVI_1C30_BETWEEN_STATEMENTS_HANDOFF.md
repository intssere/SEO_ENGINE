# CVI-1C.30 — Between-statement authorization revocation audit

Predecessor CVI-1C.29: draft PR #1040 at exact HEAD `d8aba944c781323e47483e4e42caa18b2e6edac8`, full CI success: https://github.com/intssere/SEO_ENGINE/actions/runs/38049392213.

## Source-backed observation
`createCviPrivateExpressDbComposition` first awaits `createCviGscServerScopeResolver`, then separately awaits `reconcileCviGscScopedReadback`. The scoped store independently executes `CVI_GSC_SCOPED_READBACK_SQL`. Both SQL statements have active authorization predicates and `FOR SHARE OF s,c,se,m,g`. Locks acquired by the first autocommit statement do not, by themselves, cover the interval before the second statement. This is a potential authorization transition window, not evidence of an actual bypass: the second statement independently rechecks the authorizations.

## Required bounded certification
1. Run only against explicit localhost `seo_engine_cvi_disposable` with synthetic tenant, session, site, grant, connection and immutable historical acquisition.
2. Interpose a deterministic synchronization barrier *after* the first scope SQL statement completes and *before* the second scoped readback statement executes.
3. Revoke each of: membership, site read grant, Google connection, site activation, and auth session while at that barrier. Require the final result to be `DENY`.
4. Prove no historical positive result is reused across a revocation and no authorization is inferred from an acquisition identifier or previously eligible scope.
5. Avoid sleeps as sole coordination evidence. Retain non-authorization result flags even when historical review succeeds.
6. No real provider traffic, CMS mutation, public route, production SQL, merging or deployment.

## Status
Audit prepared on `workstream/cvi-1c30-between-read-revocation-pr1040-dependent`. Implementation and exact-head CI remain pending.

## Exact-head certification receipt
- Implementation HEAD: `6b9d9caf775fe56511595fc4fc8192e8a2de307a`
- Full workflow https://github.com/intssere/SEO_ENGINE/actions/runs/38052141985 — completed SUCCESS
- Validation job `114213244587` — completed SUCCESS with no failed steps
- Earlier workflow `38049688121` failed TypeScript typecheck; the repair is incorporated in the certified implementation HEAD.
- PR #1044 remains draft/unmerged. No deployment, provider access or production database activity.
- This documentation update creates a later commit requiring its own final-HEAD check.

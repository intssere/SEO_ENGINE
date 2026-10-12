# CVI-1C.79 — Bootstrap Script and CI Entry-Point Evidence

## Baseline
Stacked on CVI-1C.78 PR #1139 at `4b9004f8478dfc387f31479b8fd5dcb376acac03` (exact-head CI #38262507793 succeeded). Repository-only read-only audit; actual Railway running configuration remains unverified.

## Additional inspected entrypoints
- Root `package.json:11` exposes **`db:bootstrap`** as `pnpm --filter @workspace/db bootstrap:runtime`. The latter invokes the mutating `lib/db/src/bootstrap-runtime.ts` CLI. This is an **available operator command**, not evidence that an API startup or deployment automatically runs it.
- `.github/workflows/ci.yml:74–86` creates disposable PostgreSQL proof fixtures and explicitly loads CVI ACL drafts 0012–0016 **only into the synthetic CI database**. Other steps exercise historical migration tests. Source text inspected does not show a production `db:bootstrap` invocation.
- Root `Dockerfile` defaults to `artifacts/api-server/dist/index.mjs`; that API server performs `ensureDiamondShelfIdentity` on startup, a read-only verifier.
- Recursive repository tree includes one `.github/workflows/ci.yml` and no root `railway.json` or `railway.toml` in this workstream commit. This cannot establish that no service-level start-command override exists in Railway.

## Release/security implication
The conditional `sites.is_active=true` reactivation identified in CVI-1C.76 is associated with invoking the explicit bootstrap command, not the inspected default container entrypoint. Both paths can coexist: a read-only serving startup and a separate mutating operator workflow. A future site revocation control should prohibit unauthorized bootstrap reactivation and audit authorized recovery.

## Outstanding external evidence
Obtain separately authorized read-only actual Railway service command, deployment revision/image digest, custom build/start commands, scheduled/one-off tasks and migration history; reconcile those with Dockerfile and root scripts before any production statement. Do not request or access secrets or customer rows.

## Restrictions
Documentation-only. No production DB, migration execution, provider operations, website crawling/publishing, runtime handler change, merge, or deployment. CI green is not security/release sign-off.

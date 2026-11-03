# RT01-A1 — Isolated Default-Deny Admission Rehearsal

**Status:** Offline prototype, unbound to all application runtime paths. Not a grant store, session verifier, deployment flag, queue authorization, or permission for provider reads or site writes.

## Files
- `artifacts/api-server/src/lib/pilot-01-default-deny-admission.ts`
- `artifacts/api-server/src/lib/pilot-01-default-deny-admission.test.ts`

The pure `checkPilotAdmission` function rejects absent or unverified principals, disabled authentication, unverified site context, disabled run gate, public-site-write or AI-proposal-enabled state, non-analyst/admin roles, missing actor/tenant/site, unsupported operation, absent grant, expired grant and mismatched scope. It reuses the earlier offline `evaluatePilotGrant` matcher.

`rehearsePilotAdmission` invokes an injected **synthetic** grant consumer only after a matched preflight and returns `admitted_for_rehearsal` rather than `authorized`. Consumer denial, exception or unexpected result cannot grant work. No enqueue, callback execution, provider operations or IO implementation are imported.

## Uncertified boundaries
- The `sessionVerified`, `siteVerified`, `authEnforced`, and `runGateEnabled` values are **synthetic caller inputs** and can be forged by untrusted callers. Do **not** bind this module to a public route or pass user-controlled booleans as verified facts.
- `SyntheticGrantConsumer` is only a mock interface, not durable one-time grant consumption or a transactionally consistent revocation boundary.
- Tests cannot prove actor membership or session identity, deployment configuration, safe provider acquisition, queue fencing, expiry based on DB time, or work cancellation.
- The `site_write` operation is intentionally unsupported. No current or future live authority is inferred.

## Integration gates still required
1. Review an authoritative `req.auth` principal and server-derived tenant/site authorization, verified configured enforcement and RBAC.
2. Bind to separately approved durable grant identity with nonce reuse prevention, revoke/consume linearization, server clock and immutable receipts.
3. Enforce default-deny before queue insertion **and** each external acquisition; use generation-fenced worker claims and audited renew/complete transactions.
4. Run isolated disposable-DB and multi-worker negative tests, independent security review, and exact authorization before live binding.
5. Preserve `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`, no deployment, OAuth or external reads under this PR.

**No wiring to `routes/pilot.ts`, `pilot-orchestration.ts`, production start, DB, external provider, or UI.**

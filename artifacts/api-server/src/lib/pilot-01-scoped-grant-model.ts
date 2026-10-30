/**
 * PILOT-01 offline-only authorization decision model.
 * NOT wired to routes, OAuth, workers, persistence or Shopify. A boolean result
 * here does not constitute a live authorization grant.
 */
export type PilotOperation = "analyze" | "recommend" | "site_write";
export type ScopedGrant = Readonly<{
  actorId: string;
  tenantId: string;
  siteId: string;
  operation: PilotOperation;
  expiresAtMs: number;
  nonce: string;
  approvedDiffHash?: string;
}>;
export type PilotRequest = Readonly<{
  actorId: string;
  tenantId: string;
  siteId: string;
  operation: PilotOperation;
  diffHash?: string;
}>;
export type PilotGrantEvaluation = "matched" | "denied";

/**
 * Pure claim matching only. This does NOT perform signature verification,
 * authenticated-principal binding, revocation, durable nonce consumption,
 * tenant membership lookup or role enforcement.
 */
export function evaluatePilotGrant(
  grant: ScopedGrant | null,
  request: PilotRequest,
  nowMs: number,
): PilotGrantEvaluation {
  if (!grant || !Number.isFinite(nowMs) || !Number.isFinite(grant.expiresAtMs)) return "denied";
  if (grant.expiresAtMs <= nowMs || !grant.nonce.trim()) return "denied";
  if (!grant.actorId || !grant.tenantId || !grant.siteId) return "denied";
  if (
    grant.actorId !== request.actorId ||
    grant.tenantId !== request.tenantId ||
    grant.siteId !== request.siteId ||
    grant.operation !== request.operation
  ) return "denied";
  if (request.operation === "site_write") {
    // An explicit, exact-diff grant is necessary but not sufficient for a live write.
    if (!grant.approvedDiffHash || !request.diffHash || grant.approvedDiffHash !== request.diffHash) {
      return "denied";
    }
  }
  return "matched";
}

/** PILOT-01 disposable, in-memory single-use grant fixture.
 * No route, credential, worker, DB, provider or production integration.
 * This is NOT durable across processes or restarts and grants no live authority.
 */
export type FixtureGrant = Readonly<{
  nonce: string;
  actorId: string;
  tenantId: string;
  siteId: string;
  operation: "analyze" | "recommend" | "site_write";
  expiresAtMs: number;
  diffHash?: string;
}>;
export class OfflineGrantLedger {
  private readonly grants = new Map<string, FixtureGrant>();
  private readonly revoked = new Set<string>();
  private readonly consumed = new Set<string>();
  register(grant: FixtureGrant): boolean {
    if (!grant.nonce || this.grants.has(grant.nonce) || this.consumed.has(grant.nonce) || this.revoked.has(grant.nonce)) return false;
    this.grants.set(grant.nonce, Object.freeze({...grant}));
    return true;
  }
  revoke(nonce: string): void { this.revoked.add(nonce); }
  consume(nonce: string, request: Omit<FixtureGrant, "nonce" | "expiresAtMs">, nowMs: number): boolean {
    const grant = this.grants.get(nonce);
    if (!grant || this.revoked.has(nonce) || this.consumed.has(nonce) ||
        !Number.isFinite(nowMs) || !Number.isFinite(grant.expiresAtMs) ||
        grant.expiresAtMs <= nowMs ||
        !request.actorId || !request.tenantId || !request.siteId ||
        grant.actorId !== request.actorId || grant.tenantId !== request.tenantId ||
        grant.siteId !== request.siteId || grant.operation !== request.operation ||
        (request.operation === "site_write" && (!request.diffHash || !grant.diffHash || grant.diffHash !== request.diffHash))) return false;
    this.consumed.add(nonce); // synchronous check and mark in one JS call; no awaits
    return true;
  }
}

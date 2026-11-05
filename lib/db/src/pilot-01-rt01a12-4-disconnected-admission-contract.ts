/**
 * RT01-A12.4 — disconnected, source-only atomic admission/fencing contract.
 * NOT a trusted-principal implementation, DB adapter, runtime entrypoint or issuer.
 * No imports of DB clients; no sockets, env credentials, SQL or provider operations.
 */
export type ReadOperation = "analyze" | "recommend";
export type AdmissionScope = Readonly<{
  organizationId: string;
  siteId: string;
  actorSubject: string;
  sessionId: string;
  issuerId: string;
  issuerProvenanceSha256: string;
  operation: ReadOperation;
}>;

/**
 * Independently authenticated server-issued authority, not a browser claim.
 * The caller MUST verify session validity, membership, issuer custody, and
 * revocation against a trusted source. This marker by itself proves nothing.
 */
export type ServerVerifiedPrincipal = Readonly<AdmissionScope & {
  source: "server_verified_principal";
  authenticated: true;
  sessionActive: true;
  membershipVerified: true;
  issuerVerified: true;
}>;

export type AdmissionIntent = Readonly<{
  grantId: string;
  idempotencyKey: string;
  requestSha256: string;
}>;

export type AdmissionReceipt = Readonly<AdmissionScope & {
  grantId: string;
  jobId: string;
  admissionId: string;
  idempotencyKey: string;
  requestSha256: string;
  transactionId: string;
  committedAt: string;
}>;

export type AdmissionResolution =
  | Readonly<{status: "committed"; receipt: AdmissionReceipt}>
  | Readonly<{status: "denied" | "conflict" | "unavailable" | "commit_unknown"}>;

export type LeaseToken = Readonly<{
  jobId: string;
  organizationId: string;
  siteId: string;
  workerOwner: string;
  generation: number;
  leaseExpiresAt: string;
}>;

export type FencedMutation = Readonly<{
  token: LeaseToken;
  intentSha256: string;
  kind: "renew" | "complete" | "fail" | "cancel" | "outbox_eligible";
}>;

export type FencedResolution =
  | Readonly<{status: "applied"; generation: number; evidenceId: string}>
  | Readonly<{status: "fenced" | "denied" | "unavailable" | "commit_unknown"}>;

/**
 * One atomic commit boundary MUST consume grant, create job, append admission
 * and event, and persist idempotency scope + fingerprint before returning a
 * committed receipt. On transport/commit ambiguity return commit_unknown,
 * then reconcile read-only; NEVER initiate a second write automatically.
 */
export interface DurableAdmissionPort {
  admitAtomically(input: Readonly<{principal: ServerVerifiedPrincipal; intent: AdmissionIntent}>): Promise<AdmissionResolution>;
  reconcileAdmission(input: Readonly<{principal: ServerVerifiedPrincipal; intent: AdmissionIntent}>): Promise<AdmissionResolution>;
  /**
   * Must be a single fenced compare-and-swap on exact tenant, site, job,
   * owner, generation and unexpired DB-clock lease. Transition + audit event
   * + outbox state are in the same commit. Outbox cannot dispatch providers.
   */
  mutateWithFence(input: FencedMutation): Promise<FencedResolution>;
}

const canonical = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v === v.trim() && v.length <= 256;
const sha = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{64}$/.test(v);

export function validPrincipal(p: unknown): p is ServerVerifiedPrincipal {
  if (!p || typeof p !== "object") return false;
  const x = p as Partial<ServerVerifiedPrincipal>;
  return x.source === "server_verified_principal" &&
    x.authenticated === true && x.sessionActive === true &&
    x.membershipVerified === true && x.issuerVerified === true &&
    [x.organizationId,x.siteId,x.actorSubject,x.sessionId,x.issuerId].every(canonical) &&
    sha(x.issuerProvenanceSha256) &&
    (x.operation === "analyze" || x.operation === "recommend");
}
export function validIntent(i: unknown): i is AdmissionIntent {
  if (!i || typeof i !== "object") return false;
  const x = i as Partial<AdmissionIntent>;
  return canonical(x.grantId) && canonical(x.idempotencyKey) && sha(x.requestSha256);
}
export function sameReceipt(r: AdmissionReceipt, p: ServerVerifiedPrincipal, i: AdmissionIntent): boolean {
  return !!r && r.grantId === i.grantId && r.idempotencyKey === i.idempotencyKey &&
    r.requestSha256 === i.requestSha256 &&
    r.organizationId === p.organizationId && r.siteId === p.siteId &&
    r.actorSubject === p.actorSubject && r.sessionId === p.sessionId &&
    r.issuerId === p.issuerId && r.issuerProvenanceSha256 === p.issuerProvenanceSha256 &&
    r.operation === p.operation && canonical(r.jobId) && canonical(r.admissionId) &&
    canonical(r.transactionId) && typeof r.committedAt === "string" &&
    Number.isFinite(Date.parse(r.committedAt));
}
export function validLease(t: unknown): t is LeaseToken {
  if (!t || typeof t !== "object") return false;
  const x = t as Partial<LeaseToken>;
  return [x.jobId,x.organizationId,x.siteId,x.workerOwner].every(canonical) &&
    Number.isSafeInteger(x.generation) && (x.generation as number) > 0 &&
    typeof x.leaseExpiresAt === "string" && Number.isFinite(Date.parse(x.leaseExpiresAt));
}
/**
 * Read-only contract facade. A returned 'committed' is accepted only with a
 * matching receipt. Unknown commit never reports success, even if the caller
 * retries; caller must request reconciliation, not a second admit call.
 */
export class DisconnectedAdmissionContract {
  constructor(private readonly port: DurableAdmissionPort) {}
  async admit(principal: unknown, intent: unknown): Promise<AdmissionResolution> {
    if (!validPrincipal(principal) || !validIntent(intent)) return {status:"denied"};
    try {
      const result = await this.port.admitAtomically({principal,intent});
      if (result.status !== "committed") return result;
      return sameReceipt(result.receipt,principal,intent) ? result : {status:"unavailable"};
    } catch {
      return {status:"commit_unknown"};
    }
  }
  async reconcile(principal: unknown, intent: unknown): Promise<AdmissionResolution> {
    if (!validPrincipal(principal) || !validIntent(intent)) return {status:"denied"};
    try {
      const result = await this.port.reconcileAdmission({principal,intent});
      if (result.status !== "committed") return result;
      return sameReceipt(result.receipt,principal,intent) ? result : {status:"unavailable"};
    } catch {
      return {status:"unavailable"};
    }
  }
  async fenced(input: unknown): Promise<FencedResolution> {
    if (!input || typeof input !== "object") return {status:"denied"};
    const x = input as Partial<FencedMutation>;
    if (!validLease(x.token) || !sha(x.intentSha256) ||
      !["renew","complete","fail","cancel","outbox_eligible"].includes(x.kind ?? ""))
      return {status:"denied"};
    try {
      const result = await this.port.mutateWithFence(x as FencedMutation);
      if (result.status !== "applied") return result;
      // Evidence is required. The DB adapter, not this facade, must prove CAS.
      return result.generation === x.token.generation && canonical(result.evidenceId)
        ? result : {status:"unavailable"};
    } catch {
      return {status:"commit_unknown"};
    }
  }
}

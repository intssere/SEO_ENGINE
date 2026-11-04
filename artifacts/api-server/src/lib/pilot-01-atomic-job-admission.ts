/**
 * RT01-A6 disconnected contract: grant consume + job insert + audit must commit
 * in ONE durable transaction, never as two separately callable operations.
 * This module performs zero SQL/network/queue/worker/provider I/O.
 * Synthetic status "recorded_for_rehearsal" is NOT permission to dispatch.
 */
import type { VerifiedGrantContext, ReadOnlyPilotOperation } from "./pilot-01-trusted-grant-contract.js";

export type AtomicAdmissionRequest = Readonly<{
  grantId: string; siteId: string; operation: ReadOnlyPilotOperation;
  /** Stable caller-generated key, bound to the same grant and scope. */
  idempotencyKey: string;
}>;
export type AtomicAdmissionPolicy = Readonly<{
  authEnforced: boolean; siteVerified: boolean; runGateEnabled: boolean;
  publicSiteWritesEnabled: boolean; aiProposalGenerationEnabled: boolean;
}>;
export type AtomicAdmissionReceipt = Readonly<{
  admissionId: string; jobId: string; grantId: string;
  idempotencyKey: string; actorId: string; tenantId: string;
  siteId: string; issuerId: string; operation: ReadOnlyPilotOperation;
  transactionId: string; committedAt: string;
}>;
export type AtomicAdmissionPortOutcome =
  | Readonly<{ status: "committed" | "already_committed"; receipt: AtomicAdmissionReceipt }>
  | Readonly<{ status: "denied" | "unavailable" }>;
export interface AtomicAdmissionPort {
  /**
   * FUTURE CONTRACT ONLY. Implementations MUST perform grant validation,
   * compare-and-swap consume, one durable job insert and immutable audit insert
   * in a single database transaction. Idempotency replay for EXACT matching
   * scope may return the identical committed receipt without mutating state.
   * Different grant/scope with the same key MUST deny, not return success.
   */
  admit(input: Readonly<{
    context: VerifiedGrantContext;
    request: AtomicAdmissionRequest;
  }>): Promise<AtomicAdmissionPortOutcome>;
}
export interface AtomicAdmissionContextProvider {
  resolve(): Promise<VerifiedGrantContext | null>;
}
export type AtomicAdmissionRehearsalOutcome =
  | Readonly<{ status: "recorded_for_rehearsal"; receipt: AtomicAdmissionReceipt; replay: boolean }>
  | Readonly<{ status: "denied" | "unavailable" }>;

const clean = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.trim() === v;
const time = (v: unknown): boolean =>
  clean(v) && Number.isFinite(Date.parse(v));

export async function rehearseAtomicGrantJobAdmission(
  request: AtomicAdmissionRequest,
  policy: AtomicAdmissionPolicy,
  provider: AtomicAdmissionContextProvider,
  port: AtomicAdmissionPort,
): Promise<AtomicAdmissionRehearsalOutcome> {
  if (!request || !clean(request.grantId) || !clean(request.siteId) ||
    !clean(request.idempotencyKey) ||
    (request.operation !== "analyze" && request.operation !== "recommend") ||
    !policy || policy.authEnforced !== true || policy.siteVerified !== true ||
    policy.runGateEnabled !== true || policy.publicSiteWritesEnabled !== false ||
    policy.aiProposalGenerationEnabled !== false) return { status: "denied" };
  let context: VerifiedGrantContext | null;
  try { context = await provider.resolve(); }
  catch { return { status: "unavailable" }; }
  if (!context || context.siteId !== request.siteId ||
    context.source !== "server_verified_session" ||
    (context.role !== "analyst" && context.role !== "admin") ||
    ![context.actorId, context.tenantId, context.siteId,
      context.issuerId, context.sessionId].every(clean)) return { status: "denied" };
  let response: AtomicAdmissionPortOutcome;
  try {
    response = await port.admit(Object.freeze({
      context: Object.freeze({ ...context }),
      request: Object.freeze({ ...request }),
    }));
  } catch { return { status: "unavailable" }; }
  if (!response || typeof response !== "object") return { status: "unavailable" };
  if (response.status === "denied") return { status: "denied" };
  if (response.status === "unavailable") return { status: "unavailable" };
  if (response.status !== "committed" && response.status !== "already_committed")
    return { status: "unavailable" };
  const receipt = response.receipt;
  if (!receipt || ![receipt.admissionId, receipt.jobId,
    receipt.transactionId].every(clean) || !time(receipt.committedAt) ||
    receipt.grantId !== request.grantId ||
    receipt.idempotencyKey !== request.idempotencyKey ||
    receipt.actorId !== context.actorId ||
    receipt.tenantId !== context.tenantId ||
    receipt.siteId !== context.siteId ||
    receipt.issuerId !== context.issuerId ||
    receipt.operation !== request.operation) return { status: "unavailable" };
  return Object.freeze({
    status: "recorded_for_rehearsal",
    receipt: Object.freeze({ ...receipt }),
    replay: response.status === "already_committed",
  });
}

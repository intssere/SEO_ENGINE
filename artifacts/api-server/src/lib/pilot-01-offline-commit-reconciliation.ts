/**
 * PILOT-01 RT01-A8: disconnected, READ-ONLY recovery of an ambiguous
 * transaction acknowledgement. This source-only module never retries an
 * admission, consumes a grant, creates a job, or dispatches a worker.
 *
 * "confirmed_for_rehearsal" is evidence from an INJECTED MOCK LOOKUP, NOT
 * proof of production durability or execution authorization.
 */
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";
import type {
  AtomicAdmissionContextProvider, AtomicAdmissionPolicy,
  AtomicAdmissionReceipt, AtomicAdmissionRequest,
} from "./pilot-01-atomic-job-admission.js";

export type AtomicAdmissionReconciliationPort = Readonly<{
  /** A FUTURE adapter must perform an authoritative, read-only committed lookup
   * by idempotency key and compare exact persisted grant/tenant/site/actor/issuer/
   * operation scope. No reads from replicas with unverified lag guarantees.
   * Never convert "not_found" into permission to re-submit an admission.
   */
  findCommitted(input: Readonly<{
    context: VerifiedGrantContext;
    request: AtomicAdmissionRequest;
  }>): Promise<
    | Readonly<{ status: "found"; receipt: AtomicAdmissionReceipt }>
    | Readonly<{ status: "not_found" | "conflict" | "unavailable" }>
  >;
}>;

export type ReconciliationOutcome =
  | Readonly<{ status: "confirmed_for_rehearsal"; receipt: AtomicAdmissionReceipt }>
  | Readonly<{ status: "unresolved" | "conflict" | "denied" | "unavailable" }>;

const clean = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;

function validRequest(request: AtomicAdmissionRequest, policy: AtomicAdmissionPolicy): boolean {
  return !!request && !!policy &&
    [request.grantId, request.siteId, request.idempotencyKey].every(clean) &&
    (request.operation === "analyze" || request.operation === "recommend") &&
    policy.authEnforced === true && policy.siteVerified === true &&
    policy.runGateEnabled === true && policy.publicSiteWritesEnabled === false &&
    policy.aiProposalGenerationEnabled === false;
}

function validContext(context: VerifiedGrantContext | null, request: AtomicAdmissionRequest): context is VerifiedGrantContext {
  return !!context && context.source === "server_verified_session" &&
    (context.role === "analyst" || context.role === "admin") &&
    context.siteId === request.siteId &&
    [context.actorId, context.tenantId, context.siteId,
      context.issuerId, context.sessionId].every(clean);
}

function matches(receipt: AtomicAdmissionReceipt, request: AtomicAdmissionRequest, context: VerifiedGrantContext): boolean {
  return !!receipt &&
    [receipt.admissionId, receipt.jobId, receipt.transactionId].every(clean) &&
    clean(receipt.committedAt) && Number.isFinite(Date.parse(receipt.committedAt)) &&
    receipt.grantId === request.grantId &&
    receipt.idempotencyKey === request.idempotencyKey &&
    receipt.operation === request.operation &&
    receipt.actorId === context.actorId &&
    receipt.tenantId === context.tenantId &&
    receipt.siteId === context.siteId &&
    receipt.issuerId === context.issuerId;
}

/** A missing row may mean in-flight commit, lag, lost connection, or rollback.
 * The only safe result is unresolved: no speculative write and no auto-retry.
 */
export async function rehearseUncertainCommitReconciliation(
  request: AtomicAdmissionRequest,
  policy: AtomicAdmissionPolicy,
  provider: AtomicAdmissionContextProvider,
  lookup: AtomicAdmissionReconciliationPort,
): Promise<ReconciliationOutcome> {
  if (!validRequest(request, policy)) return { status: "denied" };
  let context: VerifiedGrantContext | null;
  try { context = await provider.resolve(); }
  catch { return { status: "unavailable" }; }
  if (!validContext(context, request)) return { status: "denied" };

  let result: Awaited<ReturnType<AtomicAdmissionReconciliationPort["findCommitted"]>>;
  try {
    result = await lookup.findCommitted(Object.freeze({
      context: Object.freeze({ ...context }),
      request: Object.freeze({ ...request }),
    }));
  } catch { return { status: "unavailable" }; }
  if (!result || typeof result !== "object") return { status: "unavailable" };
  if (result.status === "not_found") return { status: "unresolved" };
  if (result.status === "conflict") return { status: "conflict" };
  if (result.status === "unavailable") return { status: "unavailable" };
  if (result.status !== "found") return { status: "unavailable" };
  if (!matches(result.receipt, request, context)) return { status: "conflict" };
  return Object.freeze({
    status: "confirmed_for_rehearsal",
    receipt: Object.freeze({ ...result.receipt }),
  });
}

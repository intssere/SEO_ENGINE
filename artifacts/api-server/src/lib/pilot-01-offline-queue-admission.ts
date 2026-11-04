/**
 * PILOT-01 RT01-A5 — disconnected authorization-to-queue rehearsal.
 * Zero network/SQL/worker/route dependencies. "queued_for_rehearsal" is a
 * synthetic outcome only and NEVER permission to dispatch a live pilot.
 *
 * The injected context provider, atomic grant store and queue port are mocks
 * until a separately certified server-side authentication + transactional
 * grant-and-job admission layer exists.
 */
import {
  rehearseTrustedGrantConsumption,
  type AtomicGrantReceiptStore,
  type DurableGrantReceipt,
  type GrantConsumeIntent,
  type ServerAuthenticatedContextProvider,
  type VerifiedGrantContext,
} from "./pilot-01-trusted-grant-contract.js";

export type QueueRehearsalIntent = Readonly<GrantConsumeIntent & {
  siteId: string;
}>;

export type QueueRehearsalPolicy = Readonly<{
  authEnforced: boolean;
  siteVerified: boolean;
  runGateEnabled: boolean;
  publicSiteWritesEnabled: boolean;
  aiProposalGenerationEnabled: boolean;
}>;

export type SyntheticQueueReceipt = Readonly<{
  jobId: string;
  receiptId: string;
  grantId: string;
  tenantId: string;
  siteId: string;
  actorId: string;
  issuerId: string;
  operation: "analyze" | "recommend";
}>;

/**
 * Test-only. Must model an atomic idempotent queue admission bound to the
 * committed grant receipt; this interface is NOT a worker launch capability.
 */
export interface SyntheticQueueAdmissionPort {
  admit(input: Readonly<{
    context: VerifiedGrantContext;
    consumed: DurableGrantReceipt;
    intent: QueueRehearsalIntent;
  }>): Promise<Readonly<
    | { status: "accepted"; receipt: SyntheticQueueReceipt }
    | { status: "denied" | "unavailable" }
  >>;
}

export type QueueRehearsalOutcome =
  | Readonly<{ status: "queued_for_rehearsal"; jobId: string }>
  | Readonly<{ status: "denied" | "unavailable" }>;

const clean = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;

export async function rehearseAuthorizedQueueAdmission(
  intent: QueueRehearsalIntent,
  policy: QueueRehearsalPolicy,
  provider: ServerAuthenticatedContextProvider,
  store: AtomicGrantReceiptStore,
  queue: SyntheticQueueAdmissionPort,
): Promise<QueueRehearsalOutcome> {
  // No calls to any injected dependency until all invariants are checked.
  if (!intent || !clean(intent.grantId) || !clean(intent.siteId) ||
      (intent.operation !== "analyze" && intent.operation !== "recommend") ||
      !policy || policy.authEnforced !== true || policy.siteVerified !== true ||
      policy.runGateEnabled !== true ||
      policy.publicSiteWritesEnabled !== false ||
      policy.aiProposalGenerationEnabled !== false) return { status: "denied" };

  let context: VerifiedGrantContext | null;
  try { context = await provider.resolve(); }
  catch { return { status: "unavailable" }; }
  if (!context || context.siteId !== intent.siteId ||
      context.source !== "server_verified_session" ||
      (context.role !== "admin" && context.role !== "analyst") ||
      ![context.actorId, context.tenantId, context.siteId,
        context.issuerId, context.sessionId].every(clean)) return { status: "denied" };

  const trusted = Object.freeze({ ...context });
  // No identity re-resolution between grant consumption and queue admission:
  // bind all follow-on evidence to a single copied context.
  const consumption = await rehearseTrustedGrantConsumption(
    Object.freeze({ grantId: intent.grantId, operation: intent.operation }),
    { async resolve() { return trusted; } }, store,
  );
  if (consumption.status !== "consumed") return { status: consumption.status };

  // A receipt reported by an injected store does not establish persistence,
  // and queue admission failure after consumption MUST NOT retry the grant.
  let admitted: Awaited<ReturnType<SyntheticQueueAdmissionPort["admit"]>>;
  try {
    admitted = await queue.admit(Object.freeze({
      context: trusted,
      consumed: Object.freeze({ ...consumption.receipt }),
      intent: Object.freeze({ ...intent }),
    }));
  } catch { return { status: "unavailable" }; }
  if (!admitted || typeof admitted !== "object") return { status: "unavailable" };
  if (admitted.status === "denied") return { status: "denied" };
  if (admitted.status === "unavailable") return { status: "unavailable" };
  if (admitted.status !== "accepted") return { status: "unavailable" };
  const receipt = admitted.receipt;
  if (!receipt || !clean(receipt.jobId) ||
      receipt.receiptId !== consumption.receipt.receiptId ||
      receipt.grantId !== intent.grantId || receipt.tenantId !== trusted.tenantId ||
      receipt.siteId !== trusted.siteId || receipt.actorId !== trusted.actorId ||
      receipt.issuerId !== trusted.issuerId ||
      receipt.operation !== intent.operation) return { status: "unavailable" };
  return Object.freeze({ status: "queued_for_rehearsal", jobId: receipt.jobId });
}

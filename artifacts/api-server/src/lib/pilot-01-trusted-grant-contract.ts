/**
 * PILOT-01 RT01-A3a: disconnected, no-I/O authenticated-context contract.
 *
 * A caller-supplied context or verifier is NOT proof of authentication. Only a
 * future independently reviewed server-side authenticator can implement this
 * interface. This module never calls routes, storage, workers or providers.
 */
export type ReadOnlyPilotOperation = "analyze" | "recommend";
export type VerifiedGrantContext = Readonly<{
  actorId: string;
  tenantId: string;
  siteId: string;
  issuerId: string;
  sessionId: string;
  role: "analyst" | "admin";
  source: "server_verified_session";
}>;
export type GrantConsumeIntent = Readonly<{
  grantId: string;
  operation: ReadOnlyPilotOperation;
}>;
export type DurableGrantReceipt = Readonly<{
  receiptId: string;
  grantId: string;
  actorId: string;
  tenantId: string;
  siteId: string;
  issuerId: string;
  operation: ReadOnlyPilotOperation;
  transactionId: string;
  committedAt: string;
}>;
export type DurableGrantResult =
  | Readonly<{ status: "consumed"; receipt: DurableGrantReceipt }>
  | Readonly<{ status: "denied" | "unavailable" }>;

/** Must derive identity, membership, role and issuer from server-side evidence. */
export interface ServerAuthenticatedContextProvider {
  resolve(): Promise<VerifiedGrantContext | null>;
}
/** Must atomically consume and insert an immutable receipt with DB clock. */
export interface AtomicGrantReceiptStore {
  consume(input: Readonly<{ context: VerifiedGrantContext; intent: GrantConsumeIntent }>): Promise<DurableGrantResult>;
}
export type VerifiedGrantOutcome = DurableGrantResult;

const clean = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;
const safeOperation = (value: unknown): value is ReadOnlyPilotOperation =>
  value === "analyze" || value === "recommend";

function validContext(c: VerifiedGrantContext | null): c is VerifiedGrantContext {
  return !!c && clean(c.actorId) && clean(c.tenantId) && clean(c.siteId) &&
    clean(c.issuerId) && clean(c.sessionId) &&
    c.source === "server_verified_session" &&
    (c.role === "analyst" || c.role === "admin");
}
function validReceipt(r: DurableGrantReceipt, c: VerifiedGrantContext, i: GrantConsumeIntent): boolean {
  return !!r && clean(r.receiptId) && clean(r.transactionId) &&
    clean(r.committedAt) && !Number.isNaN(Date.parse(r.committedAt)) &&
    r.grantId === i.grantId && r.operation === i.operation &&
    r.actorId === c.actorId && r.tenantId === c.tenantId &&
    r.siteId === c.siteId && r.issuerId === c.issuerId;
}

/**
 * Source-only fail-closed result validation for synthetic injected ports.
 * Even "consumed" is only evidence that an injected store reported a receipt:
 * it is NEVER a dispatch permit or a verified database transaction.
 */
export async function rehearseTrustedGrantConsumption(
  intent: GrantConsumeIntent,
  contextProvider: ServerAuthenticatedContextProvider,
  receiptStore: AtomicGrantReceiptStore,
): Promise<VerifiedGrantOutcome> {
  if (!intent || !clean(intent.grantId) || !safeOperation(intent.operation)) {
    return { status: "denied" };
  }
  let context: VerifiedGrantContext | null;
  try {
    context = await contextProvider.resolve();
  } catch {
    return { status: "unavailable" };
  }
  if (!validContext(context)) return { status: "denied" };
  try {
    // Never pass the original mutable context object into the store.
    const trusted = Object.freeze({ ...context });
    const result = await receiptStore.consume({
      context: trusted,
      intent: Object.freeze({ grantId: intent.grantId, operation: intent.operation }),
    });
    if (!result || typeof result !== "object") return { status: "unavailable" };
    if (result.status === "denied") return { status: "denied" };
    if (result.status === "unavailable") return { status: "unavailable" };
    if (result.status !== "consumed" || !validReceipt(result.receipt, trusted, intent)) {
      return { status: "unavailable" };
    }
    return { status: "consumed", receipt: Object.freeze({ ...result.receipt }) };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * RT01-A4: disconnected, mock-backed, fail-closed identity/site/issuer boundary.
 * No request handlers, credentials, SQL, HTTP, workers, or runtime authority.
 *
 * Every evidence source is an injected, independently trusted server-side port.
 * This function does not authenticate an HTTP caller by itself; only a future
 * server-owned adapter may provide the evidence and bind it to a request.
 */
import type {
  ReadOnlyPilotOperation, VerifiedGrantContext,
} from "./pilot-01-trusted-grant-contract.js";

export type PilotSessionEvidence = Readonly<{
  sessionId: string;
  subject: string;
  role: "viewer" | "operator" | "admin";
  expiresAt: string;
  revoked: boolean;
}>;
export type PilotSiteEvidence = Readonly<{
  siteId: string;
  organizationId: string;
  active: boolean;
}>;
export type PilotMembershipEvidence = Readonly<{
  organizationId: string;
  subject: string;
  status: "active" | "revoked";
  role: "viewer" | "operator" | "admin";
}>;
export type PilotIssuerEvidence = Readonly<{
  issuerId: string;
  organizationId: string;
  siteId: string;
  actorSubject: string;
  operation: ReadOnlyPilotOperation;
  status: "active" | "revoked";
  expiresAt: string;
}>;

/** Implementations must read server-verified evidence; never echo request fields. */
export interface PilotTrustedEvidencePorts {
  session: { resolve(): Promise<PilotSessionEvidence | null> };
  site: { find(siteId: string): Promise<PilotSiteEvidence | null> };
  membership: {
    find(subject: string, organizationId: string): Promise<PilotMembershipEvidence | null>;
  };
  issuer: {
    find(issuerId: string): Promise<PilotIssuerEvidence | null>;
  };
  /** Injected clock for deterministic tests; operational trust remains unverified. */
  now(): number;
}

export type PilotTrustedContextResult =
  | Readonly<{ status: "verified"; context: VerifiedGrantContext }>
  | Readonly<{ status: "denied" | "unavailable" }>;

const clean = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;
const validTime = (value: unknown): number | null => {
  if (!clean(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const allowed = (role: string): role is "operator" | "admin" =>
  role === "operator" || role === "admin";

/**
 * Candidate siteId, issuerId and operation identify what to check, NEVER
 * supply the verified actor, organization, role or authorization facts.
 */
export async function resolveTrustedPilotContext(
  intent: Readonly<{ siteId: string; issuerId: string; operation: ReadOnlyPilotOperation }>,
  ports: PilotTrustedEvidencePorts,
): Promise<PilotTrustedContextResult> {
  if (!intent || !clean(intent.siteId) || !clean(intent.issuerId) ||
    (intent.operation !== "analyze" && intent.operation !== "recommend")) {
    return { status: "denied" };
  }
  try {
    const now = ports.now();
    if (!Number.isFinite(now)) return { status: "unavailable" };
    const session = await ports.session.resolve();
    if (!session) return { status: "denied" };
    const sessionExpiry = validTime(session.expiresAt);
    if (!clean(session.sessionId) || !clean(session.subject) ||
      !allowed(session.role) || session.revoked !== false ||
      sessionExpiry === null || sessionExpiry <= now) return { status: "denied" };

    const site = await ports.site.find(intent.siteId);
    if (!site || site.siteId !== intent.siteId ||
      !clean(site.organizationId) || site.active !== true) return { status: "denied" };

    const member = await ports.membership.find(session.subject, site.organizationId);
    if (!member || member.subject !== session.subject ||
      member.organizationId !== site.organizationId ||
      member.status !== "active" || !allowed(member.role)) return { status: "denied" };

    // Both independently issued session and membership roles must authorize.
    const effectiveRole = session.role === "admin" && member.role === "admin"
      ? "admin" : "analyst";

    const issuer = await ports.issuer.find(intent.issuerId);
    if (!issuer || issuer.issuerId !== intent.issuerId ||
      issuer.organizationId !== site.organizationId ||
      issuer.siteId !== site.siteId ||
      issuer.actorSubject !== session.subject ||
      issuer.operation !== intent.operation ||
      issuer.status !== "active") return { status: "denied" };
    const issuerExpiry = validTime(issuer.expiresAt);
    if (issuerExpiry === null || issuerExpiry <= now) return { status: "denied" };

    const context: VerifiedGrantContext = Object.freeze({
      actorId: session.subject,
      tenantId: site.organizationId,
      siteId: site.siteId,
      issuerId: issuer.issuerId,
      sessionId: session.sessionId,
      role: effectiveRole,
      source: "server_verified_session",
    });
    return Object.freeze({ status: "verified", context });
  } catch {
    return { status: "unavailable" };
  }
}

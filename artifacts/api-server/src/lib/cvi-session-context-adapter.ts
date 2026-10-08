import type { AuthPrincipal } from "./auth-foundation.js";
import type { CviAuthorityAccessEvaluation } from "./cvi-authority-admission-contract.js";

export const CVI_SESSION_CONTEXT_ADAPTER_VERSION = "cvi-1b4b-session-context-adapter-v1" as const;

const HEX_64 = /^[0-9a-f]{64}$/;
const SCOPE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function validTime(value: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw new Error("cvi_1b4b_timestamp_invalid");
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    throw new Error("cvi_1b4b_timestamp_invalid");
  }
  return time;
}
function validScope(value: string): string {
  if (typeof value !== "string" || !SCOPE.test(value)) {
    throw new Error("cvi_1b4b_scope_invalid");
  }
  return value;
}

/**
 * Constructs an UNRESOLVED site-access evaluation from an already authenticated
 * server-side principal. The app's AuthPrincipal has no tenant-site membership.
 * This function must never infer access from role, OAuth status, a matching
 * hash, a request parameter, or a claimed source ledger.
 *
 * Integration boundary: principal MUST originate from protected req.auth,
 * not a caller-supplied JSON object. This pure function cannot enforce that
 * provenance by itself. It grants zero access regardless of inputs.
 */
export function deriveUnresolvedCviAccessContext(input: Readonly<{
  principal: AuthPrincipal | null;
  target: Readonly<{
    tenantId: string;
    siteId: string;
    siteBindingFingerprint: string;
  }>;
  evaluatedAt: string;
}>): CviAuthorityAccessEvaluation {
  const now = validTime(input.evaluatedAt);
  const principal = input.principal;
  if (!principal || typeof principal.subject !== "string" || !principal.subject.trim()
    || typeof principal.sessionId !== "string" || !principal.sessionId.trim()
    || !["viewer", "operator", "admin"].includes(principal.role)
    || typeof principal.email !== "string" || !principal.email.trim()) {
    throw new Error("cvi_1b4b_principal_not_authenticated");
  }
  const issued = validTime(principal.issuedAt);
  const lastSeen = validTime(principal.lastSeenAt);
  const expires = validTime(principal.expiresAt);
  if (issued > lastSeen || lastSeen > now || expires <= now || expires <= issued) {
    throw new Error("cvi_1b4b_session_not_current");
  }
  const tenantId = validScope(input.target.tenantId);
  const siteId = validScope(input.target.siteId);
  if (typeof input.target.siteBindingFingerprint !== "string"
    || !HEX_64.test(input.target.siteBindingFingerprint)) {
    throw new Error("cvi_1b4b_site_binding_invalid");
  }
  return {
    principalSubject: principal.subject,
    sessionExpiresAt: principal.expiresAt,
    checkedAt: input.evaluatedAt,
    tenantId,
    siteId,
    siteBindingFingerprint: input.target.siteBindingFingerprint,
    access: "NOT_RESOLVED",
    accessSource: "unresolved",
    connectionAccess: "NOT_RESOLVED",
    tenantMembershipSource: "unresolved",
  };
}

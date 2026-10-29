import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const CVI_TENANT_SITE_GRANT_POLICY_VERSION = "cvi-1b4c-tenant-site-grant-policy-v1" as const;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HEX = /^[0-9a-f]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type CviTenantSiteGrantSnapshot = Readonly<{
  authenticatedSubject: string;
  requestedTenantId: string;
  requestedSiteId: string;
  session: Readonly<{ subject: string; expiresAt: string; revoked: boolean }>;
  site: Readonly<{ siteId: string; organizationId: string; active: boolean; identityFingerprint: string }>;
  membership: Readonly<{
    subject: string;
    organizationId: string;
    status: "active" | "suspended" | "revoked";
    effectiveAt: string;
    expiresAt: string | null;
  }> | null;
  siteGrant: Readonly<{
    siteId: string;
    organizationId: string;
    subject: string;
    permission: "read_evidence" | "review_content" | "manage_connection";
    status: "active" | "revoked";
    effectiveAt: string;
    expiresAt: string | null;
  }> | null;
  connection: Readonly<{
    siteId: string;
    state: "connected" | "pending" | "error" | "revoked";
    readEvidenceScopePresent: boolean;
  }> | null;
}>;

export type CviTenantSiteGrantReview = Readonly<{
  version: typeof CVI_TENANT_SITE_GRANT_POLICY_VERSION;
  status: "DENY" | "ELIGIBLE_FOR_TRUSTED_RESOLUTION";
  reasonCodes: readonly string[];
  tenantId: string;
  siteId: string;
  checkedAt: string;
  reportFingerprint: string;
  semantics: Readonly<{
    dataIsCallerSupplied: true;
    independentlyAuthenticated: false;
    authorizationGranted: false;
    readOnly: true;
    deterministic: true;
    performsPersistence: false;
    performsNetworkOperation: false;
    publicationAuthorized: false;
    executionAuthorized: false;
  }>;
}>;

function time(value: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw new Error("cvi_1b4c_timestamp_invalid");
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString() !== value) throw new Error("cvi_1b4c_timestamp_invalid");
  return n;
}
function within(effectiveAt: string, expiresAt: string | null, now: number): boolean {
  return time(effectiveAt) <= now && (expiresAt === null || time(expiresAt) > now);
}

/** Pure review of a hypothetical server-side snapshot, NOT a tenant membership resolver.
 * Never use this output to grant access. Data may be forged; server-authenticated session
 * and transactionally consistent ACL/connection records remain a separate requirement.
 */
export function reviewCviTenantSiteGrant(input: Readonly<{
  snapshot: CviTenantSiteGrantSnapshot;
  checkedAt: string;
}>): CviTenantSiteGrantReview {
  const s = input.snapshot;
  const now = time(input.checkedAt);
  if (!s || !IDENTIFIER.test(s.authenticatedSubject)
    || !IDENTIFIER.test(s.requestedTenantId) || !IDENTIFIER.test(s.requestedSiteId)
    || !s.session || !s.site || !HEX.test(s.site.identityFingerprint)) {
    throw new Error("cvi_1b4c_invalid_snapshot");
  }
  const reasons: string[] = [];
  if (s.session.subject !== s.authenticatedSubject || s.session.revoked
    || time(s.session.expiresAt) <= now) reasons.push("session_invalid");
  if (!s.site.active || s.site.siteId !== s.requestedSiteId
    || s.site.organizationId !== s.requestedTenantId) reasons.push("site_scope_invalid");
  const m = s.membership;
  if (!m || m.subject !== s.authenticatedSubject || m.organizationId !== s.requestedTenantId
    || m.status !== "active" || !within(m.effectiveAt, m.expiresAt, now)) {
    reasons.push("membership_invalid");
  }
  const g = s.siteGrant;
  if (!g || g.subject !== s.authenticatedSubject || g.siteId !== s.requestedSiteId
    || g.organizationId !== s.requestedTenantId || g.permission !== "read_evidence"
    || g.status !== "active" || !within(g.effectiveAt, g.expiresAt, now)) {
    reasons.push("site_grant_invalid");
  }
  const c = s.connection;
  if (!c || c.siteId !== s.requestedSiteId || c.state !== "connected"
    || !c.readEvidenceScopePresent) reasons.push("connection_invalid");
  const base = {
    version: CVI_TENANT_SITE_GRANT_POLICY_VERSION,
    status: (reasons.length === 0 ? "ELIGIBLE_FOR_TRUSTED_RESOLUTION" : "DENY") as
      "DENY" | "ELIGIBLE_FOR_TRUSTED_RESOLUTION",
    reasonCodes: reasons.sort(),
    tenantId: s.requestedTenantId,
    siteId: s.requestedSiteId,
    checkedAt: input.checkedAt,
    semantics: {
      dataIsCallerSupplied: true as const,
      independentlyAuthenticated: false as const,
      authorizationGranted: false as const,
      readOnly: true as const,
      deterministic: true as const,
      performsPersistence: false as const,
      performsNetworkOperation: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
    },
  };
  return { ...base, reportFingerprint: stableEvidenceHash({
    purpose: CVI_TENANT_SITE_GRANT_POLICY_VERSION,
    ...base,
    // Include all examined source facts, including latent status/identity changes.
    sourceSnapshot: s,
  }) };
}

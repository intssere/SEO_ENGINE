import type { AuthPrincipal } from "./auth-foundation.js";

export const CVI_TRUSTED_READ_PREFLIGHT_VERSION = "cvi-1b4h-trusted-read-preflight-v1" as const;

export type CviTrustedReadDecision = Readonly<{
  version: typeof CVI_TRUSTED_READ_PREFLIGHT_VERSION;
  outcome: "DENY" | "PENDING_INDEPENDENT_SITE_BINDING";
  reason: "missing_authority" | "eligible_server_records_require_site_binding";
  tenantId: string;
  siteId: string;
  authorizationGranted: false;
  publicationAuthorized: false;
  executionAuthorized: false;
}>;

export type CviTrustedAccessRecord = Readonly<{
  session_ok: boolean;
  membership_ok: boolean;
  grant_ok: boolean;
  connection_ok: boolean;
  site_ok: boolean;
}>;

/** Server-side read interface. Only instantiate from a trusted PostgreSQL connection.
 * This function NEVER consumes an access grant from request JSON.
 */
export type CviTrustedAccessReader = (args: Readonly<{
  subject: string;
  sessionId: string;
  tenantId: string;
  siteId: string;
  evaluatedAt: string;
}>) => Promise<readonly CviTrustedAccessRecord[]>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function validDate(value: string): number {
  if (!ISO.test(value)) throw new Error("cvi_1b4h_invalid_time");
  const date = Date.parse(value);
  if (!Number.isFinite(date) || new Date(date).toISOString() !== value)
    throw new Error("cvi_1b4h_invalid_time");
  return date;
}

/** Read-only preflight. A correctly scoped DB result is necessary but NOT
 * sufficient for independent site binding, licensed evidence or publication.
 * No output from this function is an authorization capability.
 */
export async function checkCviTrustedReadPreflight(input: Readonly<{
  principal: AuthPrincipal | null;
  tenantId: string;
  siteId: string;
  evaluatedAt: string;
  read: CviTrustedAccessReader;
}>): Promise<CviTrustedReadDecision> {
  const now = validDate(input.evaluatedAt);
  if (!UUID.test(input.tenantId) || !UUID.test(input.siteId))
    throw new Error("cvi_1b4h_scope_invalid");
  const p = input.principal;
  if (!p || !UUID.test(p.sessionId) || !p.subject || validDate(p.issuedAt) > now
    || validDate(p.lastSeenAt) > now || validDate(p.expiresAt) <= now)
    throw new Error("cvi_1b4h_session_invalid");

  const rows = await input.read({
    subject: p.subject, sessionId: p.sessionId, tenantId: input.tenantId,
    siteId: input.siteId, evaluatedAt: input.evaluatedAt,
  });
  // Multiple rows/unknown booleans are a security failure, not an OR of grants.
  const r = rows.length === 1 ? rows[0] : undefined;
  const matched = r !== undefined && r.session_ok === true && r.membership_ok === true
    && r.grant_ok === true && r.connection_ok === true && r.site_ok === true;
  return {
    version: CVI_TRUSTED_READ_PREFLIGHT_VERSION,
    outcome: matched ? "PENDING_INDEPENDENT_SITE_BINDING" : "DENY",
    reason: matched ? "eligible_server_records_require_site_binding" : "missing_authority",
    tenantId: input.tenantId, siteId: input.siteId,
    authorizationGranted: false, publicationAuthorized: false, executionAuthorized: false,
  };
}

/** Parameterized SQL read adapter. Require a server-managed, private SQL client;
 * do not expose this method as a user-submittable public route.
 * No tokens/secrets are retrieved. This checks *any* connected read-scoped
 * connection, not independently authenticated property control.
 */
export const CVI_TRUSTED_READ_PREFLIGHT_SQL = `
SELECT
  EXISTS (SELECT 1 FROM auth_sessions se
    WHERE se.id=$1::uuid AND se.subject=$2 AND se.revoked_at IS NULL
      AND se.expires_at>$5::timestamptz) AS session_ok,
  EXISTS (SELECT 1 FROM cvi_organization_memberships m
    WHERE m.organization_id=$3::uuid AND m.auth_subject=$2
      AND m.status='active' AND m.revoked_at IS NULL
      AND m.effective_at<=$5::timestamptz
      AND (m.expires_at IS NULL OR m.expires_at>$5::timestamptz)) AS membership_ok,
  EXISTS (SELECT 1 FROM sites s WHERE s.id=$4::uuid
    AND s.organization_id=$3::uuid AND s.is_active=true) AS site_ok,
  EXISTS (SELECT 1 FROM cvi_site_read_grants g
    JOIN cvi_organization_memberships m
      ON m.id=g.organization_membership_id AND m.organization_id=g.organization_id
    JOIN sites s ON s.id=g.site_id AND s.organization_id=g.organization_id
    WHERE g.site_id=$4::uuid AND g.organization_id=$3::uuid
      AND s.is_active=true AND m.auth_subject=$2 AND m.status='active'
      AND m.revoked_at IS NULL AND m.effective_at<=$5::timestamptz
      AND (m.expires_at IS NULL OR m.expires_at>$5::timestamptz)
      AND g.permission='read_evidence' AND g.status='active'
      AND g.revoked_at IS NULL AND g.effective_at<=$5::timestamptz
      AND (g.expires_at IS NULL OR g.expires_at>$5::timestamptz)) AS grant_ok,
  EXISTS (SELECT 1 FROM connections c
    WHERE c.site_id=$4::uuid AND c.status='connected'
    AND cardinality(c.scopes)>0) AS connection_ok
` as const;

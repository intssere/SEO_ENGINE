/**
 * A conservative site-scoped connection readiness reader.
 * A "connected" credential does NOT prove recently observed SEO evidence.
 * Connection states are reported as unknown unless explicitly revoked/error.
 * No connection metadata, secrets or account IDs are returned.
 * Caller must first resolve authenticated site membership.
 */
export type ConnectionStatusQuery = (
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<readonly { site_id: string; provider: string; status: string }[]>;

export function createCustomerConnectionSourceReader(sql: ConnectionStatusQuery) {
  return async (scope: { organizationId: string; siteId: string }) => {
    if (!scope.organizationId.trim() || !scope.siteId.trim()) return null;
    const rows = await sql`
      SELECT c.site_id, c.provider, c.status
      FROM connections c
      JOIN sites s ON s.id = c.site_id
      WHERE s.id = ${scope.siteId}
        AND s.organization_id = ${scope.organizationId}
        AND s.is_active = true
      ORDER BY c.provider
      LIMIT 100
    `;
    if (rows.some(row => row.site_id !== scope.siteId || !row.provider.trim() ||
      !["pending", "connected", "revoked", "error"].includes(row.status))) return null;
    // "connected" and "pending" carry no source freshness attestation.
    return rows.map(row => ({
      status: row.status === "revoked" || row.status === "error"
        ? "unavailable" as const : "unknown" as const,
      observedAt: null,
    }));
  };
}

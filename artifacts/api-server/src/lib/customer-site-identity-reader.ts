/**
 * Read-only canonical site lookup. Site identity alone is NOT sufficient to
 * certify setup, analysis, source readiness or metrics. No customer capability
 * is projected until separately proven evidence exists.
 * The caller must first pass the authenticated membership scope resolver.
 */
export type SiteIdentityQuery = (
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<readonly {
  id: string; organization_id: string; name: string; domain: string;
}[]>;

export function createCustomerSiteIdentityReader(sql: SiteIdentityQuery) {
  return async (scope: { organizationId: string; siteId: string }) => {
    if (!scope.organizationId.trim() || !scope.siteId.trim()) return null;
    const rows = await sql`
      SELECT s.id, s.organization_id, s.name, s.domain
      FROM sites s
      WHERE s.id = ${scope.siteId}
        AND s.organization_id = ${scope.organizationId}
        AND s.is_active = true
      LIMIT 2
    `;
    if (rows.length !== 1) return null;
    const row = rows[0];
    if (row.id !== scope.siteId || row.organization_id !== scope.organizationId ||
        !row.name.trim() || !row.domain.trim()) return null;
    return { siteId: row.id, organizationId: row.organization_id, name: row.name, domain: row.domain };
  };
}

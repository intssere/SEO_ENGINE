/**
 * Conservative source freshness from canonical evidence observations.
 * Only explicit provider-scoped observations can qualify; a connected
 * credential alone does not grant operational readiness.
 * Caller must first establish authenticated site membership.
 */
export type SourceFreshnessQuery = (
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<readonly { site_id: string; source: string; observed_at: Date | string }[]>;

export function createCustomerSourceFreshnessReader(sql: SourceFreshnessQuery) {
  return async (scope: { organizationId: string; siteId: string }, now: Date, maxAgeMs: number) => {
    if (!scope.organizationId.trim() || !scope.siteId.trim() ||
        !Number.isFinite(now.getTime()) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return null;
    const rows = await sql`
      SELECT e.site_id, e.source, MAX(e.observed_at) AS observed_at
      FROM evidence e
      JOIN sites s ON s.id = e.site_id
      WHERE s.id = ${scope.siteId}
        AND s.organization_id = ${scope.organizationId}
        AND s.is_active = true
        AND e.source <> ''
      GROUP BY e.site_id, e.source
      ORDER BY e.source
      LIMIT 100
    `;
    if (rows.some(row => row.site_id !== scope.siteId || !row.source.trim())) return null;
    return rows.map(row => {
      const observedAt = row.observed_at instanceof Date ? row.observed_at.toISOString() : row.observed_at;
      const at = Date.parse(observedAt);
      const age = now.getTime() - at;
      return { source: row.source,
        status: Number.isFinite(at) && age >= 0 && age <= maxAgeMs ? "available" as const : "stale" as const,
        observedAt: Number.isFinite(at) ? observedAt : null };
    });
  };
}

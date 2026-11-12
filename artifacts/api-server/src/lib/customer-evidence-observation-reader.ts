/**
 * Verified observations only. This returns raw evidence references, not KPI
 * values or readiness certification. Authorization must precede this reader.
 */
export type EvidenceObservationQuery = (
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<readonly {
  id: string;
  site_id: string;
  source: string;
  kind: string;
  observed_at: Date | string;
}[]>;

export function createCustomerEvidenceObservationReader(sql: EvidenceObservationQuery) {
  return async (scope: { organizationId: string; siteId: string }) => {
    if (!scope.organizationId.trim() || !scope.siteId.trim()) return null;
    const rows = await sql`
      SELECT e.id, e.site_id, e.source, e.kind, e.observed_at
      FROM evidence e
      JOIN sites s ON s.id = e.site_id
      WHERE s.id = ${scope.siteId}
        AND s.organization_id = ${scope.organizationId}
        AND s.is_active = true
      ORDER BY e.observed_at DESC, e.id DESC
      LIMIT 50
    `;
    if (rows.some(row => row.site_id !== scope.siteId || !row.id.trim() ||
      !row.source.trim() || !row.kind.trim())) return null;
    const observations = rows.map(row => ({
      id: row.id,
      source: row.source,
      kind: row.kind,
      observedAt: row.observed_at instanceof Date ? row.observed_at.toISOString() : row.observed_at,
    }));
    if (observations.some(item => !Number.isFinite(Date.parse(item.observedAt)))) return null;
    return observations;
  };
}

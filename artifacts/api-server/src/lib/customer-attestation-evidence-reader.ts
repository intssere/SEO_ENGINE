/**
 * Server-side supporting-evidence check for readiness attestations.
 * Requires membership authorization first. Evidence IDs from a client or
 * attestation are treated as untrusted lookup keys, never authorization.
 * Query is scoped through the canonical sites.organization_id ownership.
 */
export type AttestationEvidenceQuery = (
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<readonly { id: string; site_id: string; source: string; observed_at: Date | string }[]>;

export function createAttestationEvidenceVerifier(sql: AttestationEvidenceQuery) {
  return async (scope: { organizationId: string; siteId: string }, evidenceId: string) => {
    if (!scope.organizationId.trim() || !scope.siteId.trim() || !evidenceId.trim()) return null;
    const rows = await sql`
      SELECT e.id, e.site_id, e.source, e.observed_at
      FROM evidence e
      JOIN sites s ON s.id = e.site_id
      WHERE e.id = ${evidenceId}
        AND s.id = ${scope.siteId}
        AND s.organization_id = ${scope.organizationId}
        AND s.is_active = true
      LIMIT 2
    `;
    if (rows.length !== 1) return null;
    const row = rows[0];
    const observedAt = row.observed_at instanceof Date ? row.observed_at.toISOString() : row.observed_at;
    if (row.id !== evidenceId || row.site_id !== scope.siteId ||
        !row.source.trim() || !Number.isFinite(Date.parse(observedAt))) return null;
    return { id: row.id, source: row.source, observedAt };
  };
}

/**
 * Read-only latest readiness attestation lookup; requires membership authorization
 * and a separately reviewed candidate schema migration before runtime use.
 * Evidence ownership is checked by the SQL join, not merely by a foreign key.
 * No database connections or routes are registered here.
 */
export type AttestationRowQuery = (
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<readonly {
  organization_id: string; site_id: string; kind: string; evidence_id: string;
  authority: string; complete: boolean; verified_at: Date | string;
}[]>;

export function createCustomerAttestationReader(sql: AttestationRowQuery) {
  return async (scope: { organizationId: string; siteId: string }, kind: "setup" | "initial_analysis") => {
    if (!scope.organizationId.trim() || !scope.siteId.trim() ||
        (kind !== "setup" && kind !== "initial_analysis")) return null;
    const rows = await sql`
      SELECT a.organization_id, a.site_id, a.kind, a.evidence_id,
             a.authority, a.complete, a.verified_at
      FROM customer_readiness_attestations a
      JOIN sites s ON s.id = a.site_id AND s.organization_id = a.organization_id
      JOIN evidence e ON e.id = a.evidence_id AND e.site_id = a.site_id
      WHERE a.organization_id = ${scope.organizationId}
        AND a.site_id = ${scope.siteId}
        AND a.kind = ${kind}
        AND s.is_active = true
      ORDER BY a.verified_at DESC, a.id DESC
      LIMIT 1
    `;
    if (rows.length !== 1) return null;
    const row = rows[0];
    const verifiedAt = row.verified_at instanceof Date ? row.verified_at.toISOString() : row.verified_at;
    if (row.organization_id !== scope.organizationId || row.site_id !== scope.siteId ||
        row.kind !== kind || !row.evidence_id.trim() || !row.authority.trim() ||
        typeof row.complete !== "boolean" || !Number.isFinite(Date.parse(verifiedAt))) return null;
    return { organizationId: row.organization_id, siteId: row.site_id, evidenceId: row.evidence_id,
      authority: row.authority, complete: row.complete, verifiedAt };
  };
}

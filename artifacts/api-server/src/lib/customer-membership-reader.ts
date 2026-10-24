import type { CustomerSiteGrant } from "./customer-site-scope.js";

/**
 * Read-only membership query for the proposed customer membership schema.
 * Call only after independent schema migration certification/adoption.
 * SQL is parameterized; principal is taken from the authenticated session.
 * No default tenant, role-based bypass, or implicit Diamond Shelf site.
 */
export type MembershipQuery = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<readonly {
  organization_id: string;
  site_id: string;
  principal_subject: string;
}[]>;

export function createCustomerGrantReader(sql: MembershipQuery) {
  return async (subject: string): Promise<readonly CustomerSiteGrant[]> => {
    if (!subject.trim()) return [];
    const rows = await sql`
      SELECT sm.organization_id, sm.site_id, sm.principal_subject
      FROM customer_site_memberships sm
      JOIN customer_organization_memberships om
        ON om.organization_id = sm.organization_id
       AND om.principal_subject = sm.principal_subject
      JOIN sites s ON s.id = sm.site_id AND s.organization_id = sm.organization_id
      WHERE sm.principal_subject = ${subject}
        AND sm.active = true
        AND om.active = true
        AND s.is_active = true
      ORDER BY sm.site_id
    `;
    // Query-scoping alone is insufficient if the persistence adapter returns
    // malformed or mixed-tenant rows. Reject the entire result, not a subset.
    if (!Array.isArray(rows) || rows.length > 100 || rows.some(row =>
      !row || typeof row.organization_id !== "string" ||
      typeof row.site_id !== "string" || typeof row.principal_subject !== "string" ||
      !row.organization_id.trim() || !row.site_id.trim() ||
      row.principal_subject !== subject) ||
      new Set(rows.map(row => row.site_id)).size !== rows.length) {
      throw new Error("customer_membership_rows_invalid");
    }
    return rows.map(row => ({
      organizationId: row.organization_id,
      siteId: row.site_id,
      principalSubject: row.principal_subject,
      active: true,
    }));
  };
}

/**
 * Pure, non-persisting site-access boundary for the future customer API.
 * Caller MUST obtain grants from an authenticated server-side membership store.
 * Never populate grants from request bodies, query strings or operator role alone.
 * This module does not authorize runtime access until an authoritative loader exists.
 */
export type CustomerSiteGrant = {
  principalSubject: string;
  organizationId: string;
  siteId: string;
  active: boolean;
};

export type SiteScopeResult =
  | { ok: true; organizationId: string; siteId: string }
  | { ok: false; reason: "unauthenticated" | "site_required" | "site_not_authorized" };

export function resolveCustomerSiteScope(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  grants: readonly CustomerSiteGrant[];
}): SiteScopeResult {
  const subject = input.principalSubject?.trim();
  if (!subject) return { ok: false, reason: "unauthenticated" };
  const memberships = input.grants.filter(g =>
    g.active && g.principalSubject === subject &&
    !!g.organizationId.trim() && !!g.siteId.trim()
  );
  const distinct = new Map(memberships.map(g => [g.siteId, g]));
  const siteId = input.requestedSiteId?.trim();
  if (!siteId && distinct.size !== 1) return { ok: false, reason: "site_required" };
  const grant = distinct.get(siteId || [...distinct.keys()][0]);
  if (!grant) return { ok: false, reason: "site_not_authorized" };
  return { ok: true, organizationId: grant.organizationId, siteId: grant.siteId };
}

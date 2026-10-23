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
  // Conflicting organization ownership for one site is not a selectable grant.
  // Silently keeping the last row would make authorization depend on row order.
  const distinct = new Map<string, CustomerSiteGrant>();
  const conflicts = new Set<string>();
  for (const grant of memberships) {
    const prior = distinct.get(grant.siteId);
    if (prior && prior.organizationId !== grant.organizationId) conflicts.add(grant.siteId);
    else distinct.set(grant.siteId, grant);
  }
  for (const siteId of conflicts) distinct.delete(siteId);
  const siteId = input.requestedSiteId?.trim();
  if (siteId && conflicts.has(siteId)) return { ok: false, reason: "site_not_authorized" };
  if (!siteId && distinct.size !== 1) return { ok: false, reason: "site_required" };
  const grant = distinct.get(siteId || [...distinct.keys()][0]);
  if (!grant) return { ok: false, reason: "site_not_authorized" };
  return { ok: true, organizationId: grant.organizationId, siteId: grant.siteId };
}

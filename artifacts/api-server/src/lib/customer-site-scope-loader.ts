import { resolveCustomerSiteScope, type CustomerSiteGrant, type SiteScopeResult } from "./customer-site-scope.js";

/**
 * Authenticated, read-only boundary. The membership reader must be an
 * independently reviewed, authoritative server-side store (not user input).
 * No endpoint is registered and no database is accessed by this module.
 */
export type CustomerGrantReader = (principalSubject: string) => Promise<readonly CustomerSiteGrant[]>;

export type CustomerScopeLoadResult =
  | SiteScopeResult
  | { ok: false; reason: "membership_unavailable" };

export async function loadCustomerSiteScope(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  readGrants: CustomerGrantReader;
}): Promise<CustomerScopeLoadResult> {
  const principalSubject = input.principalSubject?.trim();
  if (!principalSubject) return { ok: false, reason: "unauthenticated" };
  try {
    const grants = await input.readGrants(principalSubject);
    if (!Array.isArray(grants)) return { ok: false, reason: "membership_unavailable" };
    return resolveCustomerSiteScope({ principalSubject, requestedSiteId: input.requestedSiteId, grants });
  } catch {
    // Never convert a failed membership lookup to global-role access.
    return { ok: false, reason: "membership_unavailable" };
  }
}

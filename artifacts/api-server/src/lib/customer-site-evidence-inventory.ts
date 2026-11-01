import { createCustomerSiteIdentityReader, type SiteIdentityQuery } from "./customer-site-identity-reader.js";
import { createCustomerEvidenceObservationReader, type EvidenceObservationQuery } from "./customer-evidence-observation-reader.js";

/**
 * Bounded read-only site evidence inventory. This is NOT the full capability
 * projection: core schema observations do not certify setup/analysis completion,
 * current provider health, or numeric performance metrics.
 * Caller must authorize scope against authenticated memberships first.
 */
export function createCustomerSiteEvidenceInventory(
  siteSql: SiteIdentityQuery,
  evidenceSql: EvidenceObservationQuery,
) {
  const readSite = createCustomerSiteIdentityReader(siteSql);
  const readObservations = createCustomerEvidenceObservationReader(evidenceSql);
  return async (scope: { organizationId: string; siteId: string }) => {
    const site = await readSite(scope);
    if (!site) return null;
    const observations = await readObservations(scope);
    if (observations === null) return null;
    return { ...site, observations };
  };
}

import { loadCustomerSiteScope, type CustomerGrantReader } from "./customer-site-scope-loader.js";
import type { CustomerSiteEvidence } from "./customer-capability-projection.js";

/**
 * Read-only authorized evidence inventory pipeline. The inventory is not a
 * substitute for proved setup, analysis or metric readiness.
 * This contract is intentionally not registered as a runtime endpoint.
 */
export type SiteEvidenceInventory = {
  siteId: string; organizationId: string; name: string; domain: string;
  observations: Array<{ id: string; source: string; kind: string; observedAt: string }>;
};
export type SiteEvidenceInventoryReader = (
  scope: { siteId: string; organizationId: string },
) => Promise<SiteEvidenceInventory | null>;

export async function loadAuthorizedSiteEvidenceInventory(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  readGrants: CustomerGrantReader;
  readInventory: SiteEvidenceInventoryReader;
}) {
  const scope = await loadCustomerSiteScope(input);
  if (!scope.ok) return scope;
  try {
    const inventory = await input.readInventory({ organizationId: scope.organizationId, siteId: scope.siteId });
    if (!inventory || inventory.siteId !== scope.siteId || inventory.organizationId !== scope.organizationId) {
      return { ok: false as const, reason: "inventory_unavailable" as const };
    }
    return { ok: true as const, inventory };
  } catch {
    return { ok: false as const, reason: "inventory_unavailable" as const };
  }
}

// Do not coerce observations into a CustomerSiteEvidence document: such a
// conversion would falsely establish setupComplete/analysisComplete.
export type NotYetCertifiedCustomerEvidence = Omit<CustomerSiteEvidence, "setupComplete" | "analysisComplete" | "sources" | "metrics">;

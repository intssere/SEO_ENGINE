import { validateCustomerSiteCapability, type CustomerSiteCapability } from "../lib/customer-site-capability";

/**
 * Read-only customer homepage view model. Not attached to a live endpoint.
 * Refuses unverified or malformed customer payloads rather than using
 * operator aggregates, synthetic metrics or a default customer site.
 */
export type CustomerHomeView =
  | { kind: "unverified"; heading: "Verification pending"; description: string }
  | { kind: "verified"; state: Exclude<CustomerSiteCapability["state"], "no_site">; site: NonNullable<CustomerSiteCapability["site"]>; reason: string; sources: CustomerSiteCapability["sources"]; metrics: CustomerSiteCapability["metrics"] };

export function buildCustomerHomeView(candidate: CustomerSiteCapability | null): CustomerHomeView {
  const pending: CustomerHomeView = {
    kind: "unverified", heading: "Verification pending",
    description: "Customer identity and SEO evidence are unavailable until site authorization and provenance checks succeed.",
  };
  if (!candidate || !validateCustomerSiteCapability(candidate) ||
      candidate.state === "no_site" || !candidate.site) return pending;
  return {
    kind: "verified", state: candidate.state,
    site: { id: candidate.site.id, name: candidate.site.name, domain: candidate.site.domain },
    reason: candidate.reason,
    sources: candidate.sources.map(source => ({
      name: source.name, status: source.status, observedAt: source.observedAt,
    })),
    metrics: candidate.metrics.map(metric => ({
      label: metric.label, value: metric.value, unit: metric.unit,
      source: metric.source, observedAt: metric.observedAt,
    })),
  };
}

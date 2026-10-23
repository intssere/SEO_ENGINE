/**
 * UX-CH read-only capability presentation contract.
 *
 * This model does not infer readiness from operator dashboard aggregates.
 * A future authenticated site-scoped endpoint must authorize and populate
 * these values. Unknown measurements must remain null.
 */
export type CustomerSiteState =
  | "no_site"
  | "setup_required"
  | "analysis_pending"
  | "site_operational"
  | "site_degraded";

export type EvidenceStatus = "available" | "unavailable" | "stale" | "unknown";

export interface CustomerSiteCapability {
  state: CustomerSiteState;
  site: null | { id: string; name: string; domain: string };
  reason: string;
  authorized: boolean;
  sources: Array<{ name: string; status: EvidenceStatus; observedAt: string | null }>;
  metrics: Array<{ label: string; value: number | null; unit: string; observedAt: string | null; source: string | null }>;
}

export function validateCustomerSiteCapability(value: CustomerSiteCapability): boolean {
  if (!["no_site", "setup_required", "analysis_pending", "site_operational", "site_degraded"].includes(value.state)) return false;
  if (!value.reason.trim()) return false;
  if (value.state === "no_site") return !value.authorized && value.site === null && value.metrics.length === 0 && value.sources.length === 0;
  if (!value.authorized || !value.site?.id.trim() || !value.site.name.trim() || !value.site.domain.trim()) return false;
  if (!value.sources.every(source =>
    !!source.name.trim() &&
    ["available", "unavailable", "stale", "unknown"].includes(source.status) &&
    (source.observedAt === null || Number.isFinite(Date.parse(source.observedAt)))
  )) return false;
  if (value.state === "site_operational" && (value.sources.length === 0 || value.sources.some(source => source.status !== "available" || !source.observedAt))) return false;
  return value.metrics.every(metric =>
    !!metric.label.trim() && !!metric.unit.trim() &&
    (metric.value === null
      ? metric.source === null && metric.observedAt === null
      : Number.isFinite(metric.value) && !!metric.source?.trim() &&
        !!metric.observedAt && Number.isFinite(Date.parse(metric.observedAt)) &&
        value.sources.some(source => source.name === metric.source &&
          source.status === "available" && !!source.observedAt &&
          Date.parse(source.observedAt) >= Date.parse(metric.observedAt)))
  );
}

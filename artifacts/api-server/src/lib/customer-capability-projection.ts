/**
 * Pure projection from a previously authorized site scope.
 * No database queries, providers or global operator dashboard are accessed.
 * Unknown evidence is represented as unavailable, never zero.
 */
export type CustomerCapabilitySource = {
  name: string;
  status: "available" | "unavailable" | "stale" | "unknown";
  observedAt: string | null;
};
export type CustomerCapabilityMetric = {
  label: string;
  value: number | null;
  unit: string;
  observedAt: string | null;
  source: string | null;
};
export type CustomerSiteEvidence = {
  organizationId: string;
  siteId: string;
  name: string;
  domain: string;
  setupComplete: boolean;
  analysisComplete: boolean;
  sources: CustomerCapabilitySource[];
  metrics: CustomerCapabilityMetric[];
};
export function projectCustomerCapability(
  scope: { organizationId: string; siteId: string },
  evidence: CustomerSiteEvidence | null,
) {
  if (!evidence || evidence.organizationId !== scope.organizationId || evidence.siteId !== scope.siteId) {
    return null;
  }
  if (!evidence.name.trim() || !evidence.domain.trim()) return null;
  const sources = evidence.sources.map(source => ({ ...source }));
  const metrics = evidence.metrics.map(metric => ({ ...metric }));
  if (!sources.every(source => source.name.trim() &&
      ["available", "unavailable", "stale", "unknown"].includes(source.status) &&
      (source.observedAt === null || Number.isFinite(Date.parse(source.observedAt))))) return null;
  if (!metrics.every(metric => metric.label.trim() && metric.unit.trim() &&
      (metric.value === null ? metric.source === null && metric.observedAt === null :
      Number.isFinite(metric.value) && !!metric.source?.trim() &&
      !!metric.observedAt && Number.isFinite(Date.parse(metric.observedAt)) &&
      sources.some(source => source.name === metric.source && source.status === "available" &&
        !!source.observedAt && Date.parse(source.observedAt) >= Date.parse(metric.observedAt!))))) return null;

  const degraded = sources.some(source => source.status !== "available" || !source.observedAt);
  const state: "setup_required" | "analysis_pending" | "site_degraded" | "site_operational" = !evidence.setupComplete ? "setup_required" :
    !evidence.analysisComplete ? "analysis_pending" :
    degraded || sources.length === 0 ? "site_degraded" : "site_operational";
  const reason = state === "setup_required" ? "Verified site setup is incomplete" :
    state === "analysis_pending" ? "Verified site analysis has not completed" :
    state === "site_degraded" ? "Verified source readiness is incomplete" :
    "Verified site sources are available";
  return { state, site: { id: scope.siteId, name: evidence.name, domain: evidence.domain },
    reason, authorized: true, sources, metrics };
}

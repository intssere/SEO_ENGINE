import type { Request, Response } from "express";
import { loadCustomerSiteScope, type CustomerGrantReader } from "../lib/customer-site-scope-loader.js";

/**
 * Not registered: schema adoption, grant provisioning and site-scoped evidence
 * projection require separate review. Even with global auth enforcement disabled,
 * this customer route MUST require a verified server-side principal.
 */
export type ScopedCapabilityReader = (scope: { organizationId: string; siteId: string }) => Promise<{
  state: "setup_required" | "analysis_pending" | "site_operational" | "site_degraded";
  site: { id: string; name: string; domain: string };
  organizationId: string;
  authorized: true;
  reason: string;
  sources: readonly { name: string; status: "available" | "unavailable" | "stale" | "unknown"; observedAt: string | null }[];
  metrics: readonly { label: string; value: number | null; unit: string; observedAt: string | null; source: string | null }[];
} | null>;

/** The optional reader is server-injected only; never obtained from an HTTP request. */
export function createCustomerCapabilityHandler(readGrants: CustomerGrantReader, readCapability?: ScopedCapabilityReader) {
  return async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.subject) {
      res.status(401).json({ error: "authentication_required" });
      return;
    }
    const supplied = req.query.siteId;
    if (supplied !== undefined && (typeof supplied !== "string" || !supplied.trim())) {
      res.status(400).json({ error: "invalid_site_id" });
      return;
    }
    const result = await loadCustomerSiteScope({
      principalSubject: req.auth.subject,
      requestedSiteId: typeof supplied === "string" ? supplied : null,
      readGrants,
    });
    if (!result.ok) {
      const status = result.reason === "membership_unavailable" ? 503
        : result.reason === "site_required" ? 400
        : result.reason === "unauthenticated" ? 401 : 404;
      res.status(status).json({ error: result.reason });
      return;
    }
    // Without a reviewed site-scoped projection, never reuse operator aggregates.
    if (!readCapability) {
      res.status(503).json({ error: "customer_capabilities_not_implemented" });
      return;
    }
    try {
      const capability = await readCapability({ organizationId: result.organizationId, siteId: result.siteId });
      if (!capability) {
        res.status(503).json({ error: "customer_capabilities_unavailable" });
        return;
      }
      if (capability.organizationId !== result.organizationId || capability.site?.id !== result.siteId ||
          capability.authorized !== true || !capability.site.name.trim() || !capability.site.domain.trim() ||
          !capability.reason.trim() ||
          !["setup_required", "analysis_pending", "site_operational", "site_degraded"].includes(capability.state) ||
          !Array.isArray(capability.sources) || !Array.isArray(capability.metrics) ||
          (capability.state === "site_operational" &&
            (capability.sources.length === 0 || capability.sources.some(source =>
              !source || source.status !== "available" || !source.observedAt))) ||
          !capability.sources.every(source => source && !!source.name?.trim() &&
            ["available", "unavailable", "stale", "unknown"].includes(source.status) &&
            (source.observedAt === null || Number.isFinite(Date.parse(source.observedAt)))) ||
          !capability.metrics.every(metric => metric && !!metric.label?.trim() && !!metric.unit?.trim() &&
            (metric.value === null ? metric.source === null && metric.observedAt === null :
              Number.isFinite(metric.value) && !!metric.source?.trim() && !!metric.observedAt &&
              Number.isFinite(Date.parse(metric.observedAt))))) {
        res.status(503).json({ error: "customer_capabilities_unavailable" });
        return;
      }
      // Explicit allowlist: never expose internal or future persistence fields.
      res.status(200).json({
        state: capability.state, site: capability.site, reason: capability.reason,
        authorized: true, sources: capability.sources, metrics: capability.metrics,
      });
    } catch {
      res.status(503).json({ error: "customer_capabilities_unavailable" });
    }
  };
}

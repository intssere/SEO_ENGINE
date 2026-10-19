import type { Request, Response } from "express";
import { loadCustomerSiteScope, type CustomerGrantReader } from "../lib/customer-site-scope-loader.js";

/**
 * Not registered: schema adoption, grant provisioning and site-scoped evidence
 * projection require separate review. Even with global auth enforcement disabled,
 * this customer route MUST require a verified server-side principal.
 */
export function createCustomerCapabilityHandler(readGrants: CustomerGrantReader) {
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
    // No customer-scoped metrics/readiness loader exists yet. Never reuse
    // the global operator dashboard or invent a capability document.
    res.status(503).json({ error: "customer_capabilities_not_implemented" });
  };
}

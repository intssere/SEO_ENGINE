import { loadCustomerSiteScope, type CustomerGrantReader } from "./customer-site-scope-loader.js";
import { projectCustomerCapability, type CustomerSiteEvidence } from "./customer-capability-projection.js";

/**
 * Not connected to routes or a live database. Both readers are server-supplied.
 * Site evidence MUST be queried using the resolved organization and site pair;
 * no request-provided organization or operator-dashboard data is trusted.
 */
export type CustomerEvidenceReader = (
  scope: { organizationId: string; siteId: string },
) => Promise<CustomerSiteEvidence | null>;

export type CustomerCapabilityLoadResult =
  | { ok: true; capability: NonNullable<ReturnType<typeof projectCustomerCapability>> }
  | { ok: false; reason: "unauthenticated" | "site_required" | "site_not_authorized" | "membership_unavailable" | "evidence_unavailable" | "evidence_scope_mismatch" };

export async function loadCustomerCapability(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  readGrants: CustomerGrantReader;
  readEvidence: CustomerEvidenceReader;
}): Promise<CustomerCapabilityLoadResult> {
  const authorized = await loadCustomerSiteScope(input);
  if (!authorized.ok) return authorized;
  let evidence: CustomerSiteEvidence | null;
  try {
    evidence = await input.readEvidence({ organizationId: authorized.organizationId, siteId: authorized.siteId });
  } catch {
    return { ok: false, reason: "evidence_unavailable" };
  }
  if (!evidence) return { ok: false, reason: "evidence_unavailable" };
  const capability = projectCustomerCapability(authorized, evidence);
  if (!capability) return { ok: false, reason: "evidence_scope_mismatch" };
  return { ok: true, capability };
}

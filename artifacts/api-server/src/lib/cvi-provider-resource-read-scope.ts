import { GOOGLE_READ_SCOPES, SHOPIFY_READ_SCOPES } from "@seo-engine/oauth-connection-manager";
import type { UniversalSiteIdentity, UniversalConnectionIdentity } from "./universal-site-resource-identity.js";

export const CVI_PROVIDER_RESOURCE_READ_SCOPE_VERSION = "cvi-1b4j-provider-resource-read-scope-v1" as const;

export type CviProviderReadScopeReview = Readonly<{
  version: typeof CVI_PROVIDER_RESOURCE_READ_SCOPE_VERSION;
  outcome: "DENY" | "PENDING_INDEPENDENT_PROVIDER_ATTESTATION";
  reasons: readonly string[];
  independentlyVerified: false;
  authorizationGranted: false;
  publicationAuthorized: false;
  executionAuthorized: false;
}>;

/** Evaluates declared connection attributes, NOT provider-attested ownership.
 * This function is deliberately incapable of issuing access authorization.
 * Only independently acquired and current server-side provider evidence may
 * eventually prove property/resource entitlement.
 */
export function reviewCviProviderResourceReadScope(input: Readonly<{
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity;
  provider: string;
  scopes: readonly string[];
  state: "connected" | "pending" | "revoked" | "error";
  externalResource: string | null;
}>): CviProviderReadScopeReview {
  const reasons: string[] = [];
  const { site, connection, provider, scopes, state, externalResource } = input;
  if (connection.siteId !== site.siteId ||
    connection.siteIdentityFingerprint !== site.siteIdentityFingerprint ||
    connection.provider !== provider) reasons.push("connection_site_identity_mismatch");
  if (state !== "connected") reasons.push("connection_not_active");
  if (!Array.isArray(scopes) || scopes.some(scope => typeof scope !== "string")) {
    reasons.push("invalid_scope_set");
  } else {
    const required = provider === "google" ? GOOGLE_READ_SCOPES[0]
      : provider === "shopify" ? SHOPIFY_READ_SCOPES[1] : null;
    if (!required || !scopes.includes(required)) reasons.push("required_read_scope_missing");
    // Reject write-capable scopes. This is deliberately stricter than OAuth's
    // effective permissions and is not an access or provider-ownership proof.
    if (scopes.some(scope => scope.startsWith("write_") ||
      /(?:^|[./])(?:write|edit|manage)(?:[./]|$)/i.test(scope))) reasons.push("write_scope_not_admissible");
  }
  if (typeof externalResource !== "string" || !externalResource.trim()) {
    reasons.push("external_resource_unbound");
  } else if (provider === "shopify") {
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(externalResource) ||
      connection.externalAccountId !== externalResource) reasons.push("shop_domain_binding_mismatch");
  } else if (provider === "google") {
    // GSC domain properties and URL-prefix properties can both occur.
    // Exact resource attestation must be obtained separately from the provider.
    const normalized = externalResource.trim().toLowerCase();
    const origin = site.canonicalOrigin.toLowerCase().replace(/\/$/, "");
    if (!normalized.startsWith(origin + "/") && normalized !== origin &&
      normalized !== "sc-domain:" + site.hostname.toLowerCase()) {
      reasons.push("gsc_property_identity_mismatch");
    }
  } else {
    reasons.push("provider_not_supported");
  }
  return {
    version: CVI_PROVIDER_RESOURCE_READ_SCOPE_VERSION,
    outcome: reasons.length === 0 ? "PENDING_INDEPENDENT_PROVIDER_ATTESTATION" : "DENY",
    reasons: reasons.sort(),
    independentlyVerified: false, authorizationGranted: false,
    publicationAuthorized: false, executionAuthorized: false,
  };
}

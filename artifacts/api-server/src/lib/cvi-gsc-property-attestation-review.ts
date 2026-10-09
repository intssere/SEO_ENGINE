import { createHash } from "node:crypto";
import {
  GSC_READONLY_SCOPE,
  GSC_ACCEPTED_PERMISSION_LEVELS,
  normalizeGscSitesListResponse,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import type { UniversalSiteIdentity } from "./universal-site-resource-identity.js";

export const CVI_GSC_PROPERTY_ATTESTATION_REVIEW_VERSION =
  "cvi-1b4l-gsc-property-attestation-review-v1" as const;

export type CviGscAttestationReview = Readonly<{
  version: typeof CVI_GSC_PROPERTY_ATTESTATION_REVIEW_VERSION;
  outcome: "DENY" | "PENDING_TRUSTED_TRANSPORT_ATTESTATION";
  reasons: readonly string[];
  observationFingerprint: string;
  independentlyVerified: false;
  authorizationGranted: false;
  publicationAuthorized: false;
  executionAuthorized: false;
}>;

const HEX = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function instant(value: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw new Error("cvi_1b4l_invalid_clock");
  const t = Date.parse(value);
  if (!Number.isFinite(t) || new Date(t).toISOString() !== value) throw new Error("cvi_1b4l_invalid_clock");
  return t;
}
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * Reviews claimed GSC sites.list observations. Input can be forged and does
 * NOT prove a provider call occurred or a property is owned by the tenant.
 * Network transport, credential custody and authorization are separate.
 */
export function reviewCviGscPropertyAttestation(input: Readonly<{
  site: UniversalSiteIdentity;
  requestedProperty: string;
  observedAt: string;
  evaluatedAt: string;
  maxAgeSeconds: number;
  connectionIdentityFingerprint: string;
  grantedScopes: readonly string[];
  observation: unknown;
}>): CviGscAttestationReview {
  const evaluated = instant(input.evaluatedAt);
  const observed = instant(input.observedAt);
  if (!Number.isSafeInteger(input.maxAgeSeconds) || input.maxAgeSeconds < 1 ||
      input.maxAgeSeconds > 3600) throw new Error("cvi_1b4l_max_age_invalid");
  const reasons: string[] = [];
  if (observed > evaluated || evaluated - observed > input.maxAgeSeconds * 1000)
    reasons.push("observation_stale_or_future");
  if (!HEX.test(input.connectionIdentityFingerprint))
    reasons.push("connection_identity_missing");
  if (input.grantedScopes.length !== 1 || input.grantedScopes[0] !== GSC_READONLY_SCOPE)
    reasons.push("scope_not_exact_readonly");

  let properties: ReturnType<typeof normalizeGscSitesListResponse> = [];
  try {
    properties = normalizeGscSitesListResponse(input.observation);
  } catch {
    reasons.push("provider_observation_invalid");
  }
  const property = properties.filter(p => p.siteUrl === input.requestedProperty);
  if (property.length !== 1) reasons.push("property_not_uniquely_present");
  else if (!(GSC_ACCEPTED_PERMISSION_LEVELS as readonly string[]).includes(property[0]!.permissionLevel ?? ""))
    reasons.push("property_permission_insufficient");

  // Only an exact domain property for the canonical site hostname or exact
  // canonical-origin URL prefix is accepted. This intentionally excludes
  // partial hostname matching and broader parent-domain assumptions.
  const validProperty = input.requestedProperty === "sc-domain:" + input.site.hostname ||
    input.requestedProperty === input.site.canonicalOrigin ||
    input.requestedProperty === input.site.canonicalOrigin + "/";
  if (!validProperty) reasons.push("property_site_binding_mismatch");

  const fingerprint = hash({
    version: CVI_GSC_PROPERTY_ATTESTATION_REVIEW_VERSION,
    site: input.site.siteIdentityFingerprint,
    connection: input.connectionIdentityFingerprint,
    property: input.requestedProperty,
    scopes: input.grantedScopes,
    observedAt: input.observedAt,
    observation: input.observation,
  });
  return {
    version: CVI_GSC_PROPERTY_ATTESTATION_REVIEW_VERSION,
    outcome: reasons.length ? "DENY" : "PENDING_TRUSTED_TRANSPORT_ATTESTATION",
    reasons: reasons.sort(),
    observationFingerprint: fingerprint,
    independentlyVerified: false,
    authorizationGranted: false,
    publicationAuthorized: false,
    executionAuthorized: false,
  };
}

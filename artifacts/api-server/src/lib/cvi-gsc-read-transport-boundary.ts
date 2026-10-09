import { GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { reviewCviGscPropertyAttestation } from "./cvi-gsc-property-attestation-review.js";
import type { UniversalSiteIdentity, UniversalConnectionIdentity } from "./universal-site-resource-identity.js";

export const CVI_GSC_READ_TRANSPORT_BOUNDARY_VERSION = "cvi-1b4m-gsc-read-transport-boundary-v1" as const;

export interface CviGscSitesTransport {
  /** Only implementations owned by authenticated server runtime may satisfy this port.
   * External callers MUST NOT supply a transport implementation.
   */
  listSitesReadOnly(): Promise<unknown>;
}
export type CviGscBoundedTransportOutcome = Readonly<{
  version: typeof CVI_GSC_READ_TRANSPORT_BOUNDARY_VERSION;
  status: "DENY" | "PENDING_TRUSTED_TRANSPORT_AND_TENANT_ATTESTATION";
  reasons: readonly string[];
  observationFingerprint: string | null;
  independentlyVerified: false;
  authorizationGranted: false;
  publicationAuthorized: false;
  executionAuthorized: false;
}>;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function clock(value: string): number {
  if (!ISO.test(value) || !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !== value) {
    throw new Error("cvi_1b4m_invalid_clock");
  }
  return Date.parse(value);
}

/** Never accepts browser JSON as a trusted transport. This orchestrator is
 * injectable for offline tests and it issues NO authorization even when its
 * untrusted transport fixture claims access. No network call is implemented
 * in this module. The runtime transport and custody remain unintegrated.
 */
export async function inspectCviGscReadTransport(input: Readonly<{
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity;
  requestedProperty: string;
  evaluatedAt: string;
  maxAgeSeconds: number;
  transport: CviGscSitesTransport;
  observedAt: () => string;
}>): Promise<CviGscBoundedTransportOutcome> {
  const deny = (reasons: readonly string[], observationFingerprint: string | null = null):
    CviGscBoundedTransportOutcome => ({
      version: CVI_GSC_READ_TRANSPORT_BOUNDARY_VERSION,
      status: "DENY", reasons,
      observationFingerprint, independentlyVerified: false,
      authorizationGranted: false, publicationAuthorized: false, executionAuthorized: false,
    });
  const started = clock(input.evaluatedAt);
  if (input.connection.provider !== "google" ||
    input.connection.siteId !== input.site.siteId ||
    input.connection.siteIdentityFingerprint !== input.site.siteIdentityFingerprint) {
    return deny(["connection_scope_mismatch"]);
  }
  if (!Number.isSafeInteger(input.maxAgeSeconds) ||
    input.maxAgeSeconds < 1 || input.maxAgeSeconds > 3600) {
    return deny(["freshness_policy_invalid"]);
  }

  let observation: unknown;
  try {
    observation = await input.transport.listSitesReadOnly();
  } catch {
    return deny(["transport_failed"]);
  }
  let observedAt: string;
  try {
    observedAt = input.observedAt();
    const observed = clock(observedAt);
    if (observed < started || observed - started > 30_000) {
      return deny(["observation_outside_bounded_request"]);
    }
  } catch {
    return deny(["observation_clock_invalid"]);
  }
  const review = reviewCviGscPropertyAttestation({
    site: input.site,
    requestedProperty: input.requestedProperty,
    observedAt,
    evaluatedAt: observedAt,
    maxAgeSeconds: input.maxAgeSeconds,
    connectionIdentityFingerprint: input.connection.connectionIdentityFingerprint,
    grantedScopes: [GSC_READONLY_SCOPE],
    observation,
  });
  if (review.outcome === "DENY") return deny(review.reasons, review.observationFingerprint);
  return {
    version: CVI_GSC_READ_TRANSPORT_BOUNDARY_VERSION,
    status: "PENDING_TRUSTED_TRANSPORT_AND_TENANT_ATTESTATION",
    reasons: ["runtime_transport_custody_unverified", "tenant_authorization_unverified"],
    observationFingerprint: review.observationFingerprint,
    independentlyVerified: false, authorizationGranted: false,
    publicationAuthorized: false, executionAuthorized: false,
  };
}

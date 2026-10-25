import { createHash } from "node:crypto";
import { reviewCviGscPropertyAttestation } from "./cvi-gsc-property-attestation-review.js";
import type { UniversalSiteIdentity, UniversalConnectionIdentity } from "./universal-site-resource-identity.js";

export const CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION = "cvi-1c11-gsc-raw-response-custody-v1" as const;
export const CVI_GSC_SITES_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites" as const;
export type CviGscRawResponse = Readonly<{
  requestMethod: string;
  requestUrl: string;
  finalUrl: string;
  redirected: boolean;
  statusCode: number;
  contentType: string;
  rawBody: Buffer;
}>;
export type CviGscRawCustodyResult = Readonly<{
  version: typeof CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION;
  status: "DENY" | "PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY";
  reasons: readonly string[];
  rawBodySha256: string | null;
  attestationFingerprint: string | null;
  requestNonce: string;
  acquisitionId: string;
  tlsPeerIndependentlyAuthenticated: false;
  oauthCredentialCustodyVerified: false;
  tenantAccessIndependentlyVerified: false;
  providerResponseIndependentlyVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function time(value: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw Error("cvi_1c11_invalid_time");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value)
    throw Error("cvi_1c11_invalid_time");
  return parsed;
}
function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
/** Offline server-response envelope validation. Callers can forge all fields,
 * including finalUrl and HTTP status: nothing here validates TLS peer identity,
 * authenticates provider credentials or proves that any HTTP call occurred.
 * Only a trusted server-owned transport may construct inputs in the future.
 */
export function reviewCviGscRawResponse(input: Readonly<{
  response: CviGscRawResponse;
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity;
  requestedProperty: string;
  requestNonce: string;
  acquisitionId: string;
  requestedAt: string;
  observedAt: string;
}>): CviGscRawCustodyResult {
  const reasons: string[] = [];
  const r = input.response;
  if (!TOKEN.test(input.requestNonce) || !TOKEN.test(input.acquisitionId))
    reasons.push("request_identity_invalid");
  let requested: number | null = null;
  let observed: number | null = null;
  try { requested = time(input.requestedAt); observed = time(input.observedAt); }
  catch { reasons.push("observation_clock_invalid"); }
  if (requested !== null && observed !== null &&
      (observed < requested || observed-requested > 30_000))
    reasons.push("observation_window_invalid");
  if (input.connection.provider !== "google" ||
      input.connection.siteId !== input.site.siteId ||
      input.connection.siteIdentityFingerprint !== input.site.siteIdentityFingerprint)
    reasons.push("connection_site_scope_invalid");
  if (!r || r.requestMethod !== "GET" ||
      r.requestUrl !== CVI_GSC_SITES_ENDPOINT ||
      r.finalUrl !== CVI_GSC_SITES_ENDPOINT ||
      r.redirected !== false)
    reasons.push("endpoint_or_redirect_invalid");
  if (r?.statusCode !== 200) reasons.push("http_status_invalid");
  if (typeof r?.contentType !== "string" ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(r.contentType.trim()))
    reasons.push("content_type_invalid");
  let rawBodySha256: string | null = null;
  let payload: unknown = null;
  if (!Buffer.isBuffer(r?.rawBody) ||
      r.rawBody.length < 2 || r.rawBody.length > 65_536) {
    reasons.push("raw_body_bounds_invalid");
  } else {
    rawBodySha256 = sha256(r.rawBody);
    try { payload = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(r.rawBody)); }
    catch { reasons.push("raw_body_json_invalid"); }
  }
  let attestationFingerprint: string | null = null;
  if (payload !== null && observed !== null &&
      !reasons.includes("connection_site_scope_invalid")) {
    try {
      const review = reviewCviGscPropertyAttestation({
        site:input.site, requestedProperty:input.requestedProperty,
        observedAt:input.observedAt,evaluatedAt:input.observedAt,
        maxAgeSeconds:300,
        connectionIdentityFingerprint:input.connection.connectionIdentityFingerprint,
        grantedScopes:["https://www.googleapis.com/auth/webmasters.readonly"],
        observation:payload,
      });
      attestationFingerprint = review.observationFingerprint;
      if (review.outcome !== "PENDING_TRUSTED_TRANSPORT_ATTESTATION")
        reasons.push("gsc_property_attestation_denied");
    } catch { reasons.push("gsc_property_review_failed"); }
  }
  const unique = [...new Set(reasons)].sort();
  return {
    version:CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,
    status:unique.length ? "DENY" : "PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY",
    reasons:unique,rawBodySha256,attestationFingerprint,
    requestNonce:input.requestNonce,acquisitionId:input.acquisitionId,
    tlsPeerIndependentlyAuthenticated:false,oauthCredentialCustodyVerified:false,
    tenantAccessIndependentlyVerified:false,providerResponseIndependentlyVerified:false,
    executionAuthorized:false,publicationAuthorized:false,
  };
}

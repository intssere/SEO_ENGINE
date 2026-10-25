import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,
  type CviGscRawCustodyResult,
} from "./cvi-gsc-raw-response-custody.js";
import {
  CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION,
  type CviGscCredentialProfileReview,
} from "./cvi-gsc-credential-profile-fence.js";

export const CVI_GSC_ACQUISITION_LINEAGE_VERSION =
  "cvi-1c13-gsc-acquisition-lineage-v1" as const;

export type CviGscAcquisitionLineage = Readonly<{
  version: typeof CVI_GSC_ACQUISITION_LINEAGE_VERSION;
  status: "DENY" | "UNTRUSTED_CAPTURE_REVIEW_ONLY";
  reasons: readonly string[];
  tenantId: string;
  siteId: string;
  connectionId: string;
  authSubject: string;
  authSessionId: string;
  acquisitionId: string;
  requestNonce: string;
  requestedResource: string;
  observationFingerprint: string;
  attestationFingerprint: string;
  packetFingerprint: string;
  requestIdentityConsistent: boolean;
  independentProviderOriginVerified: false;
  independentOAuthCustodyVerified: false;
  durableReplayVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const HEX = /^[a-f0-9]{64}$/;

/** Binds the exact raw-response checksum to an acquisition identity and
 * the existing dedicated GSC profile preflight. The resulting record
 * remains an untrusted input: SHA-256 does not prove Google origin,
 * provider OAuth, tenant entitlement, or successful nonce persistence.
 */
export function correlateCviGscAcquisitionLineage(input: Readonly<{
  raw: CviGscRawCustodyResult;
  profile: CviGscCredentialProfileReview;
  tenantId: string;
  siteId: string;
  connectionId: string;
  authSubject: string;
  authSessionId: string;
  acquisitionId: string;
  requestNonce: string;
  requestedResource: string;
  expectedObservationFingerprint: string;
  expectedAttestationFingerprint: string;
  expectedAcquisitionId: string;
  expectedNonce: string;
  expectedResource: string;
}>): CviGscAcquisitionLineage {
  const reasons: string[] = [];
  const raw = input.raw;
  const profile = input.profile;
  const fields = [
    input.tenantId,input.siteId,input.connectionId,input.authSubject,
    input.authSessionId,input.acquisitionId,input.requestNonce,input.requestedResource,
    input.expectedAcquisitionId,input.expectedNonce,input.expectedResource,
  ];
  if (fields.some(x => typeof x !== "string" || !ID.test(x)))
    reasons.push("acquisition_identity_invalid");
  if (input.acquisitionId !== input.expectedAcquisitionId ||
      input.requestNonce !== input.expectedNonce ||
      input.requestedResource !== input.expectedResource ||
      raw?.acquisitionId !== input.expectedAcquisitionId ||
      raw?.requestNonce !== input.expectedNonce)
    reasons.push("acquisition_nonce_or_resource_mismatch");
  if (!HEX.test(input.expectedObservationFingerprint) ||
      raw?.rawBodySha256 !== input.expectedObservationFingerprint ||
      !HEX.test(input.expectedAttestationFingerprint) ||
      raw?.attestationFingerprint !== input.expectedAttestationFingerprint)
    reasons.push("raw_response_checksum_binding_mismatch");
  if (!raw || raw.version !== CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION ||
      raw.status !== "PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY" ||
      !Array.isArray(raw.reasons) || raw.reasons.length > 0 ||
      raw.tlsPeerIndependentlyAuthenticated !== false ||
      raw.oauthCredentialCustodyVerified !== false ||
      raw.providerResponseIndependentlyVerified !== false ||
      raw.tenantAccessIndependentlyVerified !== false ||
      raw.executionAuthorized !== false ||
      raw.publicationAuthorized !== false)
    reasons.push("raw_response_not_review_ready");
  if (!profile || profile.version !== CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION ||
      profile.status !== "PENDING_TRUSTED_OAUTH_AND_TLS_ORIGIN_ATTESTATION" ||
      !Array.isArray(profile.reasons) || profile.reasons.length > 0 ||
      profile.oauthProfileMatched !== true ||
      profile.rawResponseBound !== true ||
      profile.delegatedCredentialIndependentlyVerified !== false ||
      profile.tlsOriginIndependentlyVerified !== false ||
      profile.tenantPermissionIndependentlyVerified !== false ||
      profile.executionAuthorized !== false ||
      profile.publicationAuthorized !== false)
    reasons.push("dedicated_gsc_profile_not_review_ready");
  const unique = [...new Set(reasons)].sort();
  const status = unique.length ? "DENY" as const : "UNTRUSTED_CAPTURE_REVIEW_ONLY" as const;
  const base = {
    version: CVI_GSC_ACQUISITION_LINEAGE_VERSION,
    status, reasons: unique,
    tenantId: input.tenantId, siteId: input.siteId,
    connectionId: input.connectionId, authSubject: input.authSubject,
    authSessionId: input.authSessionId, acquisitionId: input.acquisitionId,
    requestNonce: input.requestNonce, requestedResource: input.requestedResource,
    observationFingerprint: input.expectedObservationFingerprint,
    attestationFingerprint: input.expectedAttestationFingerprint,
    requestIdentityConsistent: unique.length === 0,
    independentProviderOriginVerified: false as const,
    independentOAuthCustodyVerified: false as const,
    durableReplayVerified: false as const,
    executionAuthorized: false as const, publicationAuthorized: false as const,
  };
  return {
    ...base,
    packetFingerprint: stableEvidenceHash({purpose:CVI_GSC_ACQUISITION_LINEAGE_VERSION,...base}),
  };
}

import {
  verifySanitizedBindingAttestation,
  type AttestationCode,
  type AttestationVerdict,
  type SanitizedBindingIdentity,
  type VerifyAttestationContext,
} from "./p8-8-w09c2n-attestation-verifier.js";

export const W09_C2U_RECEIPT_SCHEMA_VERSION = "p8-8-w09c2u-receipt-v1" as const;

export interface PlatformAttestationReceipt {
  schemaVersion: typeof W09_C2U_RECEIPT_SCHEMA_VERSION;
  verdict: AttestationVerdict;
  code: AttestationCode;
  receiptObservedAt: string;
  freshnessVerdict: "PASS" | "UNPROVED";
  deploymentBindingVerdict: "PASS" | "UNPROVED";
  secretNonObservabilityVerdict: "PASS" | "UNPROVED";
  provenanceVerdict: "PASS" | "UNPROVED";
  identity?: SanitizedBindingIdentity;
}

/**
 * Dormant W09-C2U adapter seam.
 *
 * The caller must supply an already-sanitized producer object and explicit
 * verification context. This module deliberately has no interface for
 * environment maps, connection strings, credentials, database sessions,
 * network clients, provider clients, persistence, or runtime discovery.
 *
 * It approves no provenance authority by itself. C2N remains the sole
 * verifier of the supplied attestation and context.
 */
export function adaptSanitizedPlatformAttestation(
  sanitizedAttestation: unknown,
  context: VerifyAttestationContext,
): PlatformAttestationReceipt {
  const verified = verifySanitizedBindingAttestation(sanitizedAttestation, context);

  return {
    schemaVersion: W09_C2U_RECEIPT_SCHEMA_VERSION,
    verdict: verified.verdict,
    code: verified.code,
    receiptObservedAt: context.observedAt,
    freshnessVerdict: verified.freshnessVerdict,
    deploymentBindingVerdict: verified.deploymentBindingVerdict,
    secretNonObservabilityVerdict: verified.secretNonObservabilityVerdict,
    provenanceVerdict: verified.provenanceVerdict,
    ...(verified.verdict === "PASS" && verified.identity
      ? { identity: verified.identity }
      : {}),
  };
}

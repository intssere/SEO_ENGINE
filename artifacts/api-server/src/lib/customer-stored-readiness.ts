import { assessCustomerReadiness } from "./customer-readiness-assessment.js";
import { verifyStoredCustomerAttestation, type ScopedProofReader } from "./customer-stored-attestation-verifier.js";
import type { ReadinessAttestationRecord } from "./customer-attestation-trust.js";

/**
 * Isolated candidate pipeline: attestation records must come from the
 * authorized site-scoped persistence reader, proof from canonical evidence,
 * and trusted authorities from reviewed server configuration.
 * Not connected to any route, DB pool, or production readiness output.
 */
export async function assessStoredCustomerReadiness(input: {
  scope: { organizationId: string; siteId: string };
  readAttestation: (scope: { organizationId: string; siteId: string }, kind: "setup" | "initial_analysis") => Promise<ReadinessAttestationRecord | null>;
  readProof: ScopedProofReader;
  trustedAuthorities: readonly string[];
  now: Date;
  maxAgeMs: number;
  sourceStatuses: readonly { status: "available" | "stale" | "unavailable" | "unknown"; observedAt: string | null }[];
}) {
  const verify = async (kind: "setup" | "initial_analysis") => {
    let attestation: ReadinessAttestationRecord | null;
    try { attestation = await input.readAttestation(input.scope, kind); }
    catch { return null; }
    const result = await verifyStoredCustomerAttestation({
      scope: input.scope, attestation, readProof: input.readProof,
      trustedAuthorities: input.trustedAuthorities, now: input.now, maxAgeMs: input.maxAgeMs,
    });
    if (!result.ok) return null;
    return { ...input.scope, complete: result.complete, authority: result.authority, verifiedAt: result.verifiedAt };
  };
  const setup = await verify("setup");
  // Missing/invalid setup must not cause speculative downstream reads.
  if (!setup || !setup.complete) return assessCustomerReadiness({
    scope: input.scope, setup, initialAnalysis: null, sourceStatuses: input.sourceStatuses,
  });
  const initialAnalysis = await verify("initial_analysis");
  return assessCustomerReadiness({
    scope: input.scope, setup, initialAnalysis, sourceStatuses: input.sourceStatuses,
  });
}

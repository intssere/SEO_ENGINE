import { loadCustomerSiteScope, type CustomerGrantReader } from "./customer-site-scope-loader.js";
import { assessStoredCustomerReadiness } from "./customer-stored-readiness.js";
import { certifySourceEvidence, type EvidenceCandidate, type TrustedSourcePolicy } from "./customer-source-provenance.js";
import type { ReadinessAttestationRecord } from "./customer-attestation-trust.js";
import type { ScopedProofReader } from "./customer-stored-attestation-verifier.js";

/**
 * Server-supplied evidence rows and trust policies only. Membership is checked
 * before any evidence/attestation read. Never accept caller-certified statuses,
 * client-supplied policies or a connection status as source availability.
 * No runtime router, database pool or migration activation.
 */
export async function loadProvenanceCertifiedCustomerReadiness(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  readGrants: CustomerGrantReader;
  readEvidence: (scope: { organizationId: string; siteId: string }) => Promise<readonly EvidenceCandidate[]>;
  trustedSourcePolicies: readonly TrustedSourcePolicy[];
  readAttestation: (scope: { organizationId: string; siteId: string }, kind: "setup" | "initial_analysis") => Promise<ReadinessAttestationRecord | null>;
  readProof: ScopedProofReader;
  trustedAuthorities: readonly string[];
  now: Date;
  maxAgeMs: number;
}) {
  const authorization = await loadCustomerSiteScope(input);
  if (!authorization.ok) return authorization;
  const scope = { organizationId: authorization.organizationId, siteId: authorization.siteId };
  let evidence: readonly EvidenceCandidate[];
  try {
    evidence = await input.readEvidence(scope);
    if (!Array.isArray(evidence) || evidence.some(item =>
      !item || typeof item.source !== "string" || typeof item.kind !== "string" ||
      typeof item.observedAt !== "string" || typeof item.siteId !== "string" ||
      typeof item.organizationId !== "string" ||
      item.siteId !== scope.siteId || item.organizationId !== scope.organizationId)) {
      return { ok: false as const, reason: "source_evidence_unavailable" as const };
    }
  } catch {
    return { ok: false as const, reason: "source_evidence_unavailable" as const };
  }
  const statuses = evidence.map(candidate => certifySourceEvidence({
    scope, candidate, trustedPolicies: input.trustedSourcePolicies,
    now: input.now, maxAgeMs: input.maxAgeMs,
  }));
  const readiness = await assessStoredCustomerReadiness({
    scope, readAttestation: input.readAttestation, readProof: input.readProof,
    trustedAuthorities: input.trustedAuthorities, now: input.now,
    maxAgeMs: input.maxAgeMs, sourceStatuses: statuses,
  });
  return { ok: true as const, ...scope, readiness };
}

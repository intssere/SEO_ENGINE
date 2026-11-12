import { assessStoredCustomerReadiness } from "./customer-stored-readiness.js";
import type { CustomerEvidenceReader } from "./customer-capability-loader.js";
import type { ScopedProofReader } from "./customer-stored-attestation-verifier.js";
import type { ReadinessAttestationRecord } from "./customer-attestation-trust.js";
import type { CustomerCapabilitySource } from "./customer-capability-projection.js";

/**
 * Unregistered composition of independently scoped server readers. A missing
 * attestation, identity, source lookup, or reviewed trust policy fails closed.
 * No request values, synthetic metrics, providers, or database connections.
 */
export function createCertifiedCustomerEvidenceReader(input: {
  readIdentity: (scope: { organizationId: string; siteId: string }) => Promise<{
    organizationId: string; siteId: string; name: string; domain: string;
  } | null>;
  readAttestation: (scope: { organizationId: string; siteId: string }, kind: "setup" | "initial_analysis") => Promise<ReadinessAttestationRecord | null>;
  readProof: ScopedProofReader;
  readSources: (scope: { organizationId: string; siteId: string }, now: Date, maxAgeMs: number) => Promise<readonly {
    source: string; status: CustomerCapabilitySource["status"]; observedAt: string | null;
  }[] | null>;
  trustedAuthorities: readonly string[];
  now: () => Date;
  maxAgeMs: number;
}): CustomerEvidenceReader {
  return async scope => {
    if (!scope.organizationId.trim() || !scope.siteId.trim() ||
        !input.trustedAuthorities.length || !Number.isFinite(input.maxAgeMs) || input.maxAgeMs <= 0) return null;
    const now = input.now();
    if (!Number.isFinite(now.getTime())) return null;
    const identity = await input.readIdentity(scope);
    if (!identity || identity.organizationId !== scope.organizationId || identity.siteId !== scope.siteId ||
        !identity.name.trim() || !identity.domain.trim()) return null;
    const sources = await input.readSources(scope, now, input.maxAgeMs);
    if (!sources || !sources.every(s => s && !!s.source.trim())) return null;
    const readiness = await assessStoredCustomerReadiness({
      scope, readAttestation: input.readAttestation, readProof: input.readProof,
      trustedAuthorities: input.trustedAuthorities, now, maxAgeMs: input.maxAgeMs,
      sourceStatuses: sources,
    });
    // Unverified cannot be promoted to even an incomplete capability response.
    if (readiness.state === "unverified") return null;
    return {
      ...scope, name: identity.name, domain: identity.domain,
      setupComplete: readiness.state !== "setup_required",
      analysisComplete: readiness.state === "site_operational" || readiness.state === "site_degraded",
      sources: sources.map(s => ({ name: s.source, status: s.status, observedAt: s.observedAt })),
      metrics: [],
    };
  };
}

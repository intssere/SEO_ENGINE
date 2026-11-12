import { loadCustomerSiteScope, type CustomerGrantReader } from "./customer-site-scope-loader.js";
import { assessStoredCustomerReadiness } from "./customer-stored-readiness.js";
import type { ReadinessAttestationRecord } from "./customer-attestation-trust.js";
import type { ScopedProofReader } from "./customer-stored-attestation-verifier.js";

/**
 * Offline-only integration of authenticated membership and proof-backed
 * readiness. No runtime route, DB connection or production mutation.
 */
export async function loadAuthorizedCustomerReadiness(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  readGrants: CustomerGrantReader;
  readAttestation: (scope: { organizationId: string; siteId: string }, kind: "setup" | "initial_analysis") => Promise<ReadinessAttestationRecord | null>;
  readProof: ScopedProofReader;
  trustedAuthorities: readonly string[];
  now: Date;
  maxAgeMs: number;
  sourceStatuses: readonly { status: "available" | "stale" | "unavailable" | "unknown"; observedAt: string | null }[];
}) {
  const scope = await loadCustomerSiteScope(input);
  if (!scope.ok) return scope;
  const readiness = await assessStoredCustomerReadiness({
    scope: { organizationId: scope.organizationId, siteId: scope.siteId },
    readAttestation: input.readAttestation, readProof: input.readProof,
    trustedAuthorities: input.trustedAuthorities, now: input.now,
    maxAgeMs: input.maxAgeMs, sourceStatuses: input.sourceStatuses,
  });
  return { ok: true as const, organizationId: scope.organizationId, siteId: scope.siteId, readiness };
}

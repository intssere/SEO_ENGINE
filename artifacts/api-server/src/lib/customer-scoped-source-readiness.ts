import { loadCustomerSiteScope, type CustomerGrantReader } from "./customer-site-scope-loader.js";
import { assessStoredCustomerReadiness } from "./customer-stored-readiness.js";
import type { ReadinessAttestationRecord } from "./customer-attestation-trust.js";
import type { ScopedProofReader } from "./customer-stored-attestation-verifier.js";

type SourceStatus = { status: "available" | "stale" | "unavailable" | "unknown"; observedAt: string | null };
type ScopedSourceReader = (scope: { organizationId: string; siteId: string }) => Promise<readonly SourceStatus[]>;

/**
 * Safer runtime-candidate boundary than caller-supplied sourceStatuses:
 * source availability is always fetched by a server-owned reader AFTER
 * authenticated site authorization. No route or database is activated.
 */
export async function loadCustomerReadinessFromScopedSources(input: {
  principalSubject: string | null;
  requestedSiteId: string | null;
  readGrants: CustomerGrantReader;
  readSources: ScopedSourceReader;
  readAttestation: (scope: { organizationId: string; siteId: string }, kind: "setup" | "initial_analysis") => Promise<ReadinessAttestationRecord | null>;
  readProof: ScopedProofReader;
  trustedAuthorities: readonly string[];
  now: Date;
  maxAgeMs: number;
}) {
  const scope = await loadCustomerSiteScope(input);
  if (!scope.ok) return scope;
  const site = { organizationId: scope.organizationId, siteId: scope.siteId };
  let sourceStatuses: readonly SourceStatus[];
  try {
    sourceStatuses = await input.readSources(site);
    if (!Array.isArray(sourceStatuses) || !sourceStatuses.every(source =>
      source && ["available", "stale", "unavailable", "unknown"].includes(source.status) &&
      (source.observedAt === null || typeof source.observedAt === "string"))) {
      return { ok: false as const, reason: "source_evidence_unavailable" as const };
    }
  } catch {
    return { ok: false as const, reason: "source_evidence_unavailable" as const };
  }
  const readiness = await assessStoredCustomerReadiness({
    scope: site, readAttestation: input.readAttestation, readProof: input.readProof,
    trustedAuthorities: input.trustedAuthorities, now: input.now,
    maxAgeMs: input.maxAgeMs, sourceStatuses,
  });
  return { ok: true as const, ...site, readiness };
}

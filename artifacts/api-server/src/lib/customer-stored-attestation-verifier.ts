import { verifyReadinessAttestation, type ReadinessAttestationRecord } from "./customer-attestation-trust.js";

/**
 * Joins a server-read attestation with independently verified canonical evidence.
 * Caller must first authorize the subject's organization/site membership.
 * Reader failures and proof mismatch fail closed. No runtime route is registered.
 */
export type ScopedProofReader = (
  scope: { organizationId: string; siteId: string }, evidenceId: string,
) => Promise<{ id: string; source: string; observedAt: string } | null>;

export async function verifyStoredCustomerAttestation(input: {
  scope: { organizationId: string; siteId: string };
  attestation: ReadinessAttestationRecord | null;
  readProof: ScopedProofReader;
  trustedAuthorities: readonly string[];
  now: Date;
  maxAgeMs: number;
}) {
  const a = input.attestation;
  if (!a || a.organizationId !== input.scope.organizationId || a.siteId !== input.scope.siteId ||
      !a.evidenceId.trim() || !a.authority.trim() || !input.trustedAuthorities.includes(a.authority)) {
    return { ok: false as const, reason: "attestation_precheck_failed" as const };
  }
  // Reject invalid or expired attestations before accessing canonical evidence.
  // This avoids unnecessary proof reads for records that cannot certify readiness.
  const verifiedAt = Date.parse(a.verifiedAt);
  const nowAt = input.now.getTime();
  if (!Number.isFinite(verifiedAt) || !Number.isFinite(nowAt) ||
      !Number.isFinite(input.maxAgeMs) || input.maxAgeMs <= 0 ||
      verifiedAt > nowAt || nowAt - verifiedAt > input.maxAgeMs) {
    return { ok: false as const, reason: "attestation_freshness_invalid" as const };
  }
  if (typeof a.complete !== "boolean") {
    return { ok: false as const, reason: "attestation_completion_invalid" as const };
  }
  let proof: Awaited<ReturnType<ScopedProofReader>>;
  try {
    proof = await input.readProof(input.scope, a.evidenceId);
  } catch {
    return { ok: false as const, reason: "attestation_proof_unavailable" as const };
  }
  if (!proof || proof.id !== a.evidenceId || !proof.source.trim() ||
      !Number.isFinite(Date.parse(proof.observedAt))) {
    return { ok: false as const, reason: "attestation_proof_unverified" as const };
  }
  // Proof must exist before certification and be recent enough at the time
  // the attestation was issued. Otherwise stale or future-created evidence
  // could retroactively certify completion.
  const proofAt = Date.parse(proof.observedAt);
  const attestedAt = Date.parse(a.verifiedAt);
  if (!Number.isFinite(attestedAt) || !Number.isFinite(proofAt) ||
      !Number.isFinite(input.maxAgeMs) || input.maxAgeMs <= 0 ||
      proofAt > attestedAt || attestedAt - proofAt > input.maxAgeMs) {
    return { ok: false as const, reason: "attestation_proof_temporal_invalid" as const };
  }
  return verifyReadinessAttestation({
    scope: input.scope,
    attestation: a,
    trustedAuthorities: input.trustedAuthorities,
    verifiedEvidenceIds: [proof.id],
    now: input.now,
    maxAgeMs: input.maxAgeMs,
  });
}

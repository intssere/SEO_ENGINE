/**
 * Candidate attestation trust gate. Does not grant database, route or provider
 * authority. Issuers and proof references must come from a reviewed server-side
 * trust configuration and a verified evidence store, never the client request.
 */
export type ReadinessAttestationRecord = {
  organizationId: string;
  siteId: string;
  authority: string;
  evidenceId: string;
  verifiedAt: string;
  complete: boolean;
};
export function verifyReadinessAttestation(input: {
  scope: { organizationId: string; siteId: string };
  attestation: ReadinessAttestationRecord | null;
  trustedAuthorities: readonly string[];
  verifiedEvidenceIds: readonly string[];
  now: Date;
  maxAgeMs: number;
}): { ok: true; complete: boolean; verifiedAt: string; authority: string } | { ok: false; reason: string } {
  const a = input.attestation;
  if (!a || a.organizationId !== input.scope.organizationId || a.siteId !== input.scope.siteId)
    return { ok: false, reason: "attestation_scope_invalid" };
  if (!a.authority.trim() || !input.trustedAuthorities.includes(a.authority))
    return { ok: false, reason: "attestation_authority_untrusted" };
  if (!a.evidenceId.trim() || !input.verifiedEvidenceIds.includes(a.evidenceId))
    return { ok: false, reason: "attestation_evidence_unverified" };
  const at = Date.parse(a.verifiedAt);
  if (!Number.isFinite(at) || !Number.isFinite(input.now.getTime()) ||
      !Number.isFinite(input.maxAgeMs) || input.maxAgeMs <= 0 ||
      at > input.now.getTime() || input.now.getTime() - at > input.maxAgeMs)
    return { ok: false, reason: "attestation_freshness_invalid" };
  if (typeof a.complete !== "boolean") return { ok: false, reason: "attestation_completion_invalid" };
  return { ok: true, complete: a.complete, verifiedAt: a.verifiedAt, authority: a.authority };
}

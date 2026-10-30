/**
 * Conservative readiness classifier: observations alone never prove that
 * setup or an initial audit has completed. No synthetic metrics are emitted.
 * Only explicit authoritative completion attestations can promote a state.
 * Not connected to a production route or provider.
 */
export type CompletionAttestation = {
  siteId: string;
  organizationId: string;
  complete: boolean;
  verifiedAt: string;
  authority: string;
};
export type ReadinessAssessment =
  | { state: "setup_required" | "analysis_pending" | "site_degraded" | "site_operational"; reason: string }
  | { state: "unverified"; reason: string };

function validAttestation(
  value: CompletionAttestation | null,
  scope: { organizationId: string; siteId: string },
): value is CompletionAttestation {
  return !!value && value.organizationId === scope.organizationId && value.siteId === scope.siteId &&
    !!value.authority.trim() && Number.isFinite(Date.parse(value.verifiedAt));
}

export function assessCustomerReadiness(input: {
  scope: { organizationId: string; siteId: string };
  setup: CompletionAttestation | null;
  initialAnalysis: CompletionAttestation | null;
  sourceStatuses: readonly { status: "available" | "stale" | "unavailable" | "unknown"; observedAt: string | null }[];
}): ReadinessAssessment {
  if (!validAttestation(input.setup, input.scope)) return { state: "unverified", reason: "setup_attestation_unavailable" };
  if (!input.setup.complete) return { state: "setup_required", reason: "verified_setup_incomplete" };
  if (!validAttestation(input.initialAnalysis, input.scope)) return { state: "unverified", reason: "analysis_attestation_unavailable" };
  if (!input.initialAnalysis.complete) return { state: "analysis_pending", reason: "verified_analysis_incomplete" };
  const healthy = input.sourceStatuses.length > 0 && input.sourceStatuses.every(source =>
    source.status === "available" && !!source.observedAt && Number.isFinite(Date.parse(source.observedAt))
  );
  return healthy
    ? { state: "site_operational", reason: "verified_sources_available" }
    : { state: "site_degraded", reason: "source_readiness_not_verified" };
}

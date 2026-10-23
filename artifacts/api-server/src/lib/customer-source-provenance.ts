/**
 * Evidence provenance trust gate. Recent rows are not operational evidence
 * unless an explicitly trusted source and kind are configured server-side.
 * Neither HTTP input nor provider "connected" status may populate policies.
 */
export type TrustedSourcePolicy = { source: string; permittedKinds: readonly string[] };
export type EvidenceCandidate = {
  source: string; kind: string; observedAt: string;
  siteId: string; organizationId: string;
};
export function certifySourceEvidence(input: {
  scope: { siteId: string; organizationId: string };
  candidate: EvidenceCandidate;
  trustedPolicies: readonly TrustedSourcePolicy[];
  now: Date;
  maxAgeMs: number;
}): { status: "available" | "stale" | "unknown"; observedAt: string | null } {
  const c = input.candidate;
  if (c.siteId !== input.scope.siteId || c.organizationId !== input.scope.organizationId)
    return { status: "unknown", observedAt: null };
  const policies = input.trustedPolicies.filter(p => p.source === c.source && p.source.trim());
  if (policies.length !== 1 || !policies[0].permittedKinds.includes(c.kind))
    return { status: "unknown", observedAt: null };
  const observed = Date.parse(c.observedAt);
  const age = input.now.getTime() - observed;
  if (!Number.isFinite(observed) || !Number.isFinite(input.now.getTime()) ||
      !Number.isFinite(input.maxAgeMs) || input.maxAgeMs <= 0)
    return { status: "unknown", observedAt: null };
  if (age < 0 || age > input.maxAgeMs)
    return { status: "stale", observedAt: c.observedAt };
  return { status: "available", observedAt: c.observedAt };
}

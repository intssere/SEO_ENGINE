/**
 * C4-E1: offline A07 provenance claim-consistency preflight.
 * A self-consistent packet is NOT authenticated evidence or Stage 2B approval.
 */
import { createHash } from "node:crypto";
import { reviewC4E1A07CrossEvidence } from "./ugp-11-c4-e1-a07-cross-evidence-preflight.js";

type Obj = Record<string, unknown>;
const object = (x: unknown): x is Obj => x !== null && typeof x === "object" && !Array.isArray(x);
const candidates = ["native", "pg_boss"] as const;
const sha = /^[0-9a-f]{40}$/;
const digest = /^[0-9a-f]{64}$/;
const id = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const fields = ["candidate","testId","runId","sourceSha","runnerSha","traceDigest","observationDigest"];
function hasExactFields(x: Obj): boolean {
  return JSON.stringify(Object.keys(x).sort()) === JSON.stringify([...fields].sort());
}
export function digestA07Trace(trace: unknown): string {
  return createHash("sha256").update(JSON.stringify(trace)).digest("hex");
}
function reviewA07ProvenanceClaimsUnchecked(packet: unknown, traces: unknown, manifests: unknown) {
  const issues: string[] = [];
  const cross = reviewC4E1A07CrossEvidence(packet, traces);
  if (cross.status !== "STRUCTURALLY_CONSISTENT_UNVERIFIED") issues.push("cross_evidence_invalid", ...cross.issues);
  if (!Array.isArray(manifests) || manifests.length !== 2) issues.push("expected_two_manifests");
  const claims: unknown[] = Array.isArray(manifests) ? manifests : [];
  const runIds = new Set<string>();
  for (const candidate of candidates) {
    const matches = claims.filter(x => object(x) && x.candidate === candidate);
    if (matches.length !== 1) { issues.push("missing_or_duplicate_manifest_" + candidate); continue; }
    const claim = matches[0] as Obj;
    if (!hasExactFields(claim) || claim.testId !== "A07" ||
        typeof claim.runId !== "string" || !id.test(claim.runId) ||
        typeof claim.sourceSha !== "string" || !sha.test(claim.sourceSha) ||
        typeof claim.runnerSha !== "string" || !sha.test(claim.runnerSha) ||
        typeof claim.traceDigest !== "string" || !digest.test(claim.traceDigest) ||
        typeof claim.observationDigest !== "string" || !digest.test(claim.observationDigest)) {
      issues.push("invalid_manifest_" + candidate); continue;
    }
    if (runIds.has(claim.runId)) issues.push("reused_run_identity");
    runIds.add(claim.runId);
    const row = Array.isArray(packet) ? packet.find(x => object(x) && x.testId === "A07" && x.candidate === candidate) : null;
    const trace = Array.isArray(traces) ? traces.find(x => object(x) && x.testId === "A07" && x.candidate === candidate) : null;
    if (!object(row) || !object(trace)) { issues.push("missing_row_or_trace_" + candidate); continue; }
    if (claim.sourceSha !== row.sourceSha || claim.runnerSha !== row.runnerSha ||
        claim.observationDigest !== row.observationDigest) issues.push("row_manifest_mismatch_" + candidate);
    // Untrusted malformed input must be rejected, not abort the review. JSON
    // serialization can throw for cyclic graphs, BigInt or custom toJSON.
    let observedDigest: string | null = null;
    try {
      observedDigest = digestA07Trace(trace);
    } catch {
      issues.push("unhashable_trace_" + candidate);
    }
    if (observedDigest !== null && claim.traceDigest !== observedDigest)
      issues.push("trace_digest_mismatch_" + candidate);
  }
  if (claims.some(x => !object(x) || !candidates.includes(x.candidate as "native" | "pg_boss")))
    issues.push("unknown_manifest_candidate");
  return Object.freeze({
    status: issues.length ? "INCOMPLETE_OR_UNSAFE" as const : "SELF_CONSISTENT_UNAUTHENTICATED" as const,
    issues: Object.freeze(issues),
    stage2bCertified: false as const,
    executionAuthorized: false as const,
    operationalAuthority: false as const
  });
}

/**
 * Treat unexpected exceptions from untrusted object access, Proxy traps, and
 * serialization as unsafe evidence. This does not make arbitrary objects safe:
 * consume strictly parsed JSON at the future ingress boundary.
 */
export function reviewA07ProvenanceClaims(packet: unknown, traces: unknown, manifests: unknown) {
  try {
    return reviewA07ProvenanceClaimsUnchecked(packet, traces, manifests);
  } catch {
    return Object.freeze({
      status: "INCOMPLETE_OR_UNSAFE" as const,
      issues: Object.freeze(["untrusted_evidence_inspection_failed"]),
      stage2bCertified: false as const,
      executionAuthorized: false as const,
      operationalAuthority: false as const
    });
  }
}

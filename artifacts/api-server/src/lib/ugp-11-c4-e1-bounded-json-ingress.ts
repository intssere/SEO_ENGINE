/**
 * UGP-11.C4-E1: offline-only bounded JSON ingress for A07 evidence claims.
 * Accepts serialized JSON strings, never arbitrary caller-owned objects.
 * This checks only self-consistency; no observer authentication or execution.
 */
import { reviewA07ProvenanceClaims } from "./ugp-11-c4-e1-a07-provenance-preflight.js";

export const MAX_A07_EVIDENCE_JSON_BYTES = 262144;
const utf8 = new TextEncoder();
const fail = (issue: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const,
  issues: Object.freeze([issue]),
  stage2bCertified: false as const,
  executionAuthorized: false as const,
  operationalAuthority: false as const
});

function decodeEvidenceJSON(input: unknown): unknown {
  if (typeof input !== "string") throw new Error("non_string_json_input");
  const bytes = utf8.encode(input).length;
  if (bytes === 0 || bytes > MAX_A07_EVIDENCE_JSON_BYTES) throw new Error("json_input_size_out_of_bounds");
  return JSON.parse(input) as unknown;
}

/**
 * Bounded decoding of three separate claims. No package installs, IO, DB,
 * network access, runtime transport operations or system clock reads.
 * Does NOT prevent duplicate JSON object keys; future signed canonical
 * evidence must use a stricter parser/canonicalization protocol.
 */
export function reviewA07SerializedEvidence(packetJSON: unknown, tracesJSON: unknown, manifestsJSON: unknown) {
  try {
    const packet = decodeEvidenceJSON(packetJSON);
    const traces = decodeEvidenceJSON(tracesJSON);
    const manifests = decodeEvidenceJSON(manifestsJSON);
    return reviewA07ProvenanceClaims(packet, traces, manifests);
  } catch {
    return fail("invalid_or_oversized_serialized_evidence");
  }
}

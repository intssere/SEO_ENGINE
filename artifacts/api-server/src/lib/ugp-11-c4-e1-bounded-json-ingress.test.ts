import assert from "node:assert/strict";
import test from "node:test";
import { C4_E1_CASES } from "./ugp-11-c4-e1-offline-evidence-structural-validator.js";
import { digestA07Trace } from "./ugp-11-c4-e1-a07-provenance-preflight.js";
import { MAX_A07_EVIDENCE_JSON_BYTES, reviewA07SerializedEvidence } from "./ugp-11-c4-e1-bounded-json-ingress.js";

const sha = (s: string) => s.repeat(40);
const hash = (s: string) => s.repeat(64);
function fixtures() {
  const packet = C4_E1_CASES.flatMap(testId => (["native", "pg_boss"] as const).map(candidate => ({
    testId, candidate, outcome: "PASS", sourceSha: sha("a"), runnerSha: sha("b"),
    fixtureSeed: "fixture-" + testId, workFingerprint: hash("c"), observationDigest: hash("d"),
    isolatedTargetId: "disposable-only", externalEffectAttempts: 0, providerNetworkAttempts: 0
  })));
  const traces = (["native", "pg_boss"] as const).map(candidate => ({
    testId: "A07", candidate, outcome: "manual_intervention_required",
    mockEvents: [
      { sequence: 0, kind: "mock_attempt", syntheticEffectId: "effect-1" },
      { sequence: 1, kind: "mock_may_have_started", syntheticEffectId: "effect-1" },
      { sequence: 2, kind: "mock_replay_blocked", syntheticEffectId: "effect-1" }
    ],
    externalProviderCalls: 0, realExternalEffectAttempts: 0
  }));
  const manifests = traces.map((trace, index) => ({
    candidate: trace.candidate, testId: "A07", runId: "run-" + (index + 1),
    sourceSha: sha("a"), runnerSha: sha("b"),
    observationDigest: hash("d"), traceDigest: digestA07Trace(trace)
  }));
  return [JSON.stringify(packet), JSON.stringify(traces), JSON.stringify(manifests)] as const;
}
test("valid serialized claims remain unauthenticated and grant no authority", () => {
  const result = reviewA07SerializedEvidence(...fixtures());
  assert.equal(result.status, "SELF_CONSISTENT_UNAUTHENTICATED");
  assert.equal(result.stage2bCertified, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.operationalAuthority, false);
});
test("invalid, unsupported, truncated and oversized input always denies", () => {
  const good = fixtures();
  for (const bad of [null, undefined, {}, [], false, "", "{", "null", "true", "[]",
    " ".repeat(MAX_A07_EVIDENCE_JSON_BYTES + 1)]) {
    for (const index of [0, 1, 2]) {
      const inputs: unknown[] = [...good];
      inputs[index] = bad;
      const result = reviewA07SerializedEvidence(inputs[0], inputs[1], inputs[2]);
      assert.equal(result.status, "INCOMPLETE_OR_UNSAFE");
      assert.equal(result.stage2bCertified, false);
      assert.equal(result.executionAuthorized, false);
      assert.equal(result.operationalAuthority, false);
    }
  }
});
test("byte count, rather than JS character count, bounds UTF-8 input", () => {
  const [packet, traces] = fixtures();
  const veryLong = JSON.stringify({pad: "😀".repeat(70000)});
  assert.ok(veryLong.length < MAX_A07_EVIDENCE_JSON_BYTES);
  assert.ok(new TextEncoder().encode(veryLong).length > MAX_A07_EVIDENCE_JSON_BYTES);
  const result = reviewA07SerializedEvidence(packet, traces, veryLong);
  assert.equal(result.status, "INCOMPLETE_OR_UNSAFE");
  assert.ok(result.issues.includes("invalid_or_oversized_serialized_evidence"));
});
test("a declared PASS cannot override a mismatched serialized digest", () => {
  const [packet, traces, manifest] = fixtures();
  const claims = JSON.parse(manifest) as Record<string, unknown>[];
  claims[0]!.traceDigest = hash("e");
  assert.equal(reviewA07SerializedEvidence(packet, traces, JSON.stringify(claims)).status, "INCOMPLETE_OR_UNSAFE");
});


test("enormous ASCII evidence is rejected before UTF-8 encoding", () => {
  const [packet, traces] = fixtures();
  const hugeInput = "x".repeat(MAX_A07_EVIDENCE_JSON_BYTES * 8);
  const result = reviewA07SerializedEvidence(packet, traces, hugeInput);
  assert.equal(result.status, "INCOMPLETE_OR_UNSAFE");
  assert.ok(result.issues.includes("invalid_or_oversized_serialized_evidence"));
  assert.equal(result.stage2bCertified, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.operationalAuthority, false);
});

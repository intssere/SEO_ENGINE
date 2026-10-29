import assert from "node:assert/strict";
import test from "node:test";
import { C4_E1_CASES } from "./ugp-11-c4-e1-offline-evidence-structural-validator.js";
import { digestA07Trace, reviewA07ProvenanceClaims } from "./ugp-11-c4-e1-a07-provenance-preflight.js";

const sha = (x: string) => x.repeat(40);
const hash = (x: string) => x.repeat(64);
function fixture() {
  const packet = C4_E1_CASES.flatMap(testId => (["native","pg_boss"] as const).map(candidate => ({
    testId, candidate, outcome: "PASS", sourceSha: sha("a"), runnerSha: sha("b"),
    fixtureSeed: "seed-" + testId, workFingerprint: hash("c"), observationDigest: hash("d"),
    isolatedTargetId: "fixture-disposable", externalEffectAttempts: 0, providerNetworkAttempts: 0
  })));
  const traces = (["native","pg_boss"] as const).map(candidate => ({
    testId: "A07", candidate, outcome: "manual_intervention_required",
    mockEvents: [
      {sequence: 0, kind: "mock_attempt", syntheticEffectId: "effect-1"},
      {sequence: 1, kind: "mock_may_have_started", syntheticEffectId: "effect-1"},
      {sequence: 2, kind: "mock_replay_blocked", syntheticEffectId: "effect-1"}
    ],
    externalProviderCalls: 0, realExternalEffectAttempts: 0
  }));
  const manifests = traces.map((trace, index) => ({
    testId: "A07", candidate: trace.candidate, runId: "run-" + (index + 1),
    sourceSha: sha("a"), runnerSha: sha("b"),
    traceDigest: digestA07Trace(trace), observationDigest: hash("d")
  }));
  return { packet, traces, manifests };
}
test("consistent claims are never authenticated or authorized", () => {
  const x = fixture();
  const result = reviewA07ProvenanceClaims(x.packet, x.traces, x.manifests);
  assert.equal(result.status, "SELF_CONSISTENT_UNAUTHENTICATED");
  assert.deepEqual(result.issues, []);
  assert.equal(result.stage2bCertified, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.operationalAuthority, false);
});
test("mismatched source, trace digest and reused run identity fail closed", () => {
  for (const patch of [
    { sourceSha: sha("e") },
    { traceDigest: hash("f") },
    { runId: "run-2" },
    { observationDigest: hash("e") },
    { extra: true }
  ]) {
    const x = fixture();
    x.manifests[0] = { ...x.manifests[0]!, ...patch };
    assert.equal(reviewA07ProvenanceClaims(x.packet, x.traces, x.manifests).status, "INCOMPLETE_OR_UNSAFE");
  }
});
test("missing, duplicate, unknown or malformed manifest fails closed", () => {
  const x = fixture();
  for (const manifests of [
    null, [], [x.manifests[0]], [x.manifests[0], x.manifests[0]],
    [{...x.manifests[0], candidate: "unknown"}, x.manifests[1]],
    [{...x.manifests[0], sourceSha: "invalid"}, x.manifests[1]]
  ]) assert.equal(reviewA07ProvenanceClaims(x.packet, x.traces, manifests).status, "INCOMPLETE_OR_UNSAFE");
});
test("invalid cross-evidence cannot be rescued by valid manifests", () => {
  const x = fixture();
  x.packet[0] = { ...x.packet[0]!, outcome: "NOT_RUN" };
  assert.equal(reviewA07ProvenanceClaims(x.packet, x.traces, x.manifests).status, "INCOMPLETE_OR_UNSAFE");
});


test("unhashable hostile traces reject without raising and never confer authority", () => {
  const cases = [
    (trace: Record<string, unknown>) => { trace.self = trace; },
    (trace: Record<string, unknown>) => { trace.unexpected = BigInt(7); },
    (trace: Record<string, unknown>) => {
      trace.toJSON = () => { throw new Error("hostile_serializer"); };
    }
  ];
  for (const mutate of cases) {
    const x = fixture();
    mutate(x.traces[0] as unknown as Record<string, unknown>);
    const result = reviewA07ProvenanceClaims(x.packet, x.traces, x.manifests);
    assert.equal(result.status, "INCOMPLETE_OR_UNSAFE");
    assert.ok(result.issues.includes("unhashable_trace_native"));
    assert.equal(result.stage2bCertified, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.operationalAuthority, false);
  }
});

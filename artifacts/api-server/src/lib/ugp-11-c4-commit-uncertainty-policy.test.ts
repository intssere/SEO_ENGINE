import assert from "node:assert/strict";
import test from "node:test";
import { reconcileUncertainCommit, type CommitObservation } from "./ugp-11-c4-commit-uncertainty-policy.js";

const expected = { attemptId: "attempt-1", fingerprint: "a".repeat(64) };
test("C4 uncertain commit never confers retry or dispatch authority", () => {
  const cases: Array<[CommitObservation, "committed" | "rolled_back" | "manual_intervention_required"]> = [
    [{ kind: "durable_attempt", ...expected, outcome: "committed", independentlyVerified: true }, "committed"],
    [{ kind: "durable_attempt", ...expected, outcome: "rolled_back", independentlyVerified: true }, "rolled_back"],
    [{ kind: "durable_attempt", ...expected, outcome: "committed", independentlyVerified: false }, "manual_intervention_required"],
    [{ kind: "durable_attempt", attemptId: "other", fingerprint: expected.fingerprint, outcome: "rolled_back", independentlyVerified: true }, "manual_intervention_required"],
    [{ kind: "durable_attempt", attemptId: expected.attemptId, fingerprint: "b".repeat(64), outcome: "committed", independentlyVerified: true }, "manual_intervention_required"],
    [{ kind: "missing" }, "manual_intervention_required"],
    [{ kind: "conflicting" }, "manual_intervention_required"],
    [{ kind: "unavailable" }, "manual_intervention_required"],
    [{ kind: "writer_ack_only" }, "manual_intervention_required"],
  ];
  for (const [evidence, outcome] of cases) {
    const actual = reconcileUncertainCommit(expected, evidence);
    assert.equal(actual.outcome, outcome);
    assert.equal(actual.automaticRetryAllowed, false);
    assert.equal(actual.providerDispatchAllowed, false);
    assert.equal(actual.productionAuthority, false);
  }
  assert.equal(reconcileUncertainCommit({ ...expected, fingerprint: "bad" }, cases[0][0]).outcome, "manual_intervention_required");
});

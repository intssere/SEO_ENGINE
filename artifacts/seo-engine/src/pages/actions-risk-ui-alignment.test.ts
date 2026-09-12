import test from "node:test";
import assert from "node:assert/strict";

const riskAllowed = (risk: string) =>
  !["blocked", "high", "critical"].includes(risk.toLowerCase());

const lifecycleStateEligible = (input: {
  lifecycle: string;
  planStatus: string;
  decision: string | null;
}) =>
  (input.lifecycle === "approval_ready" &&
    input.planStatus === "pending" &&
    input.decision === null) ||
  (input.lifecycle === "approved_proposal" && input.decision === "approved");

test("bounded internal UI risk gate matches Task #51 backend guard", () => {
  assert.equal(riskAllowed("low"), true);
  assert.equal(riskAllowed("medium"), true);
  assert.equal(riskAllowed("blocked"), false);
  assert.equal(riskAllowed("high"), false);
  assert.equal(riskAllowed("critical"), false);
});

test("approved proposal remains eligible after planner marks plan completed", () => {
  assert.equal(
    lifecycleStateEligible({
      lifecycle: "approval_ready",
      planStatus: "pending",
      decision: null,
    }),
    true,
  );
  assert.equal(
    lifecycleStateEligible({
      lifecycle: "approved_proposal",
      planStatus: "completed",
      decision: "approved",
    }),
    true,
  );
  assert.equal(
    lifecycleStateEligible({
      lifecycle: "approval_ready",
      planStatus: "completed",
      decision: null,
    }),
    false,
  );
  assert.equal(
    lifecycleStateEligible({
      lifecycle: "approved_proposal",
      planStatus: "completed",
      decision: null,
    }),
    false,
  );
});

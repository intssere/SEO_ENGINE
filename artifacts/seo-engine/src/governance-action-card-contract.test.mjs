import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "pages", "governance.tsx"), "utf8");
const component = readFileSync(join(here, "components", "governance-action-card.tsx"), "utf8");
const model = readFileSync(join(here, "lib", "governance-action-card-model.ts"), "utf8");
const workspace = readFileSync(join(here, "lib", "governance-workspace-model.ts"), "utf8");

test("P8.2 is projected only inside the existing read-only governance surface", () => {
  assert.match(page, /buildGovernanceActionCardModel/);
  assert.match(page, /Action inspection cards/);
  assert.match(page, /Verification and rollback execution state are never inferred/);
  assert.match(component, /READ-ONLY/);
  assert.doesNotMatch(
    [page, component, model].join("\n"),
    /useDecideApproval|useAuthorizeInternalAction|useRenewAuthorizationWindow|useRenewExecutableActionAuthorization|startPilotRun/,
  );
  assert.doesNotMatch([page, component, model].join("\n"), /\.mutate\s*\(|mutation\s*:/);
});

test("P8.2 preserves verification unavailability instead of inferring from lifecycle", () => {
  assert.match(model, /detailAvailability: "unavailable"/);
  assert.match(model, /verificationInferredFromLifecycle: false/);
  assert.match(model, /Recorded lifecycle is descriptive only and is not verification proof/);
  assert.match(component, /VERIFICATION DETAIL UNAVAILABLE/);
  assert.match(component, /Recorded lifecycle/);
});

test("P8.2 treats rollback as a plan only and exposes no rollback control", () => {
  assert.match(model, /rollbackPlanIsRollbackState: false/);
  assert.match(model, /statusAvailability: "unavailable"/);
  assert.match(model, /rollback field is a plan only/);
  assert.match(component, /ROLLBACK PLAN ONLY/);
  assert.match(component, /ROLLBACK STATUS UNAVAILABLE/);
  assert.doesNotMatch(component, /<button|onClick=|executeRollback|rollback\.mutate/);
});

test("P8.2 keeps evidence, risk and preview fields source-bound", () => {
  for (const field of [
    "quality_score",
    "evidence_sufficient",
    "rationale",
    "expected_benefit",
    "rollback",
    "bounded_pilot",
    "whole_site_coverage",
  ]) assert.ok(workspace.includes(field), "missing governance source field: " + field);
  assert.match(component, /Declared count/);
  assert.match(component, /Evidence sufficient/);
  assert.match(component, /Evaluator/);
  assert.match(component, /Plan control/);
  assert.match(component, /Before/);
  assert.match(component, /Proposed/);
  assert.match(component, /Preview does not imply recommendation, approval, apply authorization, or execution/);
});

test("P8.2 action card model exposes explicit non-authority semantics", () => {
  assert.match(model, /readOnly: true/);
  assert.match(model, /approvalStateAuthorizesExecution: false/);
  assert.match(model, /executionFlagsAreControls: false/);
  assert.match(model, /allowsExecution: false/);
  assert.match(model, /allowsRollback: false/);
  assert.match(model, /orderingImpliesPriority: false/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "pages", "governance.tsx"), "utf8");
const model = readFileSync(join(here, "lib", "governance-workspace-model.ts"), "utf8");
const app = readFileSync(join(here, "App.tsx"), "utf8");
const navigation = JSON.parse(readFileSync(join(here, "navigation.json"), "utf8"));

test("P8.1 uses only existing read-only opportunity/action/approval queries", () => {
  assert.match(page, /useListOpportunities/);
  assert.match(page, /useListActions/);
  assert.match(page, /useListApprovals/);
  assert.doesNotMatch(page, /useDecideApproval|useAuthorizeInternalAction|useRenewAuthorizationWindow|useRenewExecutableActionAuthorization/);
  assert.doesNotMatch(page, /mutate\s*\(|mutation\s*:/);
});

test("P8.1 exposes governance route before Actions and Approvals", () => {
  assert.match(app, /<Route path="\/governance" component=\{GovernancePage\}/);
  const execute = navigation.find((group) => group.domain === "Execute");
  assert.deepEqual(execute.items.slice(0, 3).map((item) => item.path), [
    "/governance", "/actions", "/approvals",
  ]);
});

test("P8.1 visibly preserves approval and execution separation", () => {
  assert.match(page, /READ-ONLY GOVERNANCE/);
  assert.match(page, /NO APPROVAL GRANT/);
  assert.match(page, /NO EXECUTION/);
  assert.match(page, /Approved review state does not authorize execution/);
  assert.match(page, /persisted source fields shown for inspection only/);
});

test("P8.1 model fails closed on duplicate IDs, dangling lineage, and source conflict", () => {
  assert.match(model, /duplicate_governance_opportunity_id/);
  assert.match(model, /duplicate_governance_proposal_id/);
  assert.match(model, /duplicate_governance_approval_id/);
  assert.match(model, /governance_missing_opportunity/);
  assert.match(model, /governance_control_lineage_conflict/);
  assert.match(model, /governance_projected_field_conflict/);
});

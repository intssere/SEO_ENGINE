import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");

const component = read("components/decision-card.tsx");
const model = read("lib/decision-card-model.ts");
const opportunities = read("pages/opportunities.tsx");
const proposalTable = read("components/proposal-table.tsx");
const approvals = read("pages/approvals.tsx");
const governance = read("components/governance-action-card.tsx");

test("UGP-2.3 standard card grammar exposes every customer decision dimension", () => {
  for (const label of [
    "Impact",
    "Risk",
    "Current state",
    "Recommended state",
    "Why",
    "Review / apply",
    "Measurement",
  ]) {
    assert.ok(component.includes(label), label);
  }
  assert.ok(proposalTable.includes("Preview available"));
  assert.ok(component.includes("Preview after proposal"));
});

test("UGP-2.3 opportunity projection does not invent absent state", () => {
  assert.match(model, /Expected impact is not exposed by this opportunity/);
  assert.match(model, /currentState: null/);
  assert.match(component, /Measurement unavailable/);
});

test("UGP-2.3 proposal table keeps review separate from execution and measurement", () => {
  assert.match(proposalTable, /Approved for review flow/);
  assert.match(proposalTable, /Review state does not authorize execution/);
  assert.match(proposalTable, /Governed execution path still applies/);
  assert.match(proposalTable, /Measurement unavailable/);
});

test("UGP-2.3 Opportunities uses decision cards while history remains tabular", () => {
  assert.match(opportunities, /buildOpportunityDecisionCards/);
  assert.match(opportunities, /<DecisionCard/);
  assert.match(opportunities, /<OperationalTable[\s\S]*data=\{data\.history\}/);
  assert.match(opportunities, /triggerLabel="See evidence"/);
});

test("UGP-2.3 Actions proposal table uses the same grammar", () => {
  for (const header of [
    "Problem / impact",
    "Current → recommended",
    "Risk",
    "Why",
    "Review / measurement",
  ]) {
    assert.ok(proposalTable.includes(header), header);
  }
  assert.match(proposalTable, /triggerLabel="See evidence"/);
});

test("UGP-2.3 proposal review labels align without changing approval controls", () => {
  assert.match(approvals, /Current state/);
  assert.match(approvals, /Generated recommendation/);
  assert.match(approvals, /Recommended state/);
  assert.match(approvals, /Problem \/ why \/ impact/);
  assert.match(approvals, /Risk \/ safeguards/);
  assert.match(approvals, /Measurement:<\/b> unavailable in this review record/);
  assert.match(approvals, /useDecideApproval/);
  assert.match(approvals, /useEditApprovalDraft/);
});

test("UGP-2.3 does not weaken the advanced governance inspection card", () => {
  assert.match(governance, /VERIFICATION DETAIL UNAVAILABLE/);
  assert.match(governance, /ROLLBACK PLAN ONLY/);
  assert.match(governance, /Preview does not imply recommendation, approval, apply authorization, or execution/);
});

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
    "Current state",
    "Recommended state",
    "Why",
    "Review / apply",
    "Measurement",
  ]) {
    assert.ok(component.includes(label), label);
  }
  assert.ok(component.includes("PREVIEW AVAILABLE"));
  assert.ok(component.includes("PREVIEW AFTER PROPOSAL"));
});

test("UGP-2.3 opportunity projection does not invent absent state", () => {
  assert.match(model, /Expected impact is not exposed by this opportunity record/);
  assert.match(model, /currentState: null/);
  assert.match(model, /previewAvailable: false/);
  assert.match(model, /Measurement unavailable/);
  assert.match(model, /does not expose a verified outcome measurement/);
});

test("UGP-2.3 proposal projection keeps review separate from execution and measurement", () => {
  assert.match(model, /Approved for review flow/);
  assert.match(model, /does not itself authorize execution/);
  assert.match(model, /execution still depends on the governed execution path/);
  assert.match(model, /measurement: MEASUREMENT_UNAVAILABLE/);
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
  assert.match(proposalTable, /buildProposalDecisionCard/);
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

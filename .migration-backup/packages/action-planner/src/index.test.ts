import test from "node:test";
import assert from "node:assert/strict";
import { buildActionPlan, classifyAction, toActionInserts, toActionPlanInsert } from "./index.js";

test("classifies low-risk reversible metadata changes as auto without executing", () => {
  const result = classifyAction({
    actionType: "metadata.title",
    target: { pageId: "p1" },
    proposedChange: { title: "New title" },
  }, { publicSiteWritesEnabled: false, reversible: true, policyConfidenceTier: "A" });
  assert.equal(result.disposition, "auto");
  assert.ok(result.reasons.some((reason) => reason.includes("writes are disabled")));
});

test("requires approval for URL, redirect, destructive, major content and architecture changes", () => {
  for (const actionType of ["url.change", "redirect.create", "page.delete", "content.major_rewrite", "architecture.change"] as const) {
    const result = classifyAction({ actionType, target: {}, proposedChange: {} }, { policyConfidenceTier: "A" });
    assert.equal(result.disposition, "approval");
  }
});

test("blocks unknown actions and low-confidence policy-driven execution", () => {
  assert.equal(classifyAction({ actionType: "unknown", target: {}, proposedChange: {} }).disposition, "blocked");
  assert.equal(classifyAction({ actionType: "metadata.description", target: {}, proposedChange: {} }, { policyConfidenceTier: "F" }).disposition, "blocked");
});

test("algorithm update mode freezes non-low-risk autonomous actions", () => {
  const result = classifyAction({
    actionType: "internal_link.add",
    target: { from: "/a", to: "/b" },
    proposedChange: { anchor: "example" },
  }, { algorithmUpdateMode: true, policyConfidenceTier: "A" });
  assert.equal(result.disposition, "approval");
});

test("plan inherits the strictest action disposition and remains pending", () => {
  const plan = buildActionPlan({
    siteId: "site-1",
    opportunityId: "opp-1",
    pageId: "page-1",
    type: "ranking.striking_distance",
    score: 80,
    confidence: 0.9,
    title: "Improve page",
  }, [
    { actionType: "metadata.title", target: { pageId: "page-1" }, proposedChange: { title: "Better title" } },
    { actionType: "content.major_rewrite", target: { pageId: "page-1" }, proposedChange: { body: "replacement" } },
  ], { publicSiteWritesEnabled: false, policyConfidenceTier: "A" });

  assert.equal(plan.riskLevel, "approval");
  const planInsert = toActionPlanInsert(plan);
  const actionInserts = toActionInserts(plan);
  assert.equal(planInsert.status, "pending");
  assert.equal(actionInserts.length, 2);
  assert.ok(actionInserts.every((action) => action.status === "pending"));
});

test("plan and action dedupe keys are deterministic", () => {
  const opportunity = { siteId: "s", opportunityId: "o", type: "technical.metadata", score: 55, confidence: 0.9, title: "Fix metadata" };
  const actions = [{ actionType: "metadata.description" as const, target: { url: "/a" }, proposedChange: { description: "x" } }];
  const a = buildActionPlan(opportunity, actions, { publicSiteWritesEnabled: false });
  const b = buildActionPlan(opportunity, actions, { publicSiteWritesEnabled: false });
  assert.equal(a.dedupeKey, b.dedupeKey);
  assert.equal(a.actions[0]?.dedupeKey, b.actions[0]?.dedupeKey);
});

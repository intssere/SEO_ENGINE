import test from "node:test";
import assert from "node:assert/strict";
import { contextualGuideForLocation } from "./contextual-onboarding-model";

test("contextual onboarding resolves deterministic customer guides", () => {
  assert.equal(contextualGuideForLocation("/").id, "home");
  assert.equal(contextualGuideForLocation("/opportunities").id, "opportunities");
  assert.equal(contextualGuideForLocation("/content").id, "content");
  assert.equal(contextualGuideForLocation("/settings").id, "settings");
  assert.equal(contextualGuideForLocation("/settings/add-website").id, "website-wizard");
});

test("nested customer detail routes use the generic detail guide", () => {
  for (const path of [
    "/content/research",
    "/site-audit/technical",
    "/authority/backlinks",
    "/automation/safety",
    "/performance/impact",
    "/settings/connections",
  ]) {
    assert.equal(contextualGuideForLocation(path).id, "detail-view", path);
  }
});

test("all steps have stable customer copy and selectors", () => {
  const locations = [
    "/",
    "/opportunities",
    "/content",
    "/site-audit",
    "/authority",
    "/automation",
    "/performance",
    "/settings",
    "/settings/add-website",
    "/unknown",
  ];
  for (const location of locations) {
    const guide = contextualGuideForLocation(location);
    assert.ok(guide.steps.length >= 2, location);
    for (const step of guide.steps) {
      assert.ok(step.id);
      assert.ok(step.title);
      assert.ok(step.body);
      assert.ok(step.selector);
      assert.doesNotMatch(step.title + step.body, /Task\s*#|UGP-[0-9]|P[0-9]+\.[0-9]+/);
    }
  }
});

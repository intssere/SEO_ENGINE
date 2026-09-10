import test from "node:test";
import assert from "node:assert/strict";
import {
  issueControlledOptimizationPermit,
  validateControlledOptimizationRequest,
  verificationOutcome,
  type ControlledOptimizationRequest,
} from "./index.js";

const request: ControlledOptimizationRequest = {
  siteId: "site-1",
  siteDomain: "diamondshelf.us",
  opportunityId: "opp-1",
  actionPlanId: "plan-1",
  actionId: "action-1",
  actionType: "metadata.title",
  target: { productId: "gid://shopify/Product/123" },
  beforeState: { seo: { title: "Old title" } },
  proposedChange: { value: "New title" },
  expectedState: { seo: { title: "New title" } },
  safetyDisposition: "auto",
};

test("accepts one bounded reversible Diamond Shelf action", () => {
  assert.deepEqual(validateControlledOptimizationRequest(request), []);
});

test("blocks missing before-state and wrong site", () => {
  const blockers = validateControlledOptimizationRequest({ ...request, siteDomain: "example.com", beforeState: {} });
  assert.equal(blockers.includes("Task #27 is locked to diamondshelf.us"), true);
  assert.equal(blockers.includes("Captured before-state is required before production authorization"), true);
});

test("fails closed while global production writes are disabled", () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "false";
  assert.throws(() => issueControlledOptimizationPermit(request, {
    siteDomain: "diamondshelf.us",
    actionId: "action-1",
    actionType: "metadata.title",
    approvedBy: "owner",
    authorizationRef: "auth-1",
  }), /kill switch is disabled/);
  if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED; else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
});

test("authorization must match exact site, action id, and action type", () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
  assert.throws(() => issueControlledOptimizationPermit(request, {
    siteDomain: "diamondshelf.us",
    actionId: "different-action",
    actionType: "metadata.title",
    approvedBy: "owner",
    authorizationRef: "auth-1",
  }), /actionId does not match/);
  if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED; else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
});

test("issues deterministic permit only with explicit matching authorization", () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
  const auth = {
    siteDomain: "diamondshelf.us",
    actionId: "action-1",
    actionType: "metadata.title" as const,
    approvedBy: "owner",
    authorizationRef: "auth-1",
  };
  const first = issueControlledOptimizationPermit(request, auth);
  const second = issueControlledOptimizationPermit(request, auth);
  assert.equal(first.state, "authorized");
  assert.equal(first.permitFingerprint, second.permitFingerprint);
  if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED; else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
});

test("failed or regressed verification requires rollback path", () => {
  assert.equal(verificationOutcome("verified"), "verified");
  assert.equal(verificationOutcome("failed"), "rollback_required");
  assert.equal(verificationOutcome("regressed"), "rollback_required");
});

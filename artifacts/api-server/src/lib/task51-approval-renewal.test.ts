import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApprovalWindowRenewal } from "./task51-approval-renewal.js";

const base = () => ({
  planId: "11111111-1111-4111-8111-111111111111",
  pageId: "22222222-2222-4222-8222-222222222222",
  pageUrl: "https://diamondshelf.us/collections/home-fragrance",
  actionType: "update_meta_description",
  field: "meta_description",
  beforeValue: null,
  afterValue: "The Home Fragrance collection combines Candles, Diffusers, and Other Home Fragrance for easier comparison.",
  currentValue: null,
  supportingEvidenceIds: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
  persistedEvidenceCount: 2,
  proposalFingerprint: "proposal-fingerprint",
  lifecycle: "approved_proposal",
  approvalDecision: "approved",
  approvedAt: "2026-09-12T00:00:00.000Z",
  qualityEligible: true,
  riskClassification: "medium",
  priorActionCount: 0,
  publicSiteWritesEnabled: false,
  now: "2026-09-12T00:16:00.000Z",
  ttlMinutes: 15,
});

test("renews only an otherwise-eligible expired Task #51 authorization window", () => {
  const result = evaluateApprovalWindowRenewal(base());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.previousExpiresAt, "2026-09-12T00:15:00.000Z");
  assert.equal(result.envelope.authorization.executionAuthorized, true);
  assert.equal(result.envelope.authorization.providerWriteAllowed, false);
  assert.equal(result.envelope.authorization.publicSiteWrites, false);
  assert.equal(result.envelope.authorization.automaticTransition, false);
  assert.equal(result.envelope.authorization.issuedAt, "2026-09-12T00:16:00.000Z");
  assert.equal(result.envelope.authorization.expiresAt, "2026-09-12T00:31:00.000Z");
});

test("refuses renewal while the current authorization window is still active", () => {
  const result = evaluateApprovalWindowRenewal({ ...base(), now: "2026-09-12T00:10:00.000Z" });
  assert.deepEqual(result, { ok: false, reason: "authorization_window_still_active" });
});

test("does not use renewal to bypass a changed source state", () => {
  const result = evaluateApprovalWindowRenewal({ ...base(), currentValue: "Changed externally" });
  assert.deepEqual(result, { ok: false, reason: "source_state_changed" });
});

test("does not use renewal to bypass evidence, risk, action, or public-write guards", () => {
  assert.deepEqual(
    evaluateApprovalWindowRenewal({ ...base(), persistedEvidenceCount: 1 }),
    { ok: false, reason: "supporting_evidence_incomplete" },
  );
  assert.deepEqual(
    evaluateApprovalWindowRenewal({ ...base(), riskClassification: "high" }),
    { ok: false, reason: "risk_requires_human_block" },
  );
  assert.deepEqual(
    evaluateApprovalWindowRenewal({ ...base(), priorActionCount: 1 }),
    { ok: false, reason: "executable_action_already_exists" },
  );
  assert.deepEqual(
    evaluateApprovalWindowRenewal({ ...base(), publicSiteWritesEnabled: true }),
    { ok: false, reason: "task51_requires_public_writes_disabled" },
  );
});

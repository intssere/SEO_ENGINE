import test from "node:test";
import assert from "node:assert/strict";
import { evaluateExecutionAuthorization } from "./execution-foundation.js";

const base = () => ({
  planId: "11111111-1111-4111-8111-111111111111",
  pageId: "22222222-2222-4222-8222-222222222222",
  pageUrl: "https://diamondshelf.us/collections/beauty",
  actionType: "update_meta_description",
  field: "meta_description",
  beforeValue: null,
  afterValue: "Beauty presents Bath & Body, Beauty & Cosmetics, Body Lotion & Cream, and Eye Care together.",
  currentValue: null,
  supportingEvidenceIds: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
  persistedEvidenceCount: 2,
  proposalFingerprint: "proposal-fingerprint",
  lifecycle: "approved_proposal",
  approvalDecision: "approved",
  approvedAt: "2026-09-12T00:00:00.000Z",
  qualityEligible: true,
  riskClassification: "low",
  priorActionCount: 0,
  publicSiteWritesEnabled: false,
  now: "2026-09-12T00:05:00.000Z",
  ttlMinutes: 15,
});

test("creates a bounded executable authorization envelope without provider write authority", () => {
  const result = evaluateExecutionAuthorization(base());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.envelope.authorization.executionAuthorized, true);
  assert.equal(result.envelope.authorization.providerWriteAllowed, false);
  assert.equal(result.envelope.authorization.publicSiteWrites, false);
  assert.equal(result.envelope.authorization.automaticTransition, false);
  assert.equal(result.envelope.verification.status, "pending");
  assert.equal(result.envelope.verification.failureDisposition, "rollback_eligible");
  assert.equal(result.envelope.rollback.value, null);
});

test("rejects a stale lifecycle that is not explicitly approved", () => {
  const result = evaluateExecutionAuthorization({ ...base(), lifecycle: "approval_ready" });
  assert.deepEqual(result, { ok: false, reason: "proposal_not_explicitly_approved" });
});

test("rejects changed source value", () => {
  const result = evaluateExecutionAuthorization({ ...base(), currentValue: "Changed externally" });
  assert.deepEqual(result, { ok: false, reason: "source_state_changed" });
});

test("rejects missing or unpersisted evidence", () => {
  const result = evaluateExecutionAuthorization({ ...base(), persistedEvidenceCount: 1 });
  assert.deepEqual(result, { ok: false, reason: "supporting_evidence_incomplete" });
});

test("rejects blocked risk", () => {
  const result = evaluateExecutionAuthorization({ ...base(), riskClassification: "blocked" });
  assert.deepEqual(result, { ok: false, reason: "risk_requires_human_block" });
});

test("rejects expired authorization window", () => {
  const result = evaluateExecutionAuthorization({ ...base(), now: "2026-09-12T00:16:00.000Z" });
  assert.deepEqual(result, { ok: false, reason: "authorization_window_expired" });
});

test("rejects duplicate executable action creation", () => {
  const result = evaluateExecutionAuthorization({ ...base(), priorActionCount: 1 });
  assert.deepEqual(result, { ok: false, reason: "executable_action_already_exists" });
});

test("Task #51 fails closed if the public write gate is enabled", () => {
  const result = evaluateExecutionAuthorization({ ...base(), publicSiteWritesEnabled: true });
  assert.deepEqual(result, { ok: false, reason: "task51_requires_public_writes_disabled" });
});

test("rejects fields outside the bounded v1 execution surface", () => {
  const result = evaluateExecutionAuthorization({ ...base(), field: "body_html" });
  assert.deepEqual(result, { ok: false, reason: "field_not_bounded_for_execution" });
});

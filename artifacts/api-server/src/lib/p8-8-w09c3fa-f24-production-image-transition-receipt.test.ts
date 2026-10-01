import assert from "node:assert/strict";
import test from "node:test";
import { F24_RECEIPT, validateF24Receipt } from "./p8-8-w09c3fa-f24-production-image-transition-receipt.js";

test("F24 receipt validates exact successful Production transition", () => {
  const r = validateF24Receipt(F24_RECEIPT);
  assert.equal(r.result, "pass");
  if (r.result === "pass") {
    assert.match(r.fingerprint, /^f24-receipt-[0-9a-f]{64}$/);
  }
});

test("receipt drift fails closed", () => {
  const drifted = { ...F24_RECEIPT, deploymentStatus: "FAILED" };
  const r = validateF24Receipt(drifted);
  assert.equal(r.result, "fail_closed");
});

test("safety exclusions remain recorded", () => {
  assert.equal(F24_RECEIPT.providerActionPerformed, false);
  assert.equal(F24_RECEIPT.productionDbActionPerformed, false);
  assert.equal(F24_RECEIPT.schedulerWorkerActivationPerformed, false);
  assert.equal(F24_RECEIPT.retries, 0);
  assert.equal(F24_RECEIPT.deploymentAttempts, 1);
});

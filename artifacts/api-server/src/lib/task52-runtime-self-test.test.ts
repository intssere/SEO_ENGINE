import test from "node:test";
import assert from "node:assert/strict";
import { runTask52RuntimeSelfTest } from "./task52-runtime-self-test.js";

test("Task #52 runtime self-test exercises forward verification and rollback without side effects", () => {
  const result = runTask52RuntimeSelfTest();
  assert.equal(result.version, "shopify_write_verification_rollback_dry_run_v1");
  assert.equal(result.status, "passed");
  assert.equal(result.network_requests, 0);
  assert.equal(result.provider_dispatch_attempted, false);
  assert.equal(result.public_write_occurred, false);
  assert.equal(result.database_mutations, 0);
  assert.equal(result.forward.connector_version, "shopify_write_connector_v1");
  assert.equal(result.forward.verification_status, "passed");
  assert.equal(result.forward.final_state, "verified");
  assert.equal(result.rollback.connector_version, "shopify_write_connector_v1");
  assert.equal(result.rollback.verification_status, "failed");
  assert.equal(result.rollback.rollback_verification_status, "passed");
  assert.equal(result.rollback.final_state, "rollback_verified");
});

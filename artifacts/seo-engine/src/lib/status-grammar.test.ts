import test from "node:test";
import assert from "node:assert/strict";
import {
  availabilityTone,
  connectionTone,
  decisionTone,
  lifecycleTone,
  qualityTone,
  readinessTone,
  riskTone,
} from "./status-grammar";

test("risk grammar is conservative and never treats blocked/high/critical as success", () => {
  assert.equal(riskTone("low"), "success");
  assert.equal(riskTone("medium"), "warning");
  assert.equal(riskTone("approval"), "warning");
  assert.equal(riskTone("high"), "danger");
  assert.equal(riskTone("critical"), "danger");
  assert.equal(riskTone("blocked"), "danger");
  assert.equal(riskTone("unknown"), "neutral");
});

test("lifecycle grammar separates approval, success, invalidation, and draft states", () => {
  assert.equal(lifecycleTone("approval_ready"), "warning");
  assert.equal(lifecycleTone("approved_proposal"), "success");
  assert.equal(lifecycleTone("invalidated"), "danger");
  assert.equal(lifecycleTone("generated"), "info");
  assert.equal(lifecycleTone("other"), "neutral");
});

test("quality grammar has explicit pass, warning, and failure semantics", () => {
  assert.equal(qualityTone("pass"), "success");
  assert.equal(qualityTone("warning"), "warning");
  assert.equal(qualityTone("fail"), "danger");
  assert.equal(qualityTone("blocked"), "danger");
  assert.equal(qualityTone("unknown"), "neutral");
});

test("availability grammar preserves honesty for read-only, planned, and unavailable modules", () => {
  assert.equal(availabilityTone("read_only"), "info");
  assert.equal(availabilityTone("coming_soon"), "neutral");
  assert.equal(availabilityTone("planned"), "neutral");
  assert.equal(availabilityTone("unavailable"), "danger");
});

test("readiness grammar distinguishes live readiness from setup and unavailable states", () => {
  assert.equal(readinessTone("live"), "success");
  assert.equal(readinessTone("pilot_ready"), "success");
  assert.equal(readinessTone("setup_required"), "warning");
  assert.equal(readinessTone("stale"), "warning");
  assert.equal(readinessTone("unavailable"), "danger");
});

test("connection grammar distinguishes connected, authorized-only, and disconnected", () => {
  assert.equal(connectionTone(true, true), "success");
  assert.equal(connectionTone(false, true), "warning");
  assert.equal(connectionTone(false, false), "neutral");
});

test("decision grammar distinguishes approved, rejected, and pending", () => {
  assert.equal(decisionTone("approved"), "success");
  assert.equal(decisionTone("rejected"), "danger");
  assert.equal(decisionTone("pending"), "neutral");
  assert.equal(decisionTone(null), "neutral");
});

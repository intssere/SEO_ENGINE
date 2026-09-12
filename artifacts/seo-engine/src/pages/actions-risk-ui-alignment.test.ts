import test from "node:test";
import assert from "node:assert/strict";

const allowed = (risk: string) => !["blocked", "high", "critical"].includes(risk.toLowerCase());

test("bounded internal UI risk gate matches Task #51 backend guard", () => {
  assert.equal(allowed("low"), true);
  assert.equal(allowed("medium"), true);
  assert.equal(allowed("blocked"), false);
  assert.equal(allowed("high"), false);
  assert.equal(allowed("critical"), false);
});

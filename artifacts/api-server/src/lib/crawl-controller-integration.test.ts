import assert from "node:assert/strict";
import test from "node:test";
import { BASELINE_CRAWL_POLICY } from "./crawl-controller.js";
import { PILOT_LIMITS } from "./pilot-runner.js";

test("P2.1 baseline policy exactly matches the current production pilot crawl limits", () => {
  assert.equal(BASELINE_CRAWL_POLICY.pageHardLimit, PILOT_LIMITS.crawlPages);
  assert.equal(BASELINE_CRAWL_POLICY.depthLimit, PILOT_LIMITS.crawlDepth);
  assert.deepEqual(BASELINE_CRAWL_POLICY, {
    pageHardLimit: 30,
    depthLimit: 2,
  });
});

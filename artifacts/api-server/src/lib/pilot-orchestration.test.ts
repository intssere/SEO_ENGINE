import assert from "node:assert/strict";
import test from "node:test";
import { requestPilotRun, type PilotQueueDependencies } from "./pilot-orchestration.js";

function dependencies(overrides: Partial<PilotQueueDependencies> = {}) {
  const launched: string[] = [];
  const deps: PilotQueueDependencies = {
    preflight: async () => ({ siteId: "site" }),
    enqueue: async () => ({ accepted: true, runId: "run" }),
    launch: (runId) => { launched.push(runId); },
    ...overrides,
  };
  return { deps, launched };
}

test("pilot request fails closed before enqueue when preflight authorization fails", async () => {
  let enqueued = false;
  const { deps, launched } = dependencies({
    preflight: async () => { throw new Error("pilot_required_connections_missing"); },
    enqueue: async () => { enqueued = true; return { accepted: true, runId: "run" }; },
  });
  await assert.rejects(() => requestPilotRun(deps), /pilot_required_connections_missing/);
  assert.equal(enqueued, false);
  assert.deepEqual(launched, []);
});

test("active pilot run is rejected without launching a duplicate", async () => {
  const { deps, launched } = dependencies({ enqueue: async () => ({ accepted: false, runId: "active-run" }) });
  assert.deepEqual(await requestPilotRun(deps), { accepted: false, runId: "active-run" });
  assert.deepEqual(launched, []);
});

test("accepted pilot run is queued exactly once", async () => {
  const { deps, launched } = dependencies();
  assert.deepEqual(await requestPilotRun(deps), { accepted: true, runId: "run" });
  assert.deepEqual(launched, ["run"]);
});
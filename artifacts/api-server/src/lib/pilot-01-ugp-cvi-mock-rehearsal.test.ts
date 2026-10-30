import assert from "node:assert/strict";
import test from "node:test";
import { loadStartupRuntimeConfig, PILOT_QUEUE_RESUME_GATE } from "./startup-runtime.js";
import { requestPilotRun, type PilotQueueDependencies } from "./pilot-orchestration.js";

/**
 * PILOT-01 disposable mock rehearsal, increment A.
 * No Postgres client, HTTP listener, Shopify/GSC read, model call or worker is started.
 * These tests exercise existing source exports and injectable boundaries, not CVI runtime.
 */
test("PILOT-01 R04: queue resume stays off for omitted/false flag, even with DB configured", () => {
  for (const flag of [undefined, "", "false", "0", "yes"]) {
    const config = loadStartupRuntimeConfig({
      DATABASE_URL: "mock://not-connected",
      [PILOT_QUEUE_RESUME_GATE]: flag,
    });
    assert.equal(config.databaseConfigured, true);
    assert.equal(config.pilotQueueResumeEnabled, false);
  }
  assert.equal(
    loadStartupRuntimeConfig({ [PILOT_QUEUE_RESUME_GATE]: "true" }).pilotQueueResumeEnabled,
    false,
  );
});

test("PILOT-01 R03: mismatched tenant/site preflight never enqueues or launches", async () => {
  const expected = { tenantId: "tenant-A", siteId: "site-A" };
  const actual = { tenantId: "tenant-B", siteId: "site-B" };
  const calls: string[] = [];
  const deps: PilotQueueDependencies = {
    preflight: async () => {
      calls.push("preflight");
      if (actual.tenantId !== expected.tenantId || actual.siteId !== expected.siteId) {
        throw new Error("pilot_tenant_site_mismatch");
      }
      return { siteId: actual.siteId };
    },
    enqueue: async () => {
      calls.push("enqueue");
      return { accepted: true, runId: "run-A" };
    },
    launch: () => { calls.push("launch"); },
  };
  await assert.rejects(() => requestPilotRun(deps), /pilot_tenant_site_mismatch/);
  assert.deepEqual(calls, ["preflight"]);
});

test("PILOT-01 queue boundary: rejected claim and failed enqueue never launch worker", async () => {
  const launches: string[] = [];
  const rejected: PilotQueueDependencies = {
    preflight: async () => ({ siteId: "fixture-site" }),
    enqueue: async () => ({ accepted: false, runId: "existing" }),
    launch: runId => { launches.push(runId); },
  };
  assert.deepEqual(await requestPilotRun(rejected), { accepted: false, runId: "existing" });
  const failed: PilotQueueDependencies = {
    ...rejected,
    enqueue: async () => { throw new Error("mock_enqueue_unavailable"); },
  };
  await assert.rejects(() => requestPilotRun(failed), /mock_enqueue_unavailable/);
  assert.deepEqual(launches, []);
});

/**
 * Evidence boundaries: R01 production pre-listen guard, R05/R06 real claim fencing,
 * R08 provider transport, R09 receipt labeling, R10 AI/runtime and R11/R12 CVI
 * action authorization are NOT certified by these tests. They remain blocked until
 * their distinct source implementations are integrated and testable.
 */

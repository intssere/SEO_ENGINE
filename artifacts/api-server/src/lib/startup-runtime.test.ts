import assert from "node:assert/strict";
import test from "node:test";
import {
  loadStartupRuntimeConfig,
  PILOT_QUEUE_RESUME_GATE,
} from "./startup-runtime.js";

test("legacy pilot queue resume is default-off even when a database is configured", () => {
  assert.deepEqual(
    loadStartupRuntimeConfig({ DATABASE_URL: "postgres://example" }),
    {
      databaseConfigured: true,
      pilotQueueResumeEnabled: false,
    },
  );
});

test("legacy pilot queue resume requires both database and explicit gate", () => {
  assert.equal(
    loadStartupRuntimeConfig({ [PILOT_QUEUE_RESUME_GATE]: "true" })
      .pilotQueueResumeEnabled,
    false,
  );
  assert.equal(
    loadStartupRuntimeConfig({
      DATABASE_URL: "postgres://example",
      [PILOT_QUEUE_RESUME_GATE]: " false ",
    }).pilotQueueResumeEnabled,
    false,
  );
  assert.equal(
    loadStartupRuntimeConfig({
      DATABASE_URL: "postgres://example",
      [PILOT_QUEUE_RESUME_GATE]: " TRUE ",
    }).pilotQueueResumeEnabled,
    true,
  );
});

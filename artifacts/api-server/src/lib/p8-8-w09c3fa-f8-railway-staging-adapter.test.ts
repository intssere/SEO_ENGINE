import assert from "node:assert/strict";
import test from "node:test";
import {
  planRailwayStaging,
  RAILWAY_STAGING_MODE,
  RAILWAY_STAGING_SCHEMA,
  verifyRailwayStaging,
} from "./p8-8-w09c3fa-f8-railway-staging-adapter.js";

const bytes = (value: string) => new TextEncoder().encode(value);
const payload = [
  { path: "Dockerfile", mode: "100644" as const, content: bytes("FROM node:22\n") },
  { path: "bin/run", mode: "100755" as const, content: bytes("#!/bin/sh\n") },
  { path: "current", mode: "120000" as const, content: bytes("releases/v1") },
];

function exactObservation() {
  const planned = planRailwayStaging(payload);
  assert.equal(planned.result, "pass");
  if (planned.result !== "pass") throw new Error("fixture");
  return {
    schema: RAILWAY_STAGING_SCHEMA,
    sourceMode: RAILWAY_STAGING_MODE,
    entries: planned.plan.entries.map((entry) => ({ ...entry })),
  };
}

test("exact isolated staging inventory passes deterministically", () => {
  const first = planRailwayStaging(payload);
  const second = planRailwayStaging(payload.map((e) => ({ ...e, content: e.content.slice() })));
  assert.deepEqual(first, second);
  assert.equal(first.result, "pass");
  if (first.result !== "pass") return;
  assert.equal(
    verifyRailwayStaging(payload, exactObservation(), first.plan.manifestSha256, first.plan.artifactSha256).result,
    "pass",
  );
});

test("addition and omission fail closed", () => {
  const planned = planRailwayStaging(payload);
  assert.equal(planned.result, "pass");
  if (planned.result !== "pass") return;
  const omitted = exactObservation();
  omitted.entries.pop();
  assert.deepEqual(
    verifyRailwayStaging(payload, omitted, planned.plan.manifestSha256, planned.plan.artifactSha256),
    { result: "fail_closed", code: "staging_mismatch" },
  );
  const added = exactObservation();
  added.entries.push({
    path: "zzz-extra",
    kind: "file",
    executable: false,
    size: 1,
    contentSha256: "f".repeat(64),
  });
  assert.deepEqual(
    verifyRailwayStaging(payload, added, planned.plan.manifestSha256, planned.plan.artifactSha256),
    { result: "fail_closed", code: "staging_mismatch" },
  );
});

test("content, executable bit, and symlink dereference fail closed", () => {
  const planned = planRailwayStaging(payload);
  assert.equal(planned.result, "pass");
  if (planned.result !== "pass") return;

  const content = exactObservation();
  content.entries[0] = { ...content.entries[0], contentSha256: "f".repeat(64) };
  assert.equal(verifyRailwayStaging(payload, content, planned.plan.manifestSha256, planned.plan.artifactSha256).result, "fail_closed");

  const executable = exactObservation();
  executable.entries[1] = { ...executable.entries[1], executable: false };
  assert.equal(verifyRailwayStaging(payload, executable, planned.plan.manifestSha256, planned.plan.artifactSha256).result, "fail_closed");

  const dereferenced = exactObservation();
  dereferenced.entries[2] = { ...dereferenced.entries[2], kind: "file" };
  assert.equal(verifyRailwayStaging(payload, dereferenced, planned.plan.manifestSha256, planned.plan.artifactSha256).result, "fail_closed");
});

test("wrong certified F7 identities fail closed", () => {
  const planned = planRailwayStaging(payload);
  assert.equal(planned.result, "pass");
  if (planned.result !== "pass") return;
  assert.equal(
    verifyRailwayStaging(payload, exactObservation(), "f".repeat(64), planned.plan.artifactSha256).result,
    "fail_closed",
  );
  assert.equal(
    verifyRailwayStaging(payload, exactObservation(), planned.plan.manifestSha256, "f".repeat(64)).result,
    "fail_closed",
  );
});

test("unknown fields, invalid ordering, and executable symlink observations fail closed", () => {
  const planned = planRailwayStaging(payload);
  assert.equal(planned.result, "pass");
  if (planned.result !== "pass") return;

  const extra = { ...exactObservation(), cwd: "/tmp/stage" };
  assert.deepEqual(
    verifyRailwayStaging(payload, extra, planned.plan.manifestSha256, planned.plan.artifactSha256),
    { result: "fail_closed", code: "invalid_observation" },
  );

  const unsorted = exactObservation();
  unsorted.entries.reverse();
  assert.equal(verifyRailwayStaging(payload, unsorted, planned.plan.manifestSha256, planned.plan.artifactSha256).result, "fail_closed");

  const badLink = exactObservation();
  badLink.entries[2] = { ...badLink.entries[2], executable: true };
  assert.equal(verifyRailwayStaging(payload, badLink, planned.plan.manifestSha256, planned.plan.artifactSha256).result, "fail_closed");
});

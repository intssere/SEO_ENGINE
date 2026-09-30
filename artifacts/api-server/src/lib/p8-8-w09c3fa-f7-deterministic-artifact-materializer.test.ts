import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  materializeSourceArtifact,
  verifyMaterializedSourceArtifact,
} from "./p8-8-w09c3fa-f7-deterministic-artifact-materializer.js";

const bytes = (value: string) => new TextEncoder().encode(value);
const payload = [
  { path: "Dockerfile", mode: "100644" as const, content: bytes("FROM node:22\n") },
  { path: "bin/run", mode: "100755" as const, content: bytes("#!/bin/sh\nexec node app.js\n") },
  { path: "current", mode: "120000" as const, content: bytes("releases/v1") },
];

test("materialization is byte-for-byte deterministic", () => {
  const first = materializeSourceArtifact(payload);
  const second = materializeSourceArtifact(payload.map((entry) => ({ ...entry, content: entry.content.slice() })));
  assert.equal(first.result, "pass");
  assert.equal(second.result, "pass");
  if (first.result === "pass" && second.result === "pass") {
    assert.deepEqual(first.artifact.artifactBytes, second.artifact.artifactBytes);
    assert.equal(first.artifact.artifactSha256, second.artifact.artifactSha256);
    assert.equal(first.artifact.manifestSha256, second.artifact.manifestSha256);
    assert.equal(createHash("sha256").update(first.artifact.artifactBytes).digest("hex"), first.artifact.artifactSha256);
  }
});

test("modes and symlink target bytes are identity-bearing", () => {
  const base = materializeSourceArtifact(payload);
  const modeChanged = materializeSourceArtifact(payload.map((e, i) => i === 0 ? { ...e, mode: "100755" as const } : e));
  const linkChanged = materializeSourceArtifact(payload.map((e, i) => i === 2 ? { ...e, content: bytes("releases/v2") } : e));
  assert.equal(base.result, "pass");
  assert.equal(modeChanged.result, "pass");
  assert.equal(linkChanged.result, "pass");
  if (base.result === "pass" && modeChanged.result === "pass" && linkChanged.result === "pass") {
    assert.notEqual(base.artifact.artifactSha256, modeChanged.artifact.artifactSha256);
    assert.notEqual(base.artifact.artifactSha256, linkChanged.artifact.artifactSha256);
    assert.notEqual(base.artifact.manifestSha256, modeChanged.artifact.manifestSha256);
    assert.notEqual(base.artifact.manifestSha256, linkChanged.artifact.manifestSha256);
  }
});

test("content tampering fails expected manifest certification", () => {
  const base = materializeSourceArtifact(payload);
  assert.equal(base.result, "pass");
  if (base.result !== "pass") return;
  const tampered = payload.map((e, i) => i === 0 ? { ...e, content: bytes("FROM node:23\n") } : e);
  assert.deepEqual(
    verifyMaterializedSourceArtifact(tampered, base.artifact.manifest, base.artifact.manifestSha256, base.artifact.artifactSha256),
    { result: "fail_closed", code: "content_mismatch" },
  );
});

test("rejects unsafe, duplicate, unsorted, unsupported, and extra fields", () => {
  assert.deepEqual(materializeSourceArtifact([{ path: "../x", mode: "100644", content: bytes("x") }]),
    { result: "fail_closed", code: "unsafe_path" });
  assert.deepEqual(materializeSourceArtifact([payload[1], payload[0]]),
    { result: "fail_closed", code: "duplicate_or_unsorted_path" });
  assert.deepEqual(materializeSourceArtifact([payload[0], { ...payload[0] }]),
    { result: "fail_closed", code: "duplicate_or_unsorted_path" });
  assert.deepEqual(materializeSourceArtifact([{ path: "x", mode: "160000", content: bytes("x") }]),
    { result: "fail_closed", code: "unsupported_mode" });
  assert.deepEqual(materializeSourceArtifact([{ ...payload[0], mtime: 1 }]),
    { result: "fail_closed", code: "invalid_payload" });
});

test("framing prevents path/content boundary ambiguity", () => {
  const a = materializeSourceArtifact([{ path: "ab", mode: "100644", content: bytes("c") }]);
  const b = materializeSourceArtifact([{ path: "a", mode: "100644", content: bytes("bc") }]);
  assert.equal(a.result, "pass");
  assert.equal(b.result, "pass");
  if (a.result === "pass" && b.result === "pass") {
    assert.notEqual(a.artifact.artifactSha256, b.artifact.artifactSha256);
  }
});

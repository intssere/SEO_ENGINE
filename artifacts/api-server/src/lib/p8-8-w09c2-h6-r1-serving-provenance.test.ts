import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import { createBuildProvenance, serializeBuildProvenance } from "./p8-8-w09c2f-build-provenance.js";
import { loadServingProvenance, servingProvenanceArtifactPath } from "./p8-8-w09c2-h6-r1-serving-provenance.js";

const artifactResult = createBuildProvenance({
  canonical_commit_sha: "1111111111111111111111111111111111111111",
  canonical_tree_sha: "2222222222222222222222222222222222222222",
  source_branch: "main",
  generated_at_build: "2026-09-26T00:00:00.000Z",
});
assert.equal(artifactResult.result, "pass");
if (artifactResult.result !== "pass") throw new Error("fixture");

test("serving provenance accepts only a valid fingerprinted build artifact", async () => {
  let requestedPath = "";
  const result = await loadServingProvenance(async (artifactPath) => {
    requestedPath = artifactPath;
    return serializeBuildProvenance(artifactResult.artifact);
  }, "/immutable/dist/build-provenance.json");
  assert.equal(requestedPath, "/immutable/dist/build-provenance.json");
  assert.deepEqual(result, {
    result: "pass",
    code: "ok",
    attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1",
    provenance: artifactResult.artifact,
  });
});

test("serving provenance fails closed when artifact is unavailable", async () => {
  const result = await loadServingProvenance(async () => { throw new Error("missing"); }, "/dist/build-provenance.json");
  assert.deepEqual(result, {
    result: "fail_closed",
    code: "artifact_unavailable",
    attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1",
  });
});

test("serving provenance fails closed on malformed or fingerprint-invalid content", async () => {
  const malformed = await loadServingProvenance(async () => "{}", "/dist/build-provenance.json");
  assert.equal(malformed.result, "fail_closed");
  assert.equal(malformed.code, "artifact_invalid");

  const tampered = { ...artifactResult.artifact, canonical_tree_sha: "3333333333333333333333333333333333333333" };
  const invalid = await loadServingProvenance(async () => JSON.stringify(tampered), "/dist/build-provenance.json");
  assert.equal(invalid.result, "fail_closed");
  assert.equal(invalid.code, "artifact_invalid");
});

test("source module layout resolves to the package-owned dist artifact", () => {
  const resolved = servingProvenanceArtifactPath("file:///srv/artifacts/api-server/src/lib/module.mjs");
  assert.equal(resolved, "/srv/artifacts/api-server/dist/build-provenance.json");
});

test("bundled Production runtime layout resolves to the sibling provenance artifact", () => {
  const resolved = servingProvenanceArtifactPath("file:///srv/artifacts/api-server/dist/index.mjs");
  assert.equal(resolved, "/srv/artifacts/api-server/dist/build-provenance.json");
});

test("unknown module layouts fail closed instead of guessing a path", () => {
  assert.throws(
    () => servingProvenanceArtifactPath("file:///srv/unknown/runtime.mjs"),
    /unsupported_serving_provenance_module_layout/,
  );
});

test("esbuild-bundled loader resolves provenance beside the actual dist/index.mjs bundle", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "h6-r2-bundle-"));
  try {
    const outfile = path.join(tempRoot, "dist", "index.mjs");
    const loaderUrl = new URL("./p8-8-w09c2-h6-r1-serving-provenance.ts", import.meta.url).href;
    await esbuild({
      stdin: {
        contents: `export { servingProvenanceArtifactPath } from ${JSON.stringify(loaderUrl)};`,
        resolveDir: process.cwd(),
        sourcefile: "h6-r2-bundle-probe.ts",
        loader: "ts",
      },
      outfile,
      platform: "node",
      bundle: true,
      format: "esm",
      logLevel: "silent",
    });

    const bundled = await import(pathToFileURL(outfile).href);
    assert.equal(
      bundled.servingProvenanceArtifactPath(),
      path.join(tempRoot, "dist", "build-provenance.json"),
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

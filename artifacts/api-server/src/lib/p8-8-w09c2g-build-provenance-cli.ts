import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBuildProvenance,
  serializeBuildProvenance,
} from "./p8-8-w09c2f-build-provenance.js";
import { resolveBuildSourceIdentity } from "./p8-8-w09c2-h5r1-build-source-identity.js";

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = path.join(artifactDir, "dist", "build-provenance.json");

const identity = resolveBuildSourceIdentity();
if (identity.result !== "pass") {
  throw new Error(`Build provenance source identity failed closed: ${identity.code}`);
}

const result = createBuildProvenance({
  canonical_commit_sha: identity.identity.canonical_commit_sha,
  canonical_tree_sha: identity.identity.canonical_tree_sha,
  source_branch: identity.identity.source_branch,
  generated_at_build: new Date().toISOString(),
});

if (result.result !== "pass") {
  throw new Error(`Build provenance generation failed closed: ${result.code}`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializeBuildProvenance(result.artifact) + "\n", {
  encoding: "utf8",
  flag: "wx",
});

console.log(`Build provenance artifact generated from ${identity.identity.source} source identity.`);

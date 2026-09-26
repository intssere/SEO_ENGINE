import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBuildProvenance,
  serializeBuildProvenance,
} from "./p8-8-w09c2f-build-provenance.js";

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = path.join(artifactDir, "dist", "build-provenance.json");

const result = createBuildProvenance({
  canonical_commit_sha: process.env.EXPECTED_CANONICAL_COMMIT,
  canonical_tree_sha: process.env.EXPECTED_CANONICAL_TREE,
  source_branch: process.env.EXPECTED_SOURCE_BRANCH,
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

console.log("Build provenance artifact generated.");

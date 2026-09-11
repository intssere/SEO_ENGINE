import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(artifactDir, "dist");

const bundle = await readFile(path.join(distDir, "index.mjs"), "utf8");
const sourceMap = await readFile(path.join(distDir, "index.mjs.map"), "utf8");

const requiredBundleMarkers = [
  '"/execution"',
  "same_origin_execution_authorization_required",
  "task51_requires_public_writes_disabled",
  "controlled_execution_foundation_v1",
];

const requiredSourceMarkers = [
  "routes/execution.ts",
  "lib/execution-foundation.ts",
  "lib/execution-store.ts",
];

const missingBundleMarkers = requiredBundleMarkers.filter((marker) => !bundle.includes(marker));
const missingSourceMarkers = requiredSourceMarkers.filter((marker) => !sourceMap.includes(marker));

if (missingBundleMarkers.length > 0 || missingSourceMarkers.length > 0) {
  const details = [
    missingBundleMarkers.length > 0 ? `bundle markers: ${missingBundleMarkers.join(", ")}` : null,
    missingSourceMarkers.length > 0 ? `source-map markers: ${missingSourceMarkers.join(", ")}` : null,
  ].filter(Boolean).join("; ");

  throw new Error(`Production API bundle verification failed; stale or incomplete build detected (${details}).`);
}

console.log("Production API bundle verification passed: Task #51 execution foundation is present.");

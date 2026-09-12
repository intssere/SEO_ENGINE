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
  "/execution/task52/self-test",
  "shopify_write_verification_rollback_dry_run_v1",
  "shopify_write_connector_v1",
  "rollback_verified",
  "manual_intervention_required",
  "controlled_single_action_production_execution_pilot_v1",
  "/execution/:id/task53/preflight",
  "/execution/:id/task53/execute",
  "explicit_task53_execute_and_rollback_confirmation_required",
  "task53_write_products",
  "task53_store_v2",
  "2026-07",
  "rollback_precedes_nonessential_audit_persistence",
  "provider_write_dispatch_enabled",
];

const requiredSourceMarkers = [
  "routes/execution.ts",
  "routes/connections.ts",
  "lib/execution-foundation.ts",
  "lib/execution-store.ts",
  "lib/shopify-write-foundation.ts",
  "lib/task52-runtime-self-test.ts",
  "lib/task53-production-pilot.ts",
  "lib/task53-shopify-credential.ts",
  "lib/task53-store-v2.ts",
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

console.log("Production API bundle verification passed: Task #51 execution foundation, Task #52 dry-run verification/rollback, and hardened Task #53 controlled single-action production pilot are present.");
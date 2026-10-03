import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(artifactDir, "dist");

const bundle = await readFile(path.join(distDir, "index.mjs"), "utf8");
const sourceMap = await readFile(path.join(distDir, "index.mjs.map"), "utf8");
const p122Bundle = await readFile(path.join(distDir, "p12-2-crawl.mjs"), "utf8");
const p122SourceMap = await readFile(path.join(distDir, "p12-2-crawl.mjs.map"), "utf8");
const p122L2Bundle = await readFile(path.join(distDir, "p12-2-l2-one-shot.mjs"), "utf8");
const p122L2SourceMap = await readFile(path.join(distDir, "p12-2-l2-one-shot.mjs.map"), "utf8");
const p122LiveBundle = await readFile(path.join(distDir, "p12-2-live-operator.mjs"), "utf8");
const p122LiveSourceMap = await readFile(path.join(distDir, "p12-2-live-operator.mjs.map"), "utf8");
const provenanceRaw = await readFile(path.join(distDir, "build-provenance.json"), "utf8");
const provenance = JSON.parse(provenanceRaw);
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

const explicitIdentity = [
  process.env.EXPECTED_CANONICAL_COMMIT,
  process.env.EXPECTED_CANONICAL_TREE,
  process.env.EXPECTED_SOURCE_BRANCH,
];
const suppliedIdentityParts = explicitIdentity.filter(Boolean).length;
if (suppliedIdentityParts > 0 && suppliedIdentityParts < 3) {
  throw new Error("Production API build provenance verification failed closed: explicit source identity is partial.");
}

let expectedCommit;
let expectedTree;
let expectedBranch;
if (suppliedIdentityParts === 3) {
  [expectedCommit, expectedTree, expectedBranch] = explicitIdentity;
} else {
  try {
    if (git(["status", "--porcelain", "--untracked-files=no"]) !== "") {
      throw new Error("dirty");
    }
    expectedCommit = git(["rev-parse", "HEAD"]);
    expectedTree = git(["rev-parse", "HEAD^{tree}"]);
    expectedBranch = git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
  } catch {
    throw new Error("Production API build provenance verification failed closed: Git source identity is unavailable or dirty.");
  }
}

const provenanceKeys = [
  "schema_version", "canonical_commit_sha", "canonical_tree_sha",
  "source_branch", "generated_at_build", "provenance_fingerprint",
];
if (
  !provenance || typeof provenance !== "object" || Array.isArray(provenance) ||
  Object.keys(provenance).length !== provenanceKeys.length ||
  provenanceKeys.some((key) => !Object.prototype.hasOwnProperty.call(provenance, key))
) {
  throw new Error("Production API build provenance verification failed closed: artifact shape is invalid.");
}

const identityProjection = JSON.stringify({
  schema_version: "p8-8-w09c2f-build-provenance-v1",
  canonical_commit_sha: expectedCommit,
  canonical_tree_sha: expectedTree,
  source_branch: expectedBranch,
});
const expectedFingerprint = createHash("sha256").update(identityProjection).digest("hex");

if (
  provenance.schema_version !== "p8-8-w09c2f-build-provenance-v1" ||
  provenance.canonical_commit_sha !== expectedCommit ||
  provenance.canonical_tree_sha !== expectedTree ||
  provenance.source_branch !== expectedBranch ||
  provenance.provenance_fingerprint !== expectedFingerprint ||
  typeof provenance.generated_at_build !== "string" ||
  Number.isNaN(Date.parse(provenance.generated_at_build))
) {
  throw new Error("Production API build provenance verification failed closed: source identity or fingerprint mismatch.");
}


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
  "AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products",
  "task53_write_scope_post_required",
  "explicit_write_scope_confirmation_required",
  "task53_read_only_resource_resolver_v1",
  "/execution/task53/resolve-resource",
  "resource_resolver_mode",
  "resource_resolver_provider_write_dispatch_enabled",
  "task53_resolver_write_scope_rejected",
  "verified_persistent_single_action_production_apply_v1",
  "task54_persistent_apply_v1",
  "/execution/:id/task54/preflight",
  "/execution/:id/task54/apply",
  "APPLY_AND_VERIFY_TASK54:",
  "production_change_verified_live",
  "task54_bounded_forward_propagation_verification_v1",
  "rollback_on_verification_failure",
  "measurement_handoff_on_verified_live_change",
  "application_auth_rbac_foundation_v1",
  "/auth/google/start",
  "/auth/google/callback",
  "/auth/session",
  "/auth/logout",
  "authentication_required",
  "authentication_configuration_invalid",
  "csrf_validation_failed",
  "seo_engine_session",
  "AUTH_ENFORCEMENT_ENABLED",
  "google_oidc",
  "publicRegistrationEnabled",
  "\"/provenance\"",
  "p8-8-w09c2-h6-r1-serving-provenance-v1",
];


const requiredP122BundleMarkers = [
  "P12_2_LIVE_CRAWL",
  "p12_2_cli_direct_execution_disabled",
  "schedulerEnabled",
  "autonomousWorkerEnabled",
  "publicationAuthorized",
];

const requiredP122SourceMarkers = [
  "src/first-party-crawl-cli.ts",
  "lib/first-party-crawl-manual.ts",
  "lib/first-party-live-adapters.ts",
  "lib/first-party-crawl-persistence.ts",
];

const requiredP122L2BundleMarkers = [
  "p12-2-l2-one-shot-operator-v1",
  "AUTHORIZE:P12_2_L2_ONE_SHOT:",
  "p12_2_l2_operator_authorization_required",
  "p12_2_l2_packet_already_consumed",
  "automaticWholeRunRetry",
  "maxInvocationAttempts",
];

const requiredP122L2SourceMarkers = [
  "lib/p12-2-l2-one-shot-operator-caller.ts",
  "lib/first-party-crawl-manual.ts",
  "lib/first-party-crawl-runtime-bridge.ts",
  "lib/first-party-live-adapters.ts",
];

const requiredP122LiveBundleMarkers = [
  "p12-2-l6-3-live-operator-v1",
  "--execute",
  "--envelope",
  "P12_2_L2_AUTHORIZATION_LITERAL",
  "p12_2_l6_3_authorization_literal_required",
  "p12_2_l2_packet_fingerprint_mismatch",
  "first_party_crawl_l2_invocations",
  "0008_first_party_crawl_l2_invocations.sql",
  "automaticWholeRunRetry",
  "schedulerEnabled",
  "autonomousWorkerEnabled",
  "providerWrites",
  "publicSiteWrites",
];

const requiredP122LiveSourceMarkers = [
  "src/p12-2-live-operator-cli.ts",
  "lib/p12-2-l6-3-live-operator.ts",
  "lib/p12-2-l2-one-shot-operator-caller.ts",
  "lib/p12-2-l2-durable-receipt-store.ts",
  "lib/p12-2-l6-2-incremental-material-binding.ts",
  "lib/first-party-crawl-manual.ts",
];

const requiredSourceMarkers = [
  "routes/execution.ts",
  "routes/connections.ts",
  "routes/task53-write-scope.ts",
  "routes/auth.ts",
  "middlewares/auth-security.ts",
  "lib/auth-foundation.ts",
  "lib/execution-foundation.ts",
  "lib/execution-store.ts",
  "lib/shopify-write-foundation.ts",
  "lib/task52-runtime-self-test.ts",
  "lib/task53-production-pilot.ts",
  "lib/task53-shopify-credential.ts",
  "lib/task53-store-v2.ts",
  "lib/task53-write-scope-authorization.ts",
  "lib/task53-resource-resolver.ts",
  "lib/task54-persistent-apply.ts",
  "routes/provenance.ts",
  "lib/p8-8-w09c2-h6-r1-serving-provenance.ts",
];

const missingBundleMarkers = requiredBundleMarkers.filter((marker) => !bundle.includes(marker));
const missingSourceMarkers = requiredSourceMarkers.filter((marker) => !sourceMap.includes(marker));
const missingP122BundleMarkers = requiredP122BundleMarkers.filter((marker) => !p122Bundle.includes(marker));
const missingP122SourceMarkers = requiredP122SourceMarkers.filter((marker) => !p122SourceMap.includes(marker));
const missingP122L2BundleMarkers = requiredP122L2BundleMarkers.filter((marker) => !p122L2Bundle.includes(marker));
const missingP122L2SourceMarkers = requiredP122L2SourceMarkers.filter((marker) => !p122L2SourceMap.includes(marker));
const missingP122LiveBundleMarkers = requiredP122LiveBundleMarkers.filter((marker) => !p122LiveBundle.includes(marker));
const missingP122LiveSourceMarkers = requiredP122LiveSourceMarkers.filter((marker) => !p122LiveSourceMap.includes(marker));

if (
  missingBundleMarkers.length > 0 ||
  missingSourceMarkers.length > 0 ||
  missingP122BundleMarkers.length > 0 ||
  missingP122SourceMarkers.length > 0 ||
  missingP122L2BundleMarkers.length > 0 ||
  missingP122L2SourceMarkers.length > 0 ||
  missingP122LiveBundleMarkers.length > 0 ||
  missingP122LiveSourceMarkers.length > 0
) {
  const details = [
    missingBundleMarkers.length > 0 ? `bundle markers: ${missingBundleMarkers.join(", ")}` : null,
    missingSourceMarkers.length > 0 ? `source-map markers: ${missingSourceMarkers.join(", ")}` : null,
    missingP122BundleMarkers.length > 0 ? `P12.2 bundle markers: ${missingP122BundleMarkers.join(", ")}` : null,
    missingP122SourceMarkers.length > 0 ? `P12.2 source-map markers: ${missingP122SourceMarkers.join(", ")}` : null,
    missingP122L2BundleMarkers.length > 0 ? `P12.2 L2 bundle markers: ${missingP122L2BundleMarkers.join(", ")}` : null,
    missingP122L2SourceMarkers.length > 0 ? `P12.2 L2 source-map markers: ${missingP122L2SourceMarkers.join(", ")}` : null,
    missingP122LiveBundleMarkers.length > 0 ? `P12.2 live-operator bundle markers: ${missingP122LiveBundleMarkers.join(", ")}` : null,
    missingP122LiveSourceMarkers.length > 0 ? `P12.2 live-operator source-map markers: ${missingP122LiveSourceMarkers.join(", ")}` : null,
  ].filter(Boolean).join("; ");

  throw new Error(`Production API bundle verification failed; stale or incomplete build detected (${details}).`);
}

console.log("Production API bundle verification passed: source provenance identity/fingerprint, Tasks #51–#54 execution safety foundations, Task #55 authentication/RBAC/CSRF security foundation, the default-off P12.2 manual crawl entrypoint, the bounded P12.2 L2 one-shot operator artifact, and the explicit fail-closed P12.2 live one-shot operator executable are present.");

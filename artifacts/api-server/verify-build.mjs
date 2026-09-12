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

console.log("Production API bundle verification passed: Tasks #51–#54 execution safety foundations and Task #55 authentication/RBAC/CSRF security foundation are present.");

import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_FLOW_TTL_MS,
  buildGoogleLoginUrl,
  createAuthFlow,
  loadAuthConfig,
  requiredRoleForApiRequest,
  roleAllows,
  roleForEmail,
  sealAuthFlow,
  unsealAuthFlow,
} from "./auth-foundation.js";

const configuredEnv = {
  AUTH_ENFORCEMENT_ENABLED: "true",
  AUTH_PUBLIC_ORIGIN: "https://dsseoengine.replit.app",
  AUTH_GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
  AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
  AUTH_SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef",
  AUTH_ADMIN_EMAILS: "admin@example.com",
  AUTH_OPERATOR_EMAILS: "operator@example.com",
  AUTH_VIEWER_EMAILS: "viewer@example.com",
};

test("auth configuration defaults disabled and fails closed when enabled without secrets", () => {
  const disabled = loadAuthConfig({});
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.configured, false);
  assert.ok(disabled.issues.length >= 4);

  const enabled = loadAuthConfig({ AUTH_ENFORCEMENT_ENABLED: "true" });
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.configured, false);
  assert.ok(enabled.issues.includes("AUTH_SESSION_SECRET_missing_or_too_short"));
});

test("configured auth uses exact HTTPS origin and invite-only role allowlists", () => {
  const config = loadAuthConfig(configuredEnv);
  assert.equal(config.enabled, true);
  assert.equal(config.configured, true);
  assert.equal(config.publicOrigin, "https://dsseoengine.replit.app");
  assert.equal(roleForEmail("ADMIN@example.com", config), "admin");
  assert.equal(roleForEmail("operator@example.com", config), "operator");
  assert.equal(roleForEmail("viewer@example.com", config), "viewer");
  assert.equal(roleForEmail("outsider@example.com", config), null);
});

test("role hierarchy and route requirements are deterministic", () => {
  assert.equal(roleAllows("admin", "operator"), true);
  assert.equal(roleAllows("operator", "viewer"), true);
  assert.equal(roleAllows("viewer", "operator"), false);
  assert.equal(requiredRoleForApiRequest("GET", "/dashboard"), "viewer");
  assert.equal(requiredRoleForApiRequest("POST", "/approvals/abc/decision"), "operator");
  assert.equal(requiredRoleForApiRequest("POST", "/execution/abc/task54/preflight"), "operator");
  assert.equal(requiredRoleForApiRequest("POST", "/execution/abc/task54/apply"), "admin");
});

test("auth flow is signed, bounded, return-path constrained, and tamper evident", () => {
  const secret = configuredEnv.AUTH_SESSION_SECRET;
  const now = Date.UTC(2026, 8, 12, 16, 0, 0);
  const flow = createAuthFlow("/actions", now);
  assert.equal(flow.returnTo, "/actions");
  assert.equal(flow.expiresAt - flow.issuedAt, AUTH_FLOW_TTL_MS);
  const sealed = sealAuthFlow(flow, secret);
  assert.deepEqual(unsealAuthFlow(sealed, secret, now + 1_000), flow);
  assert.equal(unsealAuthFlow(`${sealed}x`, secret, now + 1_000), null);
  assert.equal(unsealAuthFlow(sealed, secret, flow.expiresAt + 1), null);
  assert.equal(createAuthFlow("//evil.example", now).returnTo, "/");
});

test("Google login URL is exact-origin OIDC authorization-code with PKCE and nonce", () => {
  const config = loadAuthConfig(configuredEnv);
  const flow = createAuthFlow("/", Date.UTC(2026, 8, 12, 16, 0, 0));
  const url = new URL(buildGoogleLoginUrl(config, flow));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), "https://dsseoengine.replit.app/api/auth/google/callback");
  assert.equal(url.searchParams.get("state"), flow.state);
  assert.equal(url.searchParams.get("nonce"), flow.nonce);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok((url.searchParams.get("code_challenge") ?? "").length > 30);
});

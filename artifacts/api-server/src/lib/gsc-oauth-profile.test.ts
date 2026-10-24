import assert from "node:assert/strict";
import test from "node:test";
import type { GoogleOAuthConfig, TokenBundle } from "@seo-engine/oauth-connection-manager";
import {
  GSC_READONLY_SCOPE,
  createGscReadonlyState,
  type GscDiscoveryResult,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  runGscReadonlyCallback,
  type GscReadonlyCallbackInput,
  type GscReadonlyRuntimeDependencies,
} from "./gsc-oauth-profile.js";

const config: GoogleOAuthConfig = {
  clientId: "synthetic-gsc-client.apps.googleusercontent.com",
  clientSecret: "synthetic-secret-not-real",
  redirectUri: "https://example.test/api/connections/google/callback",
};

const bundle: TokenBundle = {
  accessToken: "synthetic-not-real",
  refreshToken: "synthetic-not-real",
  expiresAt: "2030-01-01T00:00:00.000Z",
  scopes: [GSC_READONLY_SCOPE],
  tokenType: "Bearer",
};

const discovered: GscDiscoveryResult = {
  properties: [{ siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteFullUser", task71Supported: true, permissionAccepted: true }],
  status: { ok: true, category: "ok", httpStatus: 200 },
};

function fixture(inputOverrides: Partial<GscReadonlyCallbackInput> = {}) {
  const state = createGscReadonlyState();
  return {
    state,
    receivedState: state.state,
    code: "synthetic-auth-code",
    config,
    ...inputOverrides,
  };
}

function probe() {
  const calls: string[] = [];
  const deps: GscReadonlyRuntimeDependencies = {
    exchangeCode: async () => { calls.push("exchange"); return bundle; },
    discover: async () => { calls.push("sites.list"); return discovered; },
    persist: async () => { calls.push("credential_write"); },
  };
  return { deps, calls };
}

test("retired combined GSC callback never invokes token exchange, discovery or persistence", async () => {
  const { deps, calls } = probe();
  await assert.rejects(
    runGscReadonlyCallback(fixture(), deps),
    /gsc_oauth_combined_callback_retired_separate_grants_required/,
  );
  assert.deepEqual(calls, []);
});

test("even valid-looking provider data never grants a combined transition", async () => {
  const { deps, calls } = probe();
  await assert.rejects(runGscReadonlyCallback(fixture(), deps), /combined_callback_retired/);
  assert.equal(bundle.scopes.length, 1);
  assert.equal(discovered.status.ok, true);
  assert.deepEqual(calls, []);
});

test("wrong state, missing code, widened scopes and provider failure cannot trigger any stage", async () => {
  for (const overrides of [
    { receivedState: "synthetic-mismatch" },
    { code: "" },
    { code: "synthetic-code-replay" },
  ]) {
    const { deps, calls } = probe();
    await assert.rejects(runGscReadonlyCallback(fixture(overrides), deps), /combined_callback_retired/);
    assert.deepEqual(calls, []);
  }
  const calls: string[] = [];
  const dependencies: GscReadonlyRuntimeDependencies = {
    exchangeCode: async () => { calls.push("exchange"); return { ...bundle, scopes: [GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"] }; },
    discover: async () => { calls.push("sites.list"); throw new Error("provider_error"); },
    persist: async () => { calls.push("credential_write"); throw new Error("db_error"); },
  };
  await assert.rejects(runGscReadonlyCallback(fixture(), dependencies), /combined_callback_retired/);
  assert.deepEqual(calls, []);
});

test("retirement rejection does not expose synthetic codes, credentials or tokens", async () => {
  const { deps } = probe();
  await assert.rejects(runGscReadonlyCallback(fixture(), deps), (err: unknown) => {
    assert.ok(err instanceof Error);
    assert.equal(err.message, "gsc_oauth_combined_callback_retired_separate_grants_required");
    assert.doesNotMatch(err.message, /synthetic-auth-code|synthetic-secret-not-real|synthetic-not-real/);
    return true;
  });
});

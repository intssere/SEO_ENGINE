import assert from "node:assert/strict";
import test from "node:test";
import type { GoogleOAuthConfig, TokenBundle } from "@seo-engine/oauth-connection-manager";
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  GSC_READONLY_SCOPE,
  createGscReadonlyState,
  type GscDiscoveryResult,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { runGscReadonlyCallback, type GscReadonlyPersistenceInput } from "./gsc-oauth-profile.js";

const config: GoogleOAuthConfig = {
  clientId: "fake-gsc-client.apps.googleusercontent.com",
  clientSecret: "fake-secret-not-real",
  redirectUri: "https://example.test/api/connections/google/callback",
};

function exactBundle(scopes: string[] = [GSC_READONLY_SCOPE]): TokenBundle {
  return {
    accessToken: "fake-access-token",
    refreshToken: "fake-refresh-token",
    expiresAt: "2030-01-01T00:00:00.000Z",
    scopes,
    tokenType: "Bearer",
  };
}

function discovery(): GscDiscoveryResult {
  return {
    properties: [
      {
        siteUrl: "sc-domain:diamondshelf.us",
        permissionLevel: "siteFullUser",
        task71Supported: true,
        permissionAccepted: true,
      },
    ],
    status: { ok: true, category: "ok", httpStatus: 200 },
  };
}

test("GSC callback orchestration keeps exact profile identity and uses only injected dependencies", async () => {
  const state = createGscReadonlyState({ now: new Date("2026-09-15T00:00:00.000Z") });
  const calls: string[] = [];
  const persisted: GscReadonlyPersistenceInput[] = [];

  const result = await runGscReadonlyCallback(
    { state, receivedState: state.state, code: "fake-code", config },
    {
      exchangeCode: async (_config, code, receivedState) => {
        calls.push("exchange");
        assert.equal(code, "fake-code");
        assert.equal(receivedState.purpose, GSC_READONLY_PROFILE);
        return exactBundle();
      },
      discover: async (bundle) => {
        calls.push("discover");
        assert.deepEqual(bundle.scopes, [GSC_READONLY_SCOPE]);
        return discovery();
      },
      persist: async (input) => {
        calls.push("persist");
        persisted.push(input);
      },
    },
  );

  assert.deepEqual(calls, ["exchange", "discover", "persist"]);
  assert.equal(result.profile, GSC_READONLY_PROFILE);
  assert.equal(result.externalAccountId, GSC_READONLY_EXTERNAL_ACCOUNT_ID);
  assert.equal(result.propertyCount, 1);
  assert.equal(persisted.length, 1);
  const saved = persisted[0];
  assert.ok(saved);
  assert.equal(saved.provider, "google");
  assert.equal(saved.externalAccountId, GSC_READONLY_EXTERNAL_ACCOUNT_ID);
  assert.equal(saved.status, "pending");
  assert.equal(saved.metadata.externalAccountId, GSC_READONLY_EXTERNAL_ACCOUNT_ID);
  assert.equal(saved.metadata.oauthPurpose, GSC_READONLY_PROFILE);
  assert.equal("accessToken" in saved.metadata, false);
  assert.equal("refreshToken" in saved.metadata, false);
});

test("GSC callback rejects Analytics or any extra granted scope before discovery or persistence", async () => {
  const state = createGscReadonlyState();
  let discoveryCalled = false;
  let persistenceCalled = false;

  await assert.rejects(
    runGscReadonlyCallback(
      { state, receivedState: state.state, code: "fake-code", config },
      {
        exchangeCode: async () => exactBundle([
          GSC_READONLY_SCOPE,
          "https://www.googleapis.com/auth/analytics.readonly",
        ]),
        discover: async () => {
          discoveryCalled = true;
          return discovery();
        },
        persist: async () => {
          persistenceCalled = true;
        },
      },
    ),
    /gsc_oauth_scope_mismatch/,
  );

  assert.equal(discoveryCalled, false);
  assert.equal(persistenceCalled, false);
});

test("GSC callback validates signed-purpose state before token exchange", async () => {
  const state = createGscReadonlyState({ now: new Date("2026-09-15T00:00:00.000Z") });
  let exchangeCalled = false;

  await assert.rejects(
    runGscReadonlyCallback(
      { state, receivedState: "wrong-state", code: "fake-code", config },
      {
        exchangeCode: async () => {
          exchangeCalled = true;
          return exactBundle();
        },
        discover: async () => discovery(),
        persist: async () => undefined,
      },
    ),
    /OAuth state mismatch/,
  );

  assert.equal(exchangeCalled, false);
});

test("GSC callback stops on GSC discovery failure and never persists", async () => {
  const state = createGscReadonlyState();
  let persistenceCalled = false;

  await assert.rejects(
    runGscReadonlyCallback(
      { state, receivedState: state.state, code: "fake-code", config },
      {
        exchangeCode: async () => exactBundle(),
        discover: async () => ({
          properties: [],
          status: { ok: false, category: "provider_error", httpStatus: 403 },
        }),
        persist: async () => {
          persistenceCalled = true;
        },
      },
    ),
    /gsc_oauth_discovery_failed:provider_error/,
  );

  assert.equal(persistenceCalled, false);
});

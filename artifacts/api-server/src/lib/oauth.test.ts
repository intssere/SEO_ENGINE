import assert from "node:assert/strict";
import test from "node:test";
import { createOAuthState } from "@seo-engine/oauth-connection-manager";
import {
  GSC_READONLY_PROFILE,
  createGscReadonlyState,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  asGscReadonlyState,
  classifyGoogleOAuthState,
  isGoogleSelectionDiscovered,
  isGscReadonlyOAuthRuntimeEnabled,
} from "./oauth.js";

const metadata = {
  discoveredSearchConsoleProperties: [
    { siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteOwner" },
  ],
  discoveredGa4Properties: [
    { propertyId: "123456", displayName: "Diamond Shelf" },
  ],
};

test("Google property confirmation accepts the exact discovered resources", () => {
  assert.equal(isGoogleSelectionDiscovered(metadata, "sc-domain:diamondshelf.us", "123456"), true);
});

test("Google property confirmation normalizes only the trailing slash for discovered site URLs", () => {
  assert.equal(isGoogleSelectionDiscovered(metadata, "sc-domain:diamondshelf.us/", "123456"), true);
});

test("Google property confirmation rejects resources that were not discovered", () => {
  assert.equal(isGoogleSelectionDiscovered(metadata, "https://other.example", "123456"), false);
  assert.equal(isGoogleSelectionDiscovered(metadata, "sc-domain:diamondshelf.us", "999999"), false);
});

test("Task #75 GSC runtime gate is exact-true and default-off", () => {
  assert.equal(isGscReadonlyOAuthRuntimeEnabled({}), false);
  assert.equal(isGscReadonlyOAuthRuntimeEnabled({ GSC_READONLY_OAUTH_RUNTIME_ENABLED: "false" }), false);
  assert.equal(isGscReadonlyOAuthRuntimeEnabled({ GSC_READONLY_OAUTH_RUNTIME_ENABLED: "1" }), false);
  assert.equal(isGscReadonlyOAuthRuntimeEnabled({ GSC_READONLY_OAUTH_RUNTIME_ENABLED: " true " }), true);
});

test("Google OAuth state dispatch isolates legacy and GSC profiles", () => {
  const legacy = createOAuthState("google");
  const gsc = createGscReadonlyState();
  assert.equal(classifyGoogleOAuthState(legacy), "legacy");
  assert.equal(classifyGoogleOAuthState(gsc), GSC_READONLY_PROFILE);
  assert.equal(asGscReadonlyState(gsc).purpose, GSC_READONLY_PROFILE);
});

test("unknown Google OAuth purpose fails closed before any runtime branch can be selected", () => {
  const state = {
    ...createOAuthState("google"),
    purpose: "unexpected_google_profile",
  };
  assert.throws(() => classifyGoogleOAuthState(state), /google_oauth_purpose_unknown/);
});

test("legacy Google state cannot be coerced into the GSC profile", () => {
  const legacy = createOAuthState("google");
  assert.throws(() => asGscReadonlyState(legacy), /gsc_oauth_purpose_required/);
});

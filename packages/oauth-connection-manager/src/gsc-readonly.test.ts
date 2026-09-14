import test from "node:test";
import assert from "node:assert/strict";
import { encryptTokenBundle } from "./index.js";
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  GSC_READONLY_SCOPE,
  assessGscReadonlyReadiness,
  assertGscReadonlyState,
  buildGscReadonlyAuthorizationUrl,
  buildGscReadonlyConnectionMetadata,
  createGscReadonlyState,
  discoverGscProperties,
  GscDiscoveryTransportError,
  hasExactGscReadonlyScope,
  isDiscoveredGscSelection,
  normalizeGscSitesListResponse,
} from "./gsc-readonly.js";

const now = new Date("2026-09-14T16:00:00Z");

test("GSC profile requests exactly webmasters.readonly and retains PKCE", () => {
  const state = createGscReadonlyState({ now });
  const url = new URL(buildGscReadonlyAuthorizationUrl({ clientId: "id", clientSecret: "unused", redirectUri: "https://app.example/api/connections/google/gsc/callback" }, state));
  assert.equal(state.purpose, GSC_READONLY_PROFILE);
  assert.equal(url.searchParams.get("scope"), GSC_READONLY_SCOPE);
  assert.equal(url.searchParams.get("include_granted_scopes"), "false");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("code_challenge"));
  assert.doesNotMatch(url.toString(), /analytics\.readonly/);
});

test("GSC state fails closed on mismatch, expiry, or wrong purpose", () => {
  const state = createGscReadonlyState({ now, ttlSeconds: 600 });
  assert.doesNotThrow(() => assertGscReadonlyState(state, state.state, new Date("2026-09-14T16:05:00Z")));
  assert.throws(() => assertGscReadonlyState(state, "wrong", now));
  assert.throws(() => assertGscReadonlyState({ ...state, purpose: "wrong" as typeof GSC_READONLY_PROFILE }, state.state, now));
  assert.throws(() => assertGscReadonlyState(state, state.state, new Date("2026-09-14T16:10:00Z")));
});

test("exact GSC scope rejects analytics or arbitrary extras", () => {
  assert.equal(hasExactGscReadonlyScope([GSC_READONLY_SCOPE]), true);
  assert.equal(hasExactGscReadonlyScope([GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"]), false);
  assert.equal(hasExactGscReadonlyScope([GSC_READONLY_SCOPE, "extra"]), false);
  assert.equal(hasExactGscReadonlyScope([]), false);
});

test("GSC discovery is bounded, deterministic, and retains no unknown fields", () => {
  const rows = normalizeGscSitesListResponse({ siteEntry: [
    { siteUrl: "https://diamondshelf.us/", permissionLevel: "siteFullUser" },
    { siteUrl: "sc-domain:DiamondShelf.us", permissionLevel: "siteRestrictedUser" },
  ] });
  assert.deepEqual(rows.map((row) => row.siteUrl), ["https://diamondshelf.us/", "sc-domain:diamondshelf.us"]);
  assert.equal(rows[0]!.task71Supported, false);
  assert.equal(rows[1]!.task71Supported, true);
  assert.equal(rows[1]!.permissionAccepted, true);
  assert.throws(() => normalizeGscSitesListResponse({ siteEntry: [{ siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteRestrictedUser", token: "secret" }] }));
});

test("GSC profile discovery invokes only injected Search Console transport", async () => {
  let calls = 0;
  const result = await discoverGscProperties({ listSites: async () => { calls += 1; return { siteEntry: [{ siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteRestrictedUser" }] }; } });
  assert.equal(calls, 1);
  assert.equal(result.status.ok, true);
  assert.equal(result.properties.length, 1);
  const failure = await discoverGscProperties({ listSites: async () => { throw new GscDiscoveryTransportError("provider_error", 403); } });
  assert.deepEqual(failure.status, { ok: false, category: "provider_error", httpStatus: 403 });
});

test("property selection is discovery-bound, Task71-bound, and permission-bound", () => {
  const discovered = normalizeGscSitesListResponse({ siteEntry: [
    { siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteRestrictedUser" },
    { siteUrl: "sc-domain:owner.example", permissionLevel: "siteOwner" },
    { siteUrl: "https://diamondshelf.us/", permissionLevel: "siteFullUser" },
  ] });
  assert.equal(isDiscoveredGscSelection(discovered, "sc-domain:diamondshelf.us"), true);
  assert.equal(isDiscoveredGscSelection(discovered, "sc-domain:invented.example"), false);
  assert.equal(isDiscoveredGscSelection(discovered, "sc-domain:owner.example"), false);
  assert.equal(isDiscoveredGscSelection(discovered, "https://diamondshelf.us/"), false);
});

test("readiness requires provider OAuth, exact scope and verified selected property", () => {
  const properties = normalizeGscSitesListResponse({ siteEntry: [{ siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteRestrictedUser" }] });
  const ready = assessGscReadonlyReadiness({ configured: true, credentialReady: true, credentialSource: "provider_oauth", grantedScopes: [GSC_READONLY_SCOPE], discoveredProperties: properties, selectedProperty: "sc-domain:diamondshelf.us", networkReady: true });
  assert.equal(ready.credentialReady, true);
  assert.equal(ready.scopeReady, true);
  assert.equal(ready.selectedPropertyReady, true);
  assert.equal(ready.task70ExecutionEnabled, false);
  assert.equal(ready.liveReadAuthorized, false);
  const oidc = assessGscReadonlyReadiness({ credentialReady: true, credentialSource: "app_oidc", grantedScopes: [GSC_READONLY_SCOPE], discoveredProperties: properties, selectedProperty: "sc-domain:diamondshelf.us" });
  assert.equal(oidc.credentialReady, false);
});

test("GSC connection identity coexists with generic Google and metadata is secret-free", () => {
  assert.notEqual(GSC_READONLY_EXTERNAL_ACCOUNT_ID, "google");
  const bundle = { accessToken: "access-secret", refreshToken: "refresh-secret", expiresAt: null, scopes: [GSC_READONLY_SCOPE], tokenType: "Bearer" };
  const properties = normalizeGscSitesListResponse({ siteEntry: [{ siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteRestrictedUser" }] });
  const metadata = buildGscReadonlyConnectionMetadata(bundle, properties, "sc-domain:diamondshelf.us");
  assert.equal(metadata.oauthPurpose, GSC_READONLY_PROFILE);
  assert.equal(metadata.externalAccountId, GSC_READONLY_EXTERNAL_ACCOUNT_ID);
  assert.doesNotMatch(JSON.stringify(metadata), /access-secret|refresh-secret/);
  const envelope = encryptTokenBundle(bundle, Buffer.alloc(32, 4).toString("base64"));
  assert.doesNotMatch(JSON.stringify(envelope), /access-secret|refresh-secret/);
});

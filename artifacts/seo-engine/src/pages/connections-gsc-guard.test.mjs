// PILOT-01 offline-only source contract; no network, OAuth requests or runtime imports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("./connections.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../../api-server/src/routes/connections.ts", import.meta.url), "utf8");
const oauth = readFileSync(new URL("../../../api-server/src/lib/oauth.ts", import.meta.url), "utf8");

function routeBody(routeStart, nextRouteStart) {
  const start = server.indexOf(routeStart);
  assert.notEqual(start, -1, `missing route ${routeStart}`);
  const next = server.indexOf(nextRouteStart, start + routeStart.length);
  assert.ok(next > start, `missing next route ${nextRouteStart}`);
  return server.slice(start, next);
}

test("UI cannot start legacy combined-scope Google OAuth", () => {
  assert.doesNotMatch(ui, /href=["']\/api\/connections\/google\/start["']/);
  const links = [...ui.matchAll(/href="(\/api\/connections\/google[^"]+)"/g)].map((match) => match[1]);
  assert.equal(links.length, 2);
  assert.ok(links.every((url) => url === "/api/connections/google/gsc-readonly/start"));
});

test("UI requires explicit true readiness on both independent fields, with write gate", () => {
  assert.match(ui, /gscReadonlyRuntime\?\.enabled === true && status\?\.gscReadonlyRuntime\?\.liveTransportBound === true && !oauthDisabled/);
  assert.match(ui, /\{gscConsentReady && \(/);
  assert.match(ui, /\{!gscConsentReady \? \(/);
  assert.match(ui, /Google Search Console authorization is unavailable until the dedicated read-only transport is certified/);
  assert.match(ui, /Google Search Console reauthorization is blocked until dedicated read-only transport certification/);
});

test("GSC server must advertise transport as unbound and refuse direct start before URL creation", () => {
  assert.match(server, /const gscReadonlyLiveTransportBound = false;/);
  assert.match(server, /liveTransportBound: gscReadonlyLiveTransportBound/);
  const body = routeBody('router.get("/connections/google/gsc-readonly/start"', 'router.get("/connections/google/start"');
  const gate = body.indexOf("if (!gscReadonlyLiveTransportBound)");
  const start = body.indexOf("startGscReadonlyUrl()");
  assert.ok(gate >= 0 && start > gate, "unbound transport must be checked before consent URL is built");
});

test("legacy combined-scope server endpoint requires independent default-off gate before consent URL", () => {
  assert.match(oauth, /LEGACY_GOOGLE_OAUTH_CONSENT_GATE = "LEGACY_GOOGLE_OAUTH_CONSENT_ENABLED"/);
  assert.match(oauth, /env\[LEGACY_GOOGLE_OAUTH_CONSENT_GATE\]\?\.trim\(\)\.toLowerCase\(\) === "true"/);
  const body = routeBody('router.get("/connections/google/start"', 'router.get("/connections/shopify/callback"');
  const gate = body.indexOf("if (!isLegacyGoogleOAuthConsentEnabled())");
  const start = body.indexOf('startUrl("google")');
  assert.ok(gate >= 0 && start > gate, "legacy consent gate must precede the redirect");
});

test("legacy callback denies already-issued cookies before provider exchange", () => {
  const callback = routeBody('router.get("/connections/google/callback"', 'router.post("/connections/google/select"');
  const purposeDispatch = callback.indexOf("classifyGoogleOAuthState(state)");
  const gscBranch = callback.indexOf("if (purpose === GSC_READONLY_PROFILE)");
  const legacyGate = callback.indexOf("if (!isLegacyGoogleOAuthConsentEnabled())");
  const exchange = callback.indexOf("exchangeGoogleCode(");
  assert.ok(purposeDispatch >= 0 && gscBranch > purposeDispatch && legacyGate > gscBranch && exchange > legacyGate);
  assert.match(callback, /gsc_oauth_live_transport_not_bound_task75/);
});

test("existing connection display and selection paths remain present", () => {
  assert.match(ui, /status\?\.google\.connected/);
  assert.match(ui, /action="\/api\/connections\/google\/select"/);
  assert.match(server, /router\.post\("\/connections\/google\/select"/);
});

// PILOT-01 offline-only source regression: no OAuth requests or runtime imports.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source = readFileSync(new URL("./connections.tsx",import.meta.url),"utf8");
test("Connections UI does not link to legacy Google OAuth start",()=>{
  assert.doesNotMatch(source,/href=["']\/api\/connections\/google\/start["']/);
});
test("GSC consent requires server-confirmed enabled and live transport",()=>{
  assert.match(source,/gscReadonlyRuntime\?\.enabled === true/);
  assert.match(source,/gscReadonlyRuntime\?\.liveTransportBound === true/);
  assert.match(source,/&& !oauthDisabled/);
});
test("Google authorization and reauthorization only use purpose-isolated route",()=>{
  const links=[...source.matchAll(/href="(\/api\/connections\/google[^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.length >= 2);
  assert.ok(links.every(x=>x==="/api/connections/google/gsc-readonly/start"));
  assert.match(source,/\{gscConsentReady && \(/);
  assert.match(source,/\{!gscConsentReady \? \(/);
});
test("unbound GSC transport has visible disabled consent explanation",()=>{
  assert.match(source,/Google Search Console authorization is unavailable until the dedicated read-only transport is certified/);
  assert.match(source,/Google Search Console reauthorization is blocked until dedicated read-only transport certification/);
});

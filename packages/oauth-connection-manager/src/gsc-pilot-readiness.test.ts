import test from "node:test";
import assert from "node:assert/strict";
import {
  assessGscReadonlyReadiness,
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  GSC_READONLY_SCOPE,
} from "./gsc-readonly.js";
import {
  GSC_FIRST_LIVE_READ_PURPOSE,
  GSC_PILOT_PROVIDER_INTERACTION_PLAN,
  assessGscPilotReadiness,
  buildGscPilotPacket,
  isGscPilotPacketValid,
} from "./gsc-pilot-readiness.js";

const issuedAt = "2026-09-14T16:00:00.000Z";
const expiresAt = "2026-09-14T16:20:00.000Z";

function validInput() {
  return {
    environment: "production" as const,
    oauth: {
      googleProjectId: "seo-engine-prod",
      oauthClientId: "1234567890-example.apps.googleusercontent.com",
      redirectUri: "https://dsseoengine.replit.app/api/oauth/google/gsc/callback",
      allowedRedirectUris: ["https://dsseoengine.replit.app/api/oauth/google/gsc/callback"],
      consentMode: "production" as const,
    },
    profile: GSC_READONLY_PROFILE,
    externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
    scopes: [GSC_READONLY_SCOPE],
    selectedProperty: "sc-domain:diamondshelf.us",
    permissionLevel: "siteRestrictedUser",
    lineage: {
      task67RefreshPlanFingerprint: "refresh-fingerprint",
      task68AdapterRequestFingerprint: "adapter-fingerprint",
      task69JobId: "job-123",
      task69JobFingerprint: "job-fingerprint",
    },
    issuedAt,
    expiresAt,
  };
}

function fullyReadyTask72() {
  return assessGscReadonlyReadiness({
    configured: true,
    credentialReady: true,
    credentialSource: "provider_oauth",
    grantedScopes: [GSC_READONLY_SCOPE],
    discoveredProperties: [{
      siteUrl: "sc-domain:diamondshelf.us",
      permissionLevel: "siteRestrictedUser",
      task71Supported: true,
      permissionAccepted: true,
    }],
    selectedProperty: "sc-domain:diamondshelf.us",
    networkReady: true,
    task70ExecutionEnabled: true,
    liveReadAuthorized: true,
  });
}

test("builds a deterministic bounded packet with exact GSC readonly identity", () => {
  const first = buildGscPilotPacket(validInput());
  const second = buildGscPilotPacket(validInput());
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.purpose, GSC_FIRST_LIVE_READ_PURPOSE);
  assert.equal(first.provider.profile, GSC_READONLY_PROFILE);
  assert.equal(first.provider.externalAccountId, GSC_READONLY_EXTERNAL_ACCOUNT_ID);
  assert.deepEqual(first.provider.scopes, [GSC_READONLY_SCOPE]);
  assert.equal(first.provider.selectedProperty, "sc-domain:diamondshelf.us");
  assert.equal(first.queryPolicy.dateRangeDays, 7);
  assert.deepEqual(first.queryPolicy.dimensions, ["query"]);
  assert.equal(first.queryPolicy.rowLimit, 5000);
  assert.equal(first.queryPolicy.maxPages, 2);
  assert.equal(first.queryPolicy.retriesAllowed, false);
  assert.equal(first.queryPolicy.providerWriteAllowed, false);
  assert.equal(first.queryPolicy.dimensionalResultSemantics, "partial");
  assert.equal(isGscPilotPacketValid(first, new Date("2026-09-14T16:10:00.000Z")), true);
});

test("fails closed on broader scope, wrong profile, unsupported property, or unaccepted permission", () => {
  assert.throws(() => buildGscPilotPacket({ ...validInput(), scopes: [GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"] }), /gsc_scope_mismatch/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), profile: "google_generic" }), /gsc_profile_mismatch/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), selectedProperty: "https://diamondshelf.us/" }), /unsupported_gsc_property/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), permissionLevel: "siteOwner" }), /gsc_permission_not_accepted/);
});

test("production packet requires an exact allowlisted HTTPS non-local redirect and production consent mode", () => {
  assert.throws(() => buildGscPilotPacket({
    ...validInput(),
    oauth: { ...validInput().oauth, redirectUri: "https://other.example/callback" },
  }), /redirect_uri_not_allowlisted/);
  assert.throws(() => buildGscPilotPacket({
    ...validInput(),
    oauth: {
      ...validInput().oauth,
      redirectUri: "http://localhost:3000/callback",
      allowedRedirectUris: ["http://localhost:3000/callback"],
    },
  }), /production_redirect_requires_https/);
  assert.throws(() => buildGscPilotPacket({
    ...validInput(),
    oauth: { ...validInput().oauth, consentMode: "testing" },
  }), /production_requires_production_consent_mode/);
});

test("enforces bounded TTL and Task #71 query limits", () => {
  assert.throws(() => buildGscPilotPacket({ ...validInput(), expiresAt: "2026-09-14T17:00:00.000Z" }), /pilot_ttl_exceeds_limit/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), dateRangeDays: 32 }), /invalid_pilot_date_range/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), rowLimit: 5001 }), /invalid_pilot_row_limit/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), maxPages: 3 }), /invalid_pilot_page_limit/);
  assert.throws(() => buildGscPilotPacket({ ...validInput(), dimensions: ["page"] }), /pilot_query_dimension_required/);
});

test("packet fingerprint detects tampering and expiry", () => {
  const packet = buildGscPilotPacket(validInput());
  assert.equal(isGscPilotPacketValid({ ...packet, oauth: { ...packet.oauth, googleProjectId: "tampered" } }, new Date("2026-09-14T16:10:00.000Z")), false);
  assert.equal(isGscPilotPacketValid(packet, new Date("2026-09-14T16:21:00.000Z")), false);
});

test("live readiness requires every independent lineage, Task #70, and exact live-read authorization gate", () => {
  const packet = buildGscPilotPacket(validInput());
  const base = {
    task72: fullyReadyTask72(),
    packet,
    freshTask67Lineage: true,
    freshTask68Lineage: true,
    freshTask69Lineage: true,
    exactTask69AuthorizationPresent: true,
    task70ExecutionGateReady: true,
    exactFirstLiveReadAuthorizationPresent: true,
    conflictingWriteOrAutonomyGateOpen: false,
  };
  assert.equal(assessGscPilotReadiness(base).livePilotReady, true);
  assert.equal(assessGscPilotReadiness({ ...base, exactFirstLiveReadAuthorizationPresent: false }).livePilotReady, false);
  assert.equal(assessGscPilotReadiness({ ...base, exactTask69AuthorizationPresent: false }).livePilotReady, false);
  assert.equal(assessGscPilotReadiness({ ...base, freshTask67Lineage: false }).livePilotReady, false);
  assert.equal(assessGscPilotReadiness({ ...base, task70ExecutionGateReady: false }).livePilotReady, false);
  assert.equal(assessGscPilotReadiness({ ...base, conflictingWriteOrAutonomyGateOpen: true }).livePilotReady, false);
});

test("default readiness is closed and exposes no mutation/autonomy permission", () => {
  const readiness = assessGscPilotReadiness({ task72: assessGscReadonlyReadiness() });
  assert.equal(readiness.livePilotReady, false);
  assert.equal(readiness.packetPresent, false);
  assert.equal(readiness.providerWrites, false);
  assert.equal(readiness.publicSiteWrites, false);
  assert.equal(readiness.observationPersistenceAuthorized, false);
  assert.equal(readiness.evidencePersistenceAuthorized, false);
  assert.equal(readiness.schedulerEnabled, false);
  assert.equal(readiness.batchExecutorEnabled, false);
  assert.equal(readiness.autonomousWorkerEnabled, false);
  assert.equal(readiness.retryLoopEnabled, false);
});

test("provider interaction plan keeps every real interaction as a separate stage", () => {
  assert.deepEqual(GSC_PILOT_PROVIDER_INTERACTION_PLAN, [
    "oauth_client_config_binding",
    "google_oauth_consent",
    "gsc_sites_list_discovery",
    "gsc_property_selection_binding",
    "task70_gate_deployment",
    "task69_exact_job_authorization",
    "gsc_first_search_analytics_read",
    "observation_evidence_persistence",
  ]);
});

test("pilot packet is metadata-only and contains no secret/token fields", () => {
  const serialized = JSON.stringify(buildGscPilotPacket(validInput())).toLowerCase();
  assert.equal(serialized.includes("client_secret"), false);
  assert.equal(serialized.includes("access_token"), false);
  assert.equal(serialized.includes("refresh_token"), false);
  assert.equal(serialized.includes("authorization"), false);
});

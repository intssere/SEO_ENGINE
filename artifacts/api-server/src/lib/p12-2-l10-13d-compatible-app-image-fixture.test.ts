import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT,
  P12_2_L10_13D_CURRENT_PRODUCTION_IMAGE,
  P12_2_L10_13D_HEALTHCHECK_PATH,
  P12_2_L10_13D_RELEASE_IMAGE,
  p122L1013DFixtureAuthorizationLiteral,
  p122L1013DFixturePacketFingerprint,
  validateP122L1013DLiveSnapshot,
} from "./p12-2-l10-13d-compatible-app-image-fixture.js";

test("L10.13D fixture packet binds the exact newly released image and current Production image", () => {
  assert.equal(
    P12_2_L10_13D_RELEASE_IMAGE,
    "ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2",
  );
  assert.equal(
    P12_2_L10_13D_CURRENT_PRODUCTION_IMAGE,
    "ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283",
  );
  assert.equal(P12_2_L10_13D_HEALTHCHECK_PATH, "/api/healthz");
});

test("L10.13D certified snapshot yields one deterministic fixture authorization", () => {
  const result = validateP122L1013DLiveSnapshot(P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT);
  assert.equal(result.result, "ready_for_fixture_authorization");
  if (result.result !== "ready_for_fixture_authorization") return;
  assert.match(result.packetFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(
    result.packetFingerprint,
    p122L1013DFixturePacketFingerprint(P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT),
  );
  assert.equal(
    result.authorizationLiteral,
    p122L1013DFixtureAuthorizationLiteral(P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT),
  );
  assert.match(
    result.authorizationLiteral,
    /^AUTHORIZE:P12_2_L10_13D_APP_IMAGE_FIXTURE:[0-9a-f]{64}$/,
  );
});

test("L10.13D fails closed if fixture is not empty", () => {
  const result = validateP122L1013DLiveSnapshot({
    ...P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT,
    fixtureServiceCount: 1,
  });
  assert.deepEqual(result, { result: "fail_closed", code: "fixture_not_empty" });
});

test("L10.13D fails closed if Production source moved before fixture execution", () => {
  const result = validateP122L1013DLiveSnapshot({
    ...P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT,
    currentProductionImage: P12_2_L10_13D_RELEASE_IMAGE,
  });
  assert.deepEqual(result, { result: "fail_closed", code: "production_snapshot_mismatch" });
});

test("L10.13D packet never grants Production transition authority", () => {
  const result = validateP122L1013DLiveSnapshot({
    ...P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT,
    productionTransitionAuthorized: true,
  });
  assert.deepEqual(result, { result: "fail_closed", code: "fixture_boundary_mismatch" });
});

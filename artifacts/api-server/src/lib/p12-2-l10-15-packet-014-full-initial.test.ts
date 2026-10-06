import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_PACKET,
  P12_2_L10_15_RUN_ID,
  buildP122L1015Packet,
  p122L1015AuthorizationLiteral,
  p122L1015Capability,
  p122L1015ManualConfig,
  p122L1015OperatorEnvelope,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_14_PACKET_013,
  p122L1014CanonicalPacket013Assessment,
} from "./p12-2-l10-14-packet-013-nonrecoverability.js";

test("packet 014 is deterministic and bound to the L10.14 fresh-run decision", () => {
  const legacy = p122L1014CanonicalPacket013Assessment();
  assert.equal(legacy.status, "legacy_exact_url_unavailable");
  assert.equal(legacy.packet013RecoveryAuthorized, false);
  assert.equal(legacy.packet013BackfillAuthorized, false);
  assert.equal(legacy.freshRunRequired, true);
  assert.equal(legacy.safeNextPhase, "full_initial");

  const a = buildP122L1015Packet();
  const b = buildP122L1015Packet();
  assert.equal(a.fingerprint, P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(P12_2_L10_15_PACKET.fingerprint, a.fingerprint);
  assert.notEqual(a.runId, P12_2_L10_14_PACKET_013.runId);
});

test("packet 014 exact identity is new full_initial lineage with no resume bindings", () => {
  const packet = P12_2_L10_15_PACKET;
  assert.equal(packet.phase, "full_initial");
  assert.equal(packet.runId, P12_2_L10_15_RUN_ID);
  assert.equal(packet.observedAt, P12_2_L10_15_OBSERVED_AT);
  assert.equal(packet.intentionalInterruptionAfterCheckpointRevision, null);
  assert.equal(packet.resume, null);
  assert.equal(packet.incremental, null);
  assert.equal(packet.maxInvocationAttempts, 1);
  assert.equal(packet.automaticWholeRunRetry, false);
  assert.equal(packet.schedulerEnabled, false);
  assert.equal(packet.autonomousWorkerEnabled, false);
  assert.equal(packet.providerWrites, false);
  assert.equal(packet.publicSiteWrites, false);
  assert.equal(packet.deploymentAuthorized, false);
  assert.equal(packet.publicationAuthorized, false);
});

test("packet 014 uses conservative bounded full-site limits", () => {
  const config = p122L1015ManualConfig();
  assert.equal(config.networkReady, true);
  assert.equal(config.liveExecutionAuthorized, true);
  assert.equal(config.persistenceReady, true);
  assert.equal(config.persistenceAuthorized, true);

  assert.deepEqual(config.limits, {
    hardPageLimit: 5_000,
    absolutePageCeiling: 25_000,
    sitemapPolicy: {
      maxDocuments: 100,
      maxDepth: 4,
      maxDocumentBytes: 5_000_000,
      maxInventoryUrls: 5_000,
      maxPathSegments: 32,
    },
    executionPolicy: {
      batchSize: 10,
      concurrency: 1,
      requestsPerMinute: 30,
      requestTimeoutMs: 10_000,
      maxRedirectsPerRequest: 3,
      maxAttemptsPerUrl: 3,
      retryBaseDelayMs: 10_000,
      retryMaxDelayMs: 60_000,
      maxUrlLength: 2_048,
      maxPathSegments: 32,
      maxRepeatedPathSegmentRun: 3,
    },
    incremental: {
      maxPlanUrls: 30,
      batchSize: 10,
    },
    maxTransientPageBytes: 262_144,
  });
});

test("packet 014 authorization is exact packet fingerprint authorization", () => {
  assert.equal(
    p122L1015AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L2_ONE_SHOT:" + P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  );
});

test("packet 014 operator envelope is exact-bound and contains no external material", () => {
  const envelope = p122L1015OperatorEnvelope();
  assert.equal(envelope.packet.fingerprint, P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT);
  assert.equal(envelope.packet.phase, "full_initial");
  assert.equal(envelope.resumeCheckpoint, null);
  assert.equal(envelope.incrementalMaterial, null);
});

test("L10.15 capability grants no live, Production, Railway or release authority", () => {
  const capability = p122L1015Capability();
  assert.equal(capability.exactPacketAuthorizationRequired, true);
  assert.equal(capability.durableClaimBeforeNetworkExecution, true);
  assert.equal(capability.packet013RecoveryAuthorized, false);
  assert.equal(capability.packet013BackfillAuthorized, false);
  assert.equal(capability.liveExecutionAuthorizedByThisMilestone, false);
  assert.equal(capability.productionDbReadAuthorizedByThisMilestone, false);
  assert.equal(capability.productionDbWriteAuthorizedByThisMilestone, false);
  assert.equal(capability.railwayMutationAuthorizedByThisMilestone, false);
  assert.equal(capability.imageReleaseAuthorizedByThisMilestone, false);
  assert.equal(capability.schedulerWorkerActivationAuthorized, false);
  assert.equal(capability.providerOrPublicSiteWritesAuthorized, false);
  assert.equal(capability.deploymentOrPublicationAuthorized, false);
});

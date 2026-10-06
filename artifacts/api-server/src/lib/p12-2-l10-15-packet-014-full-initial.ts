import {
  P12_2_EXECUTION_CONFIRMATION,
  type P12_2ManualConfig,
} from "./first-party-crawl-manual.js";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
} from "./first-party-crawl-runtime-bridge.js";
import {
  DIAMOND_SHELF_SITE_ID,
} from "./first-party-live-adapters.js";
import {
  assertP122L2PacketIntegrity,
  p122L2AuthorizationLiteral,
  type P122L2Packet,
} from "./p12-2-l2-one-shot-operator-caller.js";
import {
  P12_2_L6_3_LIVE_OPERATOR_VERSION,
  assertP122L3OperatorEnvelopeIntegrity,
  type P122L3OperatorEnvelope,
} from "./p12-2-l6-3-live-operator.js";
import {
  buildP122L1014FreshFullInitialPacket,
  p122L1014CanonicalPacket013Assessment,
} from "./p12-2-l10-14-packet-013-nonrecoverability.js";

export const P12_2_L10_15_VERSION =
  "p12-2-l10-15-post-0010-packet-014-full-initial-v1" as const;

export const P12_2_L10_15_RUN_ID =
  "p12-2-diamond-shelf-post-0010-full-014" as const;
export const P12_2_L10_15_OBSERVED_AT =
  "2026-10-06T16:15:00.000Z" as const;
export const P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT =
  "b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560" as const;

export function p122L1015ManualConfig(): P12_2ManualConfig {
  return {
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
    limits: {
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
    },
  };
}

export function buildP122L1015Packet(): P122L2Packet {
  const legacy = p122L1014CanonicalPacket013Assessment();
  if (
    legacy.status !== "legacy_exact_url_unavailable" ||
    legacy.packet013RecoveryAuthorized !== false ||
    legacy.packet013BackfillAuthorized !== false ||
    legacy.freshRunRequired !== true ||
    legacy.safeNextPhase !== "full_initial"
  ) {
    throw new Error("p12_2_l10_15_packet_013_handoff_invalid");
  }

  const packet = buildP122L1014FreshFullInitialPacket({
    runId: P12_2_L10_15_RUN_ID,
    observedAt: P12_2_L10_15_OBSERVED_AT,
    config: p122L1015ManualConfig(),
  });
  assertP122L2PacketIntegrity(packet);

  if (
    packet.fingerprint !== P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT ||
    packet.phase !== "full_initial" ||
    packet.runId !== P12_2_L10_15_RUN_ID ||
    packet.observedAt !== P12_2_L10_15_OBSERVED_AT ||
    packet.resume !== null ||
    packet.incremental !== null ||
    packet.intentionalInterruptionAfterCheckpointRevision !== null ||
    packet.maxInvocationAttempts !== 1 ||
    packet.automaticWholeRunRetry !== false ||
    packet.schedulerEnabled !== false ||
    packet.autonomousWorkerEnabled !== false ||
    packet.providerWrites !== false ||
    packet.publicSiteWrites !== false ||
    packet.deploymentAuthorized !== false ||
    packet.publicationAuthorized !== false
  ) {
    throw new Error("p12_2_l10_15_packet_identity_invalid");
  }

  return packet;
}

export const P12_2_L10_15_PACKET = Object.freeze(buildP122L1015Packet());

export function p122L1015AuthorizationLiteral(): string {
  return p122L2AuthorizationLiteral(P12_2_L10_15_PACKET);
}

export function p122L1015OperatorEnvelope(): P122L3OperatorEnvelope {
  const envelope: P122L3OperatorEnvelope = {
    version: P12_2_L6_3_LIVE_OPERATOR_VERSION,
    packet: P12_2_L10_15_PACKET,
    resumeCheckpoint: null,
    incrementalMaterial: null,
  };
  assertP122L3OperatorEnvelopeIntegrity(envelope);
  return envelope;
}

export function p122L1015Capability() {
  return Object.freeze({
    version: P12_2_L10_15_VERSION,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    phase: "full_initial",
    runId: P12_2_L10_15_RUN_ID,
    observedAt: P12_2_L10_15_OBSERVED_AT,
    hardPageLimit: 5_000,
    maxInventoryUrls: 5_000,
    batchSize: 10,
    concurrency: 1,
    requestsPerMinute: 30,
    requestTimeoutMs: 10_000,
    maxAttemptsPerUrl: 3,
    maxTransientPageBytes: 262_144,
    exactPacketAuthorizationRequired: true,
    durableClaimBeforeNetworkExecution: true,
    packet013RecoveryAuthorized: false,
    packet013BackfillAuthorized: false,
    liveExecutionAuthorizedByThisMilestone: false,
    productionDbReadAuthorizedByThisMilestone: false,
    productionDbWriteAuthorizedByThisMilestone: false,
    railwayMutationAuthorizedByThisMilestone: false,
    imageReleaseAuthorizedByThisMilestone: false,
    schedulerWorkerActivationAuthorized: false,
    providerOrPublicSiteWritesAuthorized: false,
    deploymentOrPublicationAuthorized: false,
  } as const);
}

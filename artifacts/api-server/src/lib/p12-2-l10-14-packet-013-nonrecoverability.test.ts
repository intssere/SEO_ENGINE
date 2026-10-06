import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_14_PACKET_013,
  assessP122L1014Packet013Evidence,
  buildP122L1014FreshFullInitialPacket,
  p122L1014CanonicalPacket013Assessment,
  p122L1014Capability,
} from "./p12-2-l10-14-packet-013-nonrecoverability.js";
import {
  defaultP12_2InspectionConfig,
  P12_2_EXECUTION_CONFIRMATION,
} from "./first-party-crawl-manual.js";

function executableConfig() {
  const config = defaultP12_2InspectionConfig();
  return {
    ...config,
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  };
}

function candidate(overrides: Partial<Parameters<typeof assessP122L1014Packet013Evidence>[0][number]> = {}) {
  return {
    source: "operator_log" as const,
    canonicalUrl: "https://diamondshelf.us/products/example",
    runId: P12_2_L10_14_PACKET_013.runId,
    executionPlanFingerprint: P12_2_L10_14_PACKET_013.executionPlanFingerprint,
    directUrlIdentity: true,
    immutable: true,
    contemporaneous: true,
    ...overrides,
  };
}

test("binds the exact packet 013 legacy failure state", () => {
  assert.equal(P12_2_L10_14_PACKET_013.runId, "p12-2-diamond-shelf-full-interrupt-010");
  assert.equal(
    P12_2_L10_14_PACKET_013.executionPlanFingerprint,
    "0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa",
  );
  assert.equal(P12_2_L10_14_PACKET_013.finalCheckpointRevision, 307);
  assert.equal(
    P12_2_L10_14_PACKET_013.finalCheckpointFingerprint,
    "6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99",
  );
  assert.equal(P12_2_L10_14_PACKET_013.totalUrls, 3044);
  assert.equal(P12_2_L10_14_PACKET_013.finalizedUrls, 3044);
  assert.equal(P12_2_L10_14_PACKET_013.pendingUrls, 0);
  assert.equal(P12_2_L10_14_PACKET_013.terminalFailures, 1);
  assert.equal(P12_2_L10_14_PACKET_013.railwayLogCanonicalUrlCaptured, false);
  assert.equal(P12_2_L10_14_PACKET_013.checkpointRevisionHistoryRetained, false);
  assert.equal(P12_2_L10_14_PACKET_013.terminalFailureEventsAvailableAtExecution, false);
  assert.equal(P12_2_L10_14_PACKET_013.accountingSnapshotAvailableAtExecution, false);
});

test("canonical packet 013 assessment fails closed to a fresh full_initial run", () => {
  const a = p122L1014CanonicalPacket013Assessment();
  const b = p122L1014CanonicalPacket013Assessment();
  assert.equal(a.status, "legacy_exact_url_unavailable");
  assert.equal(a.exactCanonicalUrl, null);
  assert.equal(a.packet013RecoveryAuthorized, false);
  assert.equal(a.packet013BackfillAuthorized, false);
  assert.equal(a.freshRunRequired, true);
  assert.equal(a.safeNextPhase, "full_initial");
  assert.match(a.fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(a.fingerprint, b.fingerprint);
});

test("aggregate counters, fresh recrawl output and manual guesses cannot identify the legacy URL", () => {
  for (const source of ["aggregate_checkpoint", "fresh_recrawl", "manual_guess"] as const) {
    const assessment = assessP122L1014Packet013Evidence([
      candidate({ source, directUrlIdentity: true }),
    ]);
    assert.equal(assessment.status, "legacy_exact_url_unavailable");
    assert.equal(assessment.exactCanonicalUrl, null);
    assert.equal(assessment.packet013RecoveryAuthorized, false);
  }
});

test("only direct immutable contemporaneous lineage-bound evidence can identify an exact URL", () => {
  const assessment = assessP122L1014Packet013Evidence([candidate()]);
  assert.equal(assessment.status, "exact_url_identified");
  assert.equal(assessment.exactCanonicalUrl, "https://diamondshelf.us/products/example");
  assert.equal(assessment.packet013RecoveryAuthorized, false);
  assert.equal(assessment.packet013BackfillAuthorized, false);
  assert.equal(assessment.freshRunRequired, false);

  for (const overrides of [
    { directUrlIdentity: false },
    { immutable: false },
    { contemporaneous: false },
  ]) {
    const rejected = assessP122L1014Packet013Evidence([candidate(overrides)]);
    assert.equal(rejected.status, "legacy_exact_url_unavailable");
  }
});

test("foreign lineage, foreign origin and conflicting exact evidence fail closed", () => {
  assert.throws(
    () => assessP122L1014Packet013Evidence([
      candidate({ runId: "other-run" }),
    ]),
    /evidence_lineage_mismatch/,
  );
  assert.throws(
    () => assessP122L1014Packet013Evidence([
      candidate({ canonicalUrl: "https://example.com/products/example" }),
    ]),
    /evidence_url_invalid/,
  );
  assert.throws(
    () => assessP122L1014Packet013Evidence([
      candidate(),
      candidate({ canonicalUrl: "https://diamondshelf.us/products/other" }),
    ]),
    /conflicting_exact_url_evidence/,
  );
});

test("fresh-run guard forbids the legacy run id and emits only a clean full_initial packet", () => {
  assert.throws(
    () => buildP122L1014FreshFullInitialPacket({
      runId: P12_2_L10_14_PACKET_013.runId,
      observedAt: "2026-10-06T16:00:00.000Z",
      config: executableConfig(),
    }),
    /legacy_run_id_reuse_forbidden/,
  );

  const packet = buildP122L1014FreshFullInitialPacket({
    runId: "p12-2-diamond-shelf-post-0010-full-001",
    observedAt: "2026-10-06T16:00:00.000Z",
    config: executableConfig(),
  });
  assert.equal(packet.phase, "full_initial");
  assert.equal(packet.resume, null);
  assert.equal(packet.incremental, null);
  assert.equal(packet.intentionalInterruptionAfterCheckpointRevision, null);
  assert.equal(packet.maxInvocationAttempts, 1);
  assert.equal(packet.automaticWholeRunRetry, false);
  assert.equal(packet.schedulerEnabled, false);
  assert.equal(packet.autonomousWorkerEnabled, false);
  assert.equal(packet.providerWrites, false);
  assert.equal(packet.publicSiteWrites, false);
  assert.match(packet.fingerprint, /^[0-9a-f]{64}$/);
});

test("L10.14 capability grants no live or Production authority", () => {
  const capability = p122L1014Capability();
  assert.equal(capability.packet013ExactUrlIdentified, false);
  assert.equal(capability.packet013RecoveryAuthorized, false);
  assert.equal(capability.packet013BackfillAuthorized, false);
  assert.equal(capability.freshFullInitialPacketPlanningAllowed, true);
  assert.equal(capability.liveCrawlExecutionAuthorized, false);
  assert.equal(capability.productionDbReadAuthorized, false);
  assert.equal(capability.productionDbWriteAuthorized, false);
  assert.equal(capability.schedulerWorkerActivationAuthorized, false);
  assert.equal(capability.providerOrPublicSiteWriteAuthorized, false);
  assert.equal(capability.deploymentOrPublicationAuthorized, false);
});

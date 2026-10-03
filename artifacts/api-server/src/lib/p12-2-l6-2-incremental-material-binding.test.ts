import assert from "node:assert/strict";
import test from "node:test";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";
import {
  buildP122L2Packet,
} from "./p12-2-l2-one-shot-operator-caller.js";
import {
  resolveP122L2IncrementalExecutableMaterial,
  type P122L2IncrementalMaterialSource,
} from "./p12-2-l6-2-incremental-material-binding.js";
import {
  defaultP12_2InspectionConfig,
  P12_2_EXECUTION_CONFIRMATION,
} from "./first-party-crawl-manual.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";

const POLICY = { maxPlanUrls: 10, batchSize: 2 } as const;

function source(input: {
  runId: string;
  observedAt: string;
  entries: Array<{ path: string; lastmod?: string }>;
}): P122L2IncrementalMaterialSource {
  const built = buildIncrementalRecrawlTestSource({
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    entries: input.entries,
  });
  return {
    runId: input.runId,
    observedAt: input.observedAt,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    inventory: built.inventory,
    certification: built.certification,
    executionPlan: built.executionPlan,
    checkpoint: built.checkpoint,
  };
}

function executableConfig(after: P122L2IncrementalMaterialSource) {
  const config = defaultP12_2InspectionConfig();
  return {
    ...config,
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
    limits: {
      ...config.limits,
      hardPageLimit: after.executionPlan.source.pageHardLimit,
      absolutePageCeiling: after.executionPlan.source.absolutePageCeiling,
      sitemapPolicy: {
        ...config.limits.sitemapPolicy,
        maxInventoryUrls: after.executionPlan.source.pageHardLimit,
      },
      incremental: { ...POLICY },
    },
  };
}

function expectedPlan(before: P122L2IncrementalMaterialSource, after: P122L2IncrementalMaterialSource) {
  const beforeHistory = { inventory: before.inventory, certification: before.certification };
  const afterHistory = { inventory: after.inventory, certification: after.certification };
  const comparison = compareFullSiteCrawlHistory({ before: beforeHistory, after: afterHistory });
  return buildIncrementalRecrawlPlan({
    comparison,
    before: beforeHistory,
    after: afterHistory,
    policy: POLICY,
  });
}

function packetFor(before: P122L2IncrementalMaterialSource, after: P122L2IncrementalMaterialSource) {
  const plan = expectedPlan(before, after);
  return buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-l6-2-incremental-001",
    observedAt: "2026-10-03T07:15:00.000Z",
    config: executableConfig(after),
    incremental: {
      incrementalPlanFingerprint: plan.fingerprint,
      executionPlanFingerprint: after.executionPlan.fingerprint,
    },
  });
}

test("L6.2 deterministically rebuilds and binds the exact incremental executable material", () => {
  const before = source({
    runId: "full-before-001",
    observedAt: "2026-10-03T06:00:00.000Z",
    entries: [
      { path: "/a", lastmod: "2026-09-01" },
      { path: "/b", lastmod: "2026-09-02" },
    ],
  });
  const after = source({
    runId: "full-after-001",
    observedAt: "2026-10-03T07:00:00.000Z",
    entries: [
      { path: "/a", lastmod: "2026-09-10" },
      { path: "/b", lastmod: "2026-09-02" },
      { path: "/c", lastmod: "2026-09-11" },
    ],
  });
  const packet = packetFor(before, after);
  const expected = expectedPlan(before, after);

  const material = resolveP122L2IncrementalExecutableMaterial({
    packet,
    before,
    after,
    policy: POLICY,
  });

  assert.equal(material.packetFingerprint, packet.fingerprint);
  assert.equal(material.beforeRunId, before.runId);
  assert.equal(material.afterRunId, after.runId);
  assert.equal(material.incrementalPlanFingerprint, expected.fingerprint);
  assert.equal(material.executionPlanFingerprint, after.executionPlan.fingerprint);
  assert.equal(material.incrementalPlan.fingerprint, packet.incremental!.incrementalPlanFingerprint);
  assert.equal(material.currentExecutionPlan.fingerprint, packet.incremental!.executionPlanFingerprint);
  assert.equal(material.trustedCandidateCount, 0);
  assert.equal(material.executionPerformed, false);
  assert.equal(material.automaticRetry, false);
  assert.equal(material.schedulerEnabled, false);
  assert.equal(material.autonomousWorkerEnabled, false);
  assert.equal(material.providerWrites, false);
  assert.equal(material.publicSiteWrites, false);
  assert.match(material.fingerprint, /^[a-f0-9]{64}$/);
});

test("L6.2 rejects packet policy drift before material can be executed", () => {
  const before = source({
    runId: "full-before-policy",
    observedAt: "2026-10-03T06:00:00.000Z",
    entries: [{ path: "/a", lastmod: "2026-09-01" }],
  });
  const after = source({
    runId: "full-after-policy",
    observedAt: "2026-10-03T07:00:00.000Z",
    entries: [{ path: "/a", lastmod: "2026-09-10" }],
  });
  const packet = packetFor(before, after);
  assert.throws(
    () => resolveP122L2IncrementalExecutableMaterial({
      packet, before, after, policy: { maxPlanUrls: 9, batchSize: 2 },
    }),
    /p12_2_l6_2_packet_incremental_policy_mismatch/,
  );
});

test("L6.2 rejects self-lineage and non-forward chronology", () => {
  const before = source({
    runId: "full-same",
    observedAt: "2026-10-03T07:00:00.000Z",
    entries: [{ path: "/a" }],
  });
  const afterSameRun = { ...source({
    runId: "full-after-temp",
    observedAt: "2026-10-03T08:00:00.000Z",
    entries: [{ path: "/a" }, { path: "/b" }],
  }), runId: "full-same" };
  const plan = expectedPlan(before, afterSameRun);
  const packet = buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-l6-2-self",
    observedAt: "2026-10-03T09:00:00.000Z",
    config: executableConfig(afterSameRun),
    incremental: { incrementalPlanFingerprint: plan.fingerprint, executionPlanFingerprint: afterSameRun.executionPlan.fingerprint },
  });
  assert.throws(
    () => resolveP122L2IncrementalExecutableMaterial({ packet, before, after: afterSameRun, policy: POLICY }),
    /p12_2_l6_2_self_lineage_forbidden/,
  );

  const afterBackwards = { ...afterSameRun, runId: "full-after-backwards", observedAt: "2026-10-03T06:30:00.000Z" };
  const plan2 = expectedPlan(before, afterBackwards);
  const packet2 = buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-l6-2-backwards",
    observedAt: "2026-10-03T09:00:00.000Z",
    config: executableConfig(afterBackwards),
    incremental: { incrementalPlanFingerprint: plan2.fingerprint, executionPlanFingerprint: afterBackwards.executionPlan.fingerprint },
  });
  assert.throws(
    () => resolveP122L2IncrementalExecutableMaterial({ packet: packet2, before, after: afterBackwards, policy: POLICY }),
    /p12_2_l6_2_lineage_chronology_invalid/,
  );
});

test("L6.2 rejects frozen plan or execution fingerprints that do not match rebuilt material", () => {
  const before = source({
    runId: "full-before-fp",
    observedAt: "2026-10-03T06:00:00.000Z",
    entries: [{ path: "/a", lastmod: "2026-09-01" }],
  });
  const after = source({
    runId: "full-after-fp",
    observedAt: "2026-10-03T07:00:00.000Z",
    entries: [{ path: "/a", lastmod: "2026-09-10" }, { path: "/b" }],
  });
  const expected = expectedPlan(before, after);

  const wrongPlanPacket = buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-l6-2-wrong-plan",
    observedAt: "2026-10-03T09:00:00.000Z",
    config: executableConfig(after),
    incremental: { incrementalPlanFingerprint: "a".repeat(64), executionPlanFingerprint: after.executionPlan.fingerprint },
  });
  assert.notEqual(expected.fingerprint, "a".repeat(64));
  assert.throws(
    () => resolveP122L2IncrementalExecutableMaterial({ packet: wrongPlanPacket, before, after, policy: POLICY }),
    /p12_2_l6_2_incremental_plan_fingerprint_mismatch/,
  );

  const wrongExecutionPacket = buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-l6-2-wrong-execution",
    observedAt: "2026-10-03T09:00:00.000Z",
    config: executableConfig(after),
    incremental: { incrementalPlanFingerprint: expected.fingerprint, executionPlanFingerprint: "b".repeat(64) },
  });
  assert.notEqual(after.executionPlan.fingerprint, "b".repeat(64));
  assert.throws(
    () => resolveP122L2IncrementalExecutableMaterial({ packet: wrongExecutionPacket, before, after, policy: POLICY }),
    /p12_2_l6_2_execution_plan_fingerprint_mismatch/,
  );
});

test("L6.2 trusted candidates are never implicit and become packet-fingerprint-bound when explicitly supplied", () => {
  const before = source({
    runId: "full-before-trusted",
    observedAt: "2026-10-03T06:00:00.000Z",
    entries: [{ path: "/a" }, { path: "/b" }],
  });
  const after = source({
    runId: "full-after-trusted",
    observedAt: "2026-10-03T07:00:00.000Z",
    entries: [{ path: "/a" }, { path: "/b" }],
  });
  const beforeHistory = { inventory: before.inventory, certification: before.certification };
  const afterHistory = { inventory: after.inventory, certification: after.certification };
  const comparison = compareFullSiteCrawlHistory({ before: beforeHistory, after: afterHistory });
  const trustedCandidates = [{ canonicalUrl: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`, signals: ["high_value" as const] }];
  const expected = buildIncrementalRecrawlPlan({ comparison, before: beforeHistory, after: afterHistory, policy: POLICY, trustedCandidates });
  const packet = buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-l6-2-trusted",
    observedAt: "2026-10-03T09:00:00.000Z",
    config: executableConfig(after),
    incremental: { incrementalPlanFingerprint: expected.fingerprint, executionPlanFingerprint: after.executionPlan.fingerprint },
  });
  const material = resolveP122L2IncrementalExecutableMaterial({ packet, before, after, policy: POLICY, trustedCandidates });
  assert.equal(material.trustedCandidateCount, 1);
  assert.deepEqual(material.incrementalPlan.items, [
    { canonicalUrl: `${DIAMOND_SHELF_CANONICAL_ORIGIN}/b`, priority: "p1_actionable", reasons: ["high_value"] },
  ]);

  assert.throws(
    () => resolveP122L2IncrementalExecutableMaterial({ packet, before, after, policy: POLICY }),
    /p12_2_l6_2_incremental_plan_fingerprint_mismatch/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import { buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";
import {
  buildP122L2Packet,
  p122L2AuthorizationLiteral,
} from "./p12-2-l2-one-shot-operator-caller.js";
import {
  assertP122L3OperatorEnvelopeIntegrity,
  P122L3LiveExecutor,
  P12_2_L6_3_LIVE_OPERATOR_VERSION,
  boundedP122L3ErrorCode,
  p122L3LiveOperatorCapability,
  type P122L3ExecutionAdapter,
  type P122L3OperatorEnvelope,
} from "./p12-2-l6-3-live-operator.js";
import {
  defaultP12_2InspectionConfig,
  P12_2_EXECUTION_CONFIRMATION,
} from "./first-party-crawl-manual.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const HEX_C = "c".repeat(64);

function config(hardPageLimit = 30, absolutePageCeiling = 25_000) {
  const base = defaultP12_2InspectionConfig();
  return {
    ...base,
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
    limits: {
      ...base.limits,
      hardPageLimit,
      absolutePageCeiling,
      sitemapPolicy: { ...base.limits.sitemapPolicy, maxInventoryUrls: hardPageLimit },
      incremental: { maxPlanUrls: Math.min(10, hardPageLimit), batchSize: Math.min(2, hardPageLimit) },
    },
  };
}

function envelope(packet: ReturnType<typeof buildP122L2Packet>, extras: Partial<P122L3OperatorEnvelope> = {}): P122L3OperatorEnvelope {
  return {
    version: P12_2_L6_3_LIVE_OPERATOR_VERSION,
    packet,
    ...extras,
  };
}

function adapter(overrides: Partial<P122L3ExecutionAdapter> = {}): P122L3ExecutionAdapter {
  return {
    async boundedPilotCrawl() { return { fingerprint: HEX_A } as never; },
    async fullCrawl() { return { fingerprint: HEX_A } as never; },
    async fullCrawlUntilCheckpoint() {
      return {
        checkpointRevision: 1,
        checkpointFingerprint: HEX_B,
        executionPlanFingerprint: HEX_C,
        fingerprint: HEX_A,
      } as never;
    },
    async incrementalCrawl() { return { fingerprint: HEX_A } as never; },
    ...overrides,
  };
}

test("L6.3 capability remains one-shot, first-party, and non-autonomous", () => {
  const capability = p122L3LiveOperatorCapability();
  assert.equal(capability.exactPacketIntegrityRequired, true);
  assert.equal(capability.packetSpecificAuthorizationRequired, true);
  assert.equal(capability.durableClaimBeforeNetworkExecution, true);
  assert.equal(capability.migrationRequired, "0008_first_party_crawl_l2_invocations.sql");
  assert.equal(capability.maxInvocationAttempts, 1);
  assert.equal(capability.automaticWholeRunRetry, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
});

test("L6.3 maps bounded_pilot only to the non-certifying pilot executor", async () => {
  const calls: string[] = [];
  const a = adapter({
    async boundedPilotCrawl(input) {
      calls.push(input.runId);
      return {
        fingerprint: HEX_A,
        failureAttribution: {
          terminalFailures: 2,
          policyRejections: 1,
          robotsPolicyRejections: { total: 0, reasons: [] },
          otherPolicyRejections: 1,
          permanentHttp: [{ httpStatus: 404, count: 1 }],
          attemptsExhausted: {
            networkTimeout: 0,
            connectionReset: 0,
            transportUnavailable: 0,
            http: [],
          },
        },
      } as never;
    },
    async fullCrawl() {
      throw new Error("full_crawl_must_not_run_for_pilot");
    },
  });
  const packet = buildP122L2Packet({
    phase: "bounded_pilot",
    runId: "l6-3-bounded-pilot",
    observedAt: "2026-10-04T08:30:00.000Z",
    config: config(),
  });
  const result = await new P122L3LiveExecutor(envelope(packet), "postgres://unused", a).execute(packet);
  assert.equal(result.status, "completed");
  assert.equal(result.receiptFingerprint, HEX_A);
  assert.deepEqual(result.boundedPilotFailureAttribution, {
    terminalFailures: 2,
    policyRejections: 1,
    robotsPolicyRejections: { total: 0, reasons: [] },
    otherPolicyRejections: 1,
    permanentHttp: [{ httpStatus: 404, count: 1 }],
    attemptsExhausted: {
      networkTimeout: 0,
      connectionReset: 0,
      transportUnavailable: 0,
      http: [],
    },
  });
  assert.deepEqual(calls, ["l6-3-bounded-pilot"]);
});

test("L6.3 maps full_initial and full_reconciliation to bounded full crawl calls", async () => {
  const calls: Array<{ compareToPrevious?: boolean; runId: string }> = [];
  const a = adapter({
    async fullCrawl(input) {
      calls.push({ compareToPrevious: input.compareToPrevious, runId: input.runId });
      return { fingerprint: HEX_A } as never;
    },
  });

  for (const phase of ["full_initial", "full_reconciliation"] as const) {
    const packet = buildP122L2Packet({
      phase, runId: `l6-3-${phase}`, observedAt: "2026-10-03T07:40:00.000Z", config: config(),
    });
    const e = envelope(packet);
    assert.doesNotThrow(() => assertP122L3OperatorEnvelopeIntegrity(e));
    const result = await new P122L3LiveExecutor(e, "postgres://unused", a).execute(packet);
    assert.deepEqual(result, { status: "completed", receiptFingerprint: HEX_A });
  }
  assert.deepEqual(calls, [
    { compareToPrevious: false, runId: "l6-3-full_initial" },
    { compareToPrevious: true, runId: "l6-3-full_reconciliation" },
  ]);
});

test("L6.3 maps full_interrupt to the exact requested persisted revision", async () => {
  let stopRevision = 0;
  const packet = buildP122L2Packet({
    phase: "full_interrupt",
    runId: "l6-3-interrupt",
    observedAt: "2026-10-03T07:41:00.000Z",
    config: config(),
    intentionalInterruptionAfterCheckpointRevision: 3,
  });
  const e = envelope(packet);
  const a = adapter({
    async fullCrawlUntilCheckpoint(input) {
      stopRevision = input.stopAfterCheckpointRevision;
      return {
        checkpointRevision: 3,
        checkpointFingerprint: HEX_B,
        executionPlanFingerprint: HEX_C,
        fingerprint: HEX_A,
      } as never;
    },
  });
  const result = await new P122L3LiveExecutor(e, "postgres://unused", a).execute(packet);
  assert.equal(stopRevision, 3);
  assert.deepEqual(result, {
    status: "intentional_interruption",
    checkpointRevision: 3,
    checkpointFingerprint: HEX_B,
    executionPlanFingerprint: HEX_C,
    receiptFingerprint: HEX_A,
  });
});

test("L6.3 validates and maps full_resume checkpoint material", async () => {
  const built = buildIncrementalRecrawlTestSource({
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    entries: [{ path: "/a" }, { path: "/b" }],
  });
  const packet = buildP122L2Packet({
    phase: "full_resume",
    runId: "l6-3-resume",
    observedAt: "2026-10-03T07:42:00.000Z",
    config: config(20, built.executionPlan.source.absolutePageCeiling),
    resume: {
      checkpointRevision: built.checkpoint.sequence,
      checkpointFingerprint: built.checkpoint.fingerprint,
      executionPlanFingerprint: built.executionPlan.fingerprint,
    },
  });
  const e = envelope(packet, { resumeCheckpoint: built.checkpoint });
  assert.doesNotThrow(() => assertP122L3OperatorEnvelopeIntegrity(e));
  let suppliedFingerprint = "";
  const a = adapter({
    async fullCrawl(input) {
      suppliedFingerprint = input.resumeCheckpoint?.fingerprint ?? "";
      return { fingerprint: HEX_A } as never;
    },
  });
  const result = await new P122L3LiveExecutor(e, "postgres://unused", a).execute(packet);
  assert.equal(suppliedFingerprint, built.checkpoint.fingerprint);
  assert.deepEqual(result, { status: "completed", receiptFingerprint: HEX_A });

  const tampered = structuredClone(e);
  tampered.resumeCheckpoint!.sequence += 1;
  assert.throws(() => assertP122L3OperatorEnvelopeIntegrity(tampered), /crawl_checkpoint_fingerprint_mismatch|p12_2_l6_3_resume_material_mismatch/);
});

test("L6.3 resolves exact incremental material before mapping incremental execution", async () => {
  const beforeBuilt = buildIncrementalRecrawlTestSource({
    siteId: DIAMOND_SHELF_SITE_ID, canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    entries: [{ path: "/a", lastmod: "2026-09-01" }],
  });
  const afterBuilt = buildIncrementalRecrawlTestSource({
    siteId: DIAMOND_SHELF_SITE_ID, canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    entries: [{ path: "/a", lastmod: "2026-09-10" }, { path: "/b", lastmod: "2026-09-11" }],
  });
  const before = {
    runId: "l6-3-inc-before", observedAt: "2026-10-03T06:00:00.000Z",
    siteId: DIAMOND_SHELF_SITE_ID, canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    inventory: beforeBuilt.inventory, certification: beforeBuilt.certification,
    executionPlan: beforeBuilt.executionPlan, checkpoint: beforeBuilt.checkpoint,
  };
  const after = {
    runId: "l6-3-inc-after", observedAt: "2026-10-03T07:00:00.000Z",
    siteId: DIAMOND_SHELF_SITE_ID, canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    inventory: afterBuilt.inventory, certification: afterBuilt.certification,
    executionPlan: afterBuilt.executionPlan, checkpoint: afterBuilt.checkpoint,
  };
  const beforeHistory = { inventory: before.inventory, certification: before.certification };
  const afterHistory = { inventory: after.inventory, certification: after.certification };
  const comparison = compareFullSiteCrawlHistory({ before: beforeHistory, after: afterHistory });
  const policy = { maxPlanUrls: 10, batchSize: 2 };
  const plan = buildIncrementalRecrawlPlan({ comparison, before: beforeHistory, after: afterHistory, policy });
  const packet = buildP122L2Packet({
    phase: "incremental", runId: "l6-3-incremental", observedAt: "2026-10-03T07:43:00.000Z",
    config: config(20, after.executionPlan.source.absolutePageCeiling),
    incremental: { incrementalPlanFingerprint: plan.fingerprint, executionPlanFingerprint: after.executionPlan.fingerprint },
  });
  const e = envelope(packet, { incrementalMaterial: { before, after, policy } });
  assert.doesNotThrow(() => assertP122L3OperatorEnvelopeIntegrity(e));
  let seenPlan = "";
  let seenExecution = "";
  const a = adapter({
    async incrementalCrawl(input) {
      seenPlan = input.run.plan.fingerprint;
      seenExecution = input.run.currentExecutionPlan.fingerprint;
      return { fingerprint: HEX_A } as never;
    },
  });
  const result = await new P122L3LiveExecutor(e, "postgres://unused", a).execute(packet);
  assert.equal(seenPlan, plan.fingerprint);
  assert.equal(seenExecution, after.executionPlan.fingerprint);
  assert.deepEqual(result, { status: "completed", receiptFingerprint: HEX_A });
});

test("L6.3 envelope preflight rejects phase-incompatible material and bounded errors never echo arbitrary text", () => {
  const packet = buildP122L2Packet({
    phase: "full_initial", runId: "l6-3-extra-material", observedAt: "2026-10-03T07:44:00.000Z", config: config(),
  });
  const e = envelope(packet, { resumeCheckpoint: {} as never });
  assert.throws(() => assertP122L3OperatorEnvelopeIntegrity(e), /p12_2_l6_3_resume_material_unexpected/);
  assert.equal(boundedP122L3ErrorCode(new Error("p12_2_l6_3_known_error")), "p12_2_l6_3_known_error");
  const bounded = boundedP122L3ErrorCode(new Error("secret=https://user:pass@example.com/" + "x".repeat(300)));
  assert.match(bounded, /^p12_2_l6_3_failure_[a-f0-9]{16}$/);
  assert.equal(bounded.includes("pass"), false);
  assert.equal(p122L2AuthorizationLiteral(packet).startsWith("AUTHORIZE:P12_2_L2_ONE_SHOT:"), true);
});

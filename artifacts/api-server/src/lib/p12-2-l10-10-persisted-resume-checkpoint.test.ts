import assert from "node:assert/strict";
import test from "node:test";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";
import {
  buildP122L2Packet,
  type P122L2Packet,
} from "./p12-2-l2-one-shot-operator-caller.js";
import {
  assertP122L3OperatorEnvelopeIntegrity,
  P122L3LiveExecutor,
  P12_2_L6_3_LIVE_OPERATOR_VERSION,
  type P122L3ExecutionAdapter,
  type P122L3OperatorEnvelope,
} from "./p12-2-l6-3-live-operator.js";
import {
  assertP122L1010ResumeCheckpointBinding,
  p122L1010PersistedResumeCheckpointCapability,
  type P122L1010ResumeCheckpointLoader,
} from "./p12-2-l10-10-persisted-resume-checkpoint.js";
import {
  defaultP12_2InspectionConfig,
  P12_2_EXECUTION_CONFIRMATION,
} from "./first-party-crawl-manual.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";
import {
  advanceCrawlCheckpoint,
  createInitialCrawlCheckpoint,
  type SuppliedCrawlUrlOutcome,
} from "./full-site-crawl-control.js";

const RECEIPT_FINGERPRINT = "a".repeat(64);
const OTHER_FINGERPRINT = "b".repeat(64);

function config(hardPageLimit: number, absolutePageCeiling: number) {
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
    },
  };
}

function envelope(packet: P122L2Packet, resumeCheckpoint?: P122L3OperatorEnvelope["resumeCheckpoint"]): P122L3OperatorEnvelope {
  return {
    version: P12_2_L6_3_LIVE_OPERATOR_VERSION,
    packet,
    ...(resumeCheckpoint ? { resumeCheckpoint } : {}),
  };
}

function fullCrawlAdapter(onFullCrawl: P122L3ExecutionAdapter["fullCrawl"]): P122L3ExecutionAdapter {
  return {
    async boundedPilotCrawl() { throw new Error("unexpected_bounded_pilot"); },
    fullCrawl: onFullCrawl,
    async fullCrawlUntilCheckpoint() { throw new Error("unexpected_full_interrupt"); },
    async incrementalCrawl() { throw new Error("unexpected_incremental"); },
  };
}

function fixture() {
  const built = buildIncrementalRecrawlTestSource({
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    entries: [{ path: "/a" }, { path: "/b" }],
  });
  const initial = createInitialCrawlCheckpoint(built.executionPlan);
  const outcomes: SuppliedCrawlUrlOutcome[] = initial.pendingCanonicalUrls.map((canonicalUrl, index) =>
    index === 0
      ? { canonicalUrl, kind: "failure", signal: { kind: "network_timeout" } }
      : { canonicalUrl, kind: "success" },
  );
  const checkpoint = advanceCrawlCheckpoint(built.executionPlan, initial, {
    expectedCheckpointFingerprint: initial.fingerprint,
    batchId: initial.activeBatchId!,
    attempt: initial.nextAttempt!,
    outcomes,
  });
  assert.equal(checkpoint.sequence, 1);
  assert.equal(checkpoint.status, "pending");
  return { ...built, checkpoint };
}

function resumePacket(
  built: ReturnType<typeof fixture>,
  checkpointFingerprint = built.checkpoint.fingerprint,
) {
  return buildP122L2Packet({
    phase: "full_resume",
    runId: "p12-2-l10-10-resume",
    observedAt: "2026-10-05T11:10:00.000Z",
    config: config(20, built.executionPlan.source.absolutePageCeiling),
    resume: {
      checkpointRevision: built.checkpoint.sequence,
      checkpointFingerprint,
      executionPlanFingerprint: built.executionPlan.fingerprint,
    },
  });
}

test("L10.10 allows payload-free full_resume envelope and resolves exact persisted checkpoint", async () => {
  const built = fixture();
  const packet = resumePacket(built);
  const e = envelope(packet);
  assert.doesNotThrow(() => assertP122L3OperatorEnvelopeIntegrity(e));

  const loaderCalls: Array<{ runId: string; executionPlanFingerprint: string }> = [];
  const loader: P122L1010ResumeCheckpointLoader = async (input) => {
    loaderCalls.push({
      runId: input.runId,
      executionPlanFingerprint: input.executionPlanFingerprint,
    });
    return built.checkpoint;
  };
  let suppliedCheckpointFingerprint = "";
  const adapter = fullCrawlAdapter(async (input) => {
    suppliedCheckpointFingerprint = input.resumeCheckpoint?.fingerprint ?? "";
    return { fingerprint: RECEIPT_FINGERPRINT } as never;
  });

  const result = await new P122L3LiveExecutor(
    e,
    "postgres://unused",
    adapter,
    loader,
  ).execute(packet);

  assert.deepEqual(loaderCalls, [{
    runId: packet.runId,
    executionPlanFingerprint: built.executionPlan.fingerprint,
  }]);
  assert.equal(suppliedCheckpointFingerprint, built.checkpoint.fingerprint);
  assert.deepEqual(result, { status: "completed", receiptFingerprint: RECEIPT_FINGERPRINT });
});

test("L10.10 rejects resolved checkpoint whose fingerprint does not equal packet binding before full crawl", async () => {
  const built = fixture();
  const packet = resumePacket(built, OTHER_FINGERPRINT);
  const e = envelope(packet);
  assert.doesNotThrow(() => assertP122L3OperatorEnvelopeIntegrity(e));

  let fullCrawlCalls = 0;
  const adapter = fullCrawlAdapter(async () => {
    fullCrawlCalls += 1;
    return { fingerprint: RECEIPT_FINGERPRINT } as never;
  });
  const loader: P122L1010ResumeCheckpointLoader = async () => built.checkpoint;

  await assert.rejects(
    new P122L3LiveExecutor(e, "postgres://unused", adapter, loader).execute(packet),
    /p12_2_l10_10_resume_material_mismatch/,
  );
  assert.equal(fullCrawlCalls, 0);
});

test("L10.10 rejects missing persisted checkpoint before full crawl", async () => {
  const built = fixture();
  const packet = resumePacket(built);
  const e = envelope(packet);
  let fullCrawlCalls = 0;
  const adapter = fullCrawlAdapter(async () => {
    fullCrawlCalls += 1;
    return { fingerprint: RECEIPT_FINGERPRINT } as never;
  });
  const loader: P122L1010ResumeCheckpointLoader = async () => null;

  await assert.rejects(
    new P122L3LiveExecutor(e, "postgres://unused", adapter, loader).execute(packet),
    /p12_2_l6_3_resume_checkpoint_not_found/,
  );
  assert.equal(fullCrawlCalls, 0);
});

test("L10.10 rejects non-pending checkpoint before full crawl", async () => {
  const pending = fixture();
  const completedSource = buildIncrementalRecrawlTestSource({
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    entries: [{ path: "/a" }, { path: "/b" }],
  });
  const packet = resumePacket(pending);
  const e = envelope(packet);
  let fullCrawlCalls = 0;
  const adapter = fullCrawlAdapter(async () => {
    fullCrawlCalls += 1;
    return { fingerprint: RECEIPT_FINGERPRINT } as never;
  });
  const loader: P122L1010ResumeCheckpointLoader = async () => completedSource.checkpoint;

  await assert.rejects(
    new P122L3LiveExecutor(e, "postgres://unused", adapter, loader).execute(packet),
    /p12_2_l10_10_resume_checkpoint_state_invalid|p12_2_l10_10_resume_material_mismatch/,
  );
  assert.equal(fullCrawlCalls, 0);
});

test("L10.10 preserves embedded checkpoint compatibility without invoking persisted loader", async () => {
  const built = fixture();
  const packet = resumePacket(built);
  const e = envelope(packet, built.checkpoint);
  assert.doesNotThrow(() => assertP122L3OperatorEnvelopeIntegrity(e));

  let loaderCalls = 0;
  const loader: P122L1010ResumeCheckpointLoader = async () => {
    loaderCalls += 1;
    throw new Error("embedded_resume_must_not_load");
  };
  let fullCrawlCalls = 0;
  const adapter = fullCrawlAdapter(async (input) => {
    fullCrawlCalls += 1;
    assert.equal(input.resumeCheckpoint?.fingerprint, built.checkpoint.fingerprint);
    return { fingerprint: RECEIPT_FINGERPRINT } as never;
  });

  await new P122L3LiveExecutor(e, "postgres://unused", adapter, loader).execute(packet);
  assert.equal(loaderCalls, 0);
  assert.equal(fullCrawlCalls, 1);
});

test("L10.10 exact binding helper and capability remain fail closed", () => {
  const built = fixture();
  const packet = resumePacket(built);
  assert.doesNotThrow(() => assertP122L1010ResumeCheckpointBinding(packet, built.checkpoint));

  const wrongPacket = resumePacket(built, OTHER_FINGERPRINT);
  assert.throws(
    () => assertP122L1010ResumeCheckpointBinding(wrongPacket, built.checkpoint),
    /p12_2_l10_10_resume_material_mismatch/,
  );

  const capability = p122L1010PersistedResumeCheckpointCapability();
  assert.equal(capability.persistedCheckpointResolution, true);
  assert.equal(capability.exactRunIdRequired, true);
  assert.equal(capability.exactExecutionPlanFingerprintRequired, true);
  assert.equal(capability.exactCheckpointRevisionRequired, true);
  assert.equal(capability.exactCheckpointFingerprintRequired, true);
  assert.equal(capability.checkpointPayloadTransportRequired, false);
  assert.equal(capability.rawCheckpointLoggingRequired, false);
  assert.equal(capability.failClosedBeforePageExecution, true);
});

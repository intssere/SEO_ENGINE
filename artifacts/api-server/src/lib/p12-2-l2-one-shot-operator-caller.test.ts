import assert from "node:assert/strict";
import test from "node:test";
import {
  buildP122L2Packet,
  executeP122L2OneShot,
  p122L2AuthorizationLiteral,
} from "./p12-2-l2-one-shot-operator-caller.js";
import {
  defaultP12_2InspectionConfig,
  P12_2_EXECUTION_CONFIRMATION,
} from "./first-party-crawl-manual.js";

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const HEX_C = "c".repeat(64);

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

test("builds deterministic one-shot packet only with all existing manual gates", () => {
  const input = {
    phase: "full_initial" as const,
    runId: "p12-2-live-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
  };
  const a = buildP122L2Packet(input);
  const b = buildP122L2Packet(input);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.maxInvocationAttempts, 1);
  assert.equal(a.automaticWholeRunRetry, false);
  assert.equal(a.schedulerEnabled, false);
  assert.equal(a.autonomousWorkerEnabled, false);
  assert.equal(a.providerWrites, false);
  assert.equal(a.publicSiteWrites, false);
});

test("fails closed when any manual gate is false", () => {
  const keys = [
    "networkReady",
    "liveExecutionAuthorized",
    "persistenceReady",
    "persistenceAuthorized",
  ] as const;
  for (const key of keys) {
    assert.throws(() => buildP122L2Packet({
      phase: "full_initial",
      runId: "p12-2-live-001",
      observedAt: "2026-10-01T16:30:00.000Z",
      config: { ...executableConfig(), [key]: false },
    }));
  }
});

test("full_interrupt requires exact intended checkpoint revision", () => {
  assert.throws(() => buildP122L2Packet({
    phase: "full_interrupt",
    runId: "p12-2-live-interrupt-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
  }), /interruption_revision_required/);

  const packet = buildP122L2Packet({
    phase: "full_interrupt",
    runId: "p12-2-live-interrupt-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
    intentionalInterruptionAfterCheckpointRevision: 2,
  });
  assert.equal(packet.intentionalInterruptionAfterCheckpointRevision, 2);
});

test("resume and incremental phases require exact lineage fingerprints", () => {
  assert.throws(() => buildP122L2Packet({
    phase: "full_resume",
    runId: "p12-2-live-resume-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
  }), /resume_binding_required/);

  assert.doesNotThrow(() => buildP122L2Packet({
    phase: "full_resume",
    runId: "p12-2-live-resume-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
    resume: {
      checkpointRevision: 2,
      checkpointFingerprint: HEX_A,
      executionPlanFingerprint: HEX_B,
    },
  }));

  assert.doesNotThrow(() => buildP122L2Packet({
    phase: "incremental",
    runId: "p12-2-live-incremental-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
    incremental: {
      incrementalPlanFingerprint: HEX_A,
      executionPlanFingerprint: HEX_B,
    },
  }));
});

test("one-shot dispatch requires packet-specific authorization and blocks consumed replay", async () => {
  const packet = buildP122L2Packet({
    phase: "full_initial",
    runId: "p12-2-live-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
  });
  let calls = 0;
  const executor = {
    async execute() {
      calls += 1;
      return { status: "completed" as const, receiptFingerprint: HEX_C };
    },
  };

  await assert.rejects(
    executeP122L2OneShot({
      packet,
      authorizationLiteral: "wrong",
      executor,
    }),
    /operator_authorization_required/,
  );
  assert.equal(calls, 0);

  const receipt = await executeP122L2OneShot({
    packet,
    authorizationLiteral: p122L2AuthorizationLiteral(packet),
    executor,
  });
  assert.equal(calls, 1);
  assert.equal(receipt.invocationAttempt, 1);
  assert.equal(receipt.automaticRetryPerformed, false);

  await assert.rejects(
    executeP122L2OneShot({
      packet,
      authorizationLiteral: p122L2AuthorizationLiteral(packet),
      priorReceipt: receipt,
      executor,
    }),
    /packet_already_consumed/,
  );
  assert.equal(calls, 1);
});

test("intentional interruption must match the packet boundary", async () => {
  const packet = buildP122L2Packet({
    phase: "full_interrupt",
    runId: "p12-2-live-interrupt-001",
    observedAt: "2026-10-01T16:30:00.000Z",
    config: executableConfig(),
    intentionalInterruptionAfterCheckpointRevision: 2,
  });

  await assert.rejects(
    executeP122L2OneShot({
      packet,
      authorizationLiteral: p122L2AuthorizationLiteral(packet),
      executor: {
        async execute() {
          return { status: "completed" as const, receiptFingerprint: HEX_C };
        },
      },
    }),
    /expected_intentional_interruption/,
  );

  const receipt = await executeP122L2OneShot({
    packet,
    authorizationLiteral: p122L2AuthorizationLiteral(packet),
    executor: {
      async execute() {
        return {
          status: "intentional_interruption" as const,
          checkpointRevision: 2,
          checkpointFingerprint: HEX_A,
          executionPlanFingerprint: HEX_B,
          receiptFingerprint: HEX_C,
        };
      },
    },
  });
  assert.equal(receipt.result.status, "intentional_interruption");
});

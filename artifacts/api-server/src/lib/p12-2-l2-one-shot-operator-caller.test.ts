import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP122L2PacketIntegrity,
  buildP122L2Packet,
  executeP122L2OneShot,
  executeP122L2OneShotDurable,
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

test("bounded_pilot is a first-class packet phase with no resume or incremental lineage", () => {
  const packet = buildP122L2Packet({
    phase: "bounded_pilot",
    runId: "p12-2-bounded-pilot-001",
    observedAt: "2026-10-04T08:30:00.000Z",
    config: executableConfig(),
  });
  assert.equal(packet.phase, "bounded_pilot");
  assert.equal(packet.resume, null);
  assert.equal(packet.incremental, null);
  assert.equal(packet.intentionalInterruptionAfterCheckpointRevision, null);
  assert.match(packet.fingerprint, /^[a-f0-9]{64}$/);
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


test("durable one-shot claims before execution, completes once, and blocks cross-process replay", async () => {
  const packet = buildP122L2Packet({
    phase: "full_initial",
    runId: "p12-2-live-durable-001",
    observedAt: "2026-10-02T18:30:00.000Z",
    config: executableConfig(),
  });
  const claims = new Set<string>();
  const completed = new Map<string, string>();
  const store = {
    async claim(value: typeof packet) {
      if (claims.has(value.fingerprint)) throw new Error("p12_2_l2_packet_already_consumed");
      claims.add(value.fingerprint);
    },
    async complete(value: typeof packet, receipt: { fingerprint: string }) {
      assert.equal(claims.has(value.fingerprint), true);
      completed.set(value.fingerprint, receipt.fingerprint);
    },
  };

  let calls = 0;
  const receipt = await executeP122L2OneShotDurable({
    packet,
    authorizationLiteral: p122L2AuthorizationLiteral(packet),
    receiptStore: store,
    executor: {
      async execute() {
        calls += 1;
        return { status: "completed" as const, receiptFingerprint: HEX_C };
      },
    },
  });

  assert.equal(calls, 1);
  assert.equal(claims.has(packet.fingerprint), true);
  assert.equal(completed.get(packet.fingerprint), receipt.fingerprint);

  await assert.rejects(
    executeP122L2OneShotDurable({
      packet,
      authorizationLiteral: p122L2AuthorizationLiteral(packet),
      receiptStore: store,
      executor: {
        async execute() {
          calls += 1;
          return { status: "completed" as const, receiptFingerprint: HEX_C };
        },
      },
    }),
    /p12_2_l2_packet_already_consumed/,
  );
  assert.equal(calls, 1);
});

test("durable one-shot keeps a failed executor claim consumed and performs no completion", async () => {
  const packet = buildP122L2Packet({
    phase: "full_initial",
    runId: "p12-2-live-durable-failure-001",
    observedAt: "2026-10-02T18:31:00.000Z",
    config: executableConfig(),
  });
  let claimed = false;
  let completed = false;
  const store = {
    async claim() {
      if (claimed) throw new Error("p12_2_l2_packet_already_consumed");
      claimed = true;
    },
    async complete() {
      completed = true;
    },
  };

  await assert.rejects(
    executeP122L2OneShotDurable({
      packet,
      authorizationLiteral: p122L2AuthorizationLiteral(packet),
      receiptStore: store,
      executor: {
        async execute() {
          throw new Error("synthetic_executor_failure");
        },
      },
    }),
    /synthetic_executor_failure/,
  );

  assert.equal(claimed, true);
  assert.equal(completed, false);

  await assert.rejects(
    executeP122L2OneShotDurable({
      packet,
      authorizationLiteral: p122L2AuthorizationLiteral(packet),
      receiptStore: store,
      executor: {
        async execute() {
          return { status: "completed" as const, receiptFingerprint: HEX_C };
        },
      },
    }),
    /p12_2_l2_packet_already_consumed/,
  );
});


test("L6.3 packet integrity accepts exact packets and rejects post-build tampering", () => {
  const packet = buildP122L2Packet({
    phase: "full_initial",
    runId: "p12-2-l6-3-integrity-001",
    observedAt: "2026-10-03T07:35:00.000Z",
    config: executableConfig(),
  });

  assert.doesNotThrow(() => assertP122L2PacketIntegrity(packet));

  const tamperedLimit = structuredClone(packet);
  tamperedLimit.limits.hardPageLimit -= 1;
  assert.throws(
    () => assertP122L2PacketIntegrity(tamperedLimit),
    /p12_2_l2_packet_fingerprint_mismatch|p12_2_manual_sitemap_inventory_exceeds_page_limit/,
  );

  const tamperedSafety = structuredClone(packet);
  (tamperedSafety as unknown as { schedulerEnabled: boolean }).schedulerEnabled = true;
  assert.throws(
    () => assertP122L2PacketIntegrity(tamperedSafety),
    /p12_2_l2_packet_safety_boundary_invalid/,
  );

  const tamperedFingerprint = structuredClone(packet);
  (tamperedFingerprint as unknown as { fingerprint: string }).fingerprint = "f".repeat(64);
  assert.throws(
    () => assertP122L2PacketIntegrity(tamperedFingerprint),
    /p12_2_l2_packet_fingerprint_mismatch/,
  );
});

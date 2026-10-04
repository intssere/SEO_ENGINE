import { createHash } from "node:crypto";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
} from "./first-party-crawl-runtime-bridge.js";
import {
  P12_2_EXECUTION_CONFIRMATION,
  inspectP12_2Manual,
  type P12_2ManualConfig,
} from "./first-party-crawl-manual.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

export const P12_2_L2_VERSION = "p12-2-l2-one-shot-operator-v1" as const;
export const P12_2_L2_MAX_INVOCATION_ATTEMPTS = 1 as const;

export const P12_2_L2_PHASES = [
  "bounded_pilot",
  "full_initial",
  "full_interrupt",
  "full_resume",
  "full_reconciliation",
  "incremental",
] as const;

export type P122L2Phase = (typeof P12_2_L2_PHASES)[number];

export type P122L2ResumeBinding = {
  checkpointRevision: number;
  checkpointFingerprint: string;
  executionPlanFingerprint: string;
};

export type P122L2IncrementalBinding = {
  incrementalPlanFingerprint: string;
  executionPlanFingerprint: string;
};

export type P122L2PacketInput = {
  phase: P122L2Phase;
  runId: string;
  observedAt: string;
  config: P12_2ManualConfig;
  intentionalInterruptionAfterCheckpointRevision?: number | null;
  resume?: P122L2ResumeBinding | null;
  incremental?: P122L2IncrementalBinding | null;
};

export type P122L2Packet = {
  version: typeof P12_2_L2_VERSION;
  phase: P122L2Phase;
  runId: string;
  observedAt: string;
  siteId: typeof DIAMOND_SHELF_SITE_ID;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  confirmation: typeof P12_2_EXECUTION_CONFIRMATION;
  limits: P12_2ManualConfig["limits"];
  intentionalInterruptionAfterCheckpointRevision: number | null;
  resume: P122L2ResumeBinding | null;
  incremental: P122L2IncrementalBinding | null;
  maxInvocationAttempts: 1;
  automaticWholeRunRetry: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
  deploymentAuthorized: false;
  publicationAuthorized: false;
  fingerprint: string;
};

export type P122L2ExecutionResult =
  | {
      status: "completed";
      receiptFingerprint: string;
    }
  | {
      status: "intentional_interruption";
      checkpointRevision: number;
      checkpointFingerprint: string;
      executionPlanFingerprint: string;
      receiptFingerprint: string;
    };

export type P122L2Receipt = {
  version: typeof P12_2_L2_VERSION;
  packetFingerprint: string;
  phase: P122L2Phase;
  runId: string;
  invocationAttempt: 1;
  automaticRetryPerformed: false;
  result: P122L2ExecutionResult;
  fingerprint: string;
};

export interface P122L2InjectedExecutor {
  execute(packet: P122L2Packet): Promise<P122L2ExecutionResult>;
}

export interface P122L2DurableReceiptStore {
  claim(packet: P122L2Packet): Promise<void>;
  complete(packet: P122L2Packet, receipt: P122L2Receipt): Promise<void>;
}

const HEX64 = /^[0-9a-f]{64}$/;

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function requireRunId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new Error("p12_2_l2_run_id_invalid");
  }
  return value;
}

function requireObservedAt(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("p12_2_l2_observed_at_invalid");
  }
  return value;
}

function requireFingerprint(value: string, code: string): string {
  if (!HEX64.test(value)) throw new Error(code);
  return value;
}

function validatePhaseBindings(input: P122L2PacketInput): void {
  const interruption = input.intentionalInterruptionAfterCheckpointRevision ?? null;
  const resume = input.resume ?? null;
  const incremental = input.incremental ?? null;

  if (input.phase === "full_interrupt") {
    if (!Number.isInteger(interruption) || interruption! < 1) {
      throw new Error("p12_2_l2_interruption_revision_required");
    }
  } else if (interruption !== null) {
    throw new Error("p12_2_l2_interruption_binding_unexpected");
  }

  if (input.phase === "full_resume") {
    if (!resume) throw new Error("p12_2_l2_resume_binding_required");
    if (!Number.isInteger(resume.checkpointRevision) || resume.checkpointRevision < 1) {
      throw new Error("p12_2_l2_resume_revision_invalid");
    }
    requireFingerprint(resume.checkpointFingerprint, "p12_2_l2_resume_checkpoint_fingerprint_invalid");
    requireFingerprint(resume.executionPlanFingerprint, "p12_2_l2_resume_execution_fingerprint_invalid");
  } else if (resume !== null) {
    throw new Error("p12_2_l2_resume_binding_unexpected");
  }

  if (input.phase === "incremental") {
    if (!incremental) throw new Error("p12_2_l2_incremental_binding_required");
    requireFingerprint(incremental.incrementalPlanFingerprint, "p12_2_l2_incremental_plan_fingerprint_invalid");
    requireFingerprint(incremental.executionPlanFingerprint, "p12_2_l2_incremental_execution_fingerprint_invalid");
  } else if (incremental !== null) {
    throw new Error("p12_2_l2_incremental_binding_unexpected");
  }
}

export function buildP122L2Packet(input: P122L2PacketInput): P122L2Packet {
  if (!P12_2_L2_PHASES.includes(input.phase)) throw new Error("p12_2_l2_phase_invalid");
  requireRunId(input.runId);
  requireObservedAt(input.observedAt);
  validatePhaseBindings(input);

  const readiness = inspectP12_2Manual(input.config);
  if (!readiness.confirmationValid) throw new Error("p12_2_l2_manual_confirmation_required");
  if (!readiness.networkReady) throw new Error("p12_2_l2_network_not_ready");
  if (!readiness.liveExecutionAuthorized) throw new Error("p12_2_l2_execution_not_authorized");
  if (!readiness.persistenceReady) throw new Error("p12_2_l2_persistence_not_ready");
  if (!readiness.persistenceAuthorized) throw new Error("p12_2_l2_persistence_not_authorized");
  if (!readiness.executable) throw new Error("p12_2_l2_manual_not_executable");

  const withoutFingerprint: Omit<P122L2Packet, "fingerprint"> = {
    version: P12_2_L2_VERSION,
    phase: input.phase,
    runId: input.runId,
    observedAt: input.observedAt,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    limits: input.config.limits,
    intentionalInterruptionAfterCheckpointRevision:
      input.intentionalInterruptionAfterCheckpointRevision ?? null,
    resume: input.resume ?? null,
    incremental: input.incremental ?? null,
    maxInvocationAttempts: P12_2_L2_MAX_INVOCATION_ATTEMPTS,
    automaticWholeRunRetry: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: sha256(withoutFingerprint),
  });
}

export function p122L2AuthorizationLiteral(packet: P122L2Packet): string {
  return `AUTHORIZE:P12_2_L2_ONE_SHOT:${packet.fingerprint}`;
}

export function assertP122L2PacketIntegrity(packet: P122L2Packet): void {
  if (packet.version !== P12_2_L2_VERSION) throw new Error("p12_2_l2_packet_version_invalid");
  if (!P12_2_L2_PHASES.includes(packet.phase)) throw new Error("p12_2_l2_packet_phase_invalid");
  if (packet.siteId !== DIAMOND_SHELF_SITE_ID) throw new Error("p12_2_l2_packet_site_id_mismatch");
  if (packet.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("p12_2_l2_packet_origin_mismatch");
  }
  if (packet.confirmation !== P12_2_EXECUTION_CONFIRMATION) {
    throw new Error("p12_2_l2_packet_confirmation_invalid");
  }
  if (
    packet.maxInvocationAttempts !== 1 ||
    packet.automaticWholeRunRetry !== false ||
    packet.schedulerEnabled !== false ||
    packet.autonomousWorkerEnabled !== false ||
    packet.providerWrites !== false ||
    packet.publicSiteWrites !== false ||
    packet.deploymentAuthorized !== false ||
    packet.publicationAuthorized !== false
  ) {
    throw new Error("p12_2_l2_packet_safety_boundary_invalid");
  }

  const config: P12_2ManualConfig = {
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: DIAMOND_SHELF_CANONICAL_ORIGIN + "/sitemap.xml",
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
    limits: packet.limits,
  };
  const rebuilt = buildP122L2Packet({
    phase: packet.phase,
    runId: packet.runId,
    observedAt: packet.observedAt,
    config,
    intentionalInterruptionAfterCheckpointRevision: packet.intentionalInterruptionAfterCheckpointRevision,
    resume: packet.resume,
    incremental: packet.incremental,
  });
  if (rebuilt.fingerprint !== packet.fingerprint) {
    throw new Error("p12_2_l2_packet_fingerprint_mismatch");
  }
}

function assertResult(packet: P122L2Packet, result: P122L2ExecutionResult): void {
  requireFingerprint(result.receiptFingerprint, "p12_2_l2_executor_receipt_fingerprint_invalid");
  if (packet.phase === "full_interrupt") {
    if (result.status !== "intentional_interruption") {
      throw new Error("p12_2_l2_expected_intentional_interruption");
    }
    if (
      result.checkpointRevision !== packet.intentionalInterruptionAfterCheckpointRevision
    ) throw new Error("p12_2_l2_interruption_revision_mismatch");
    requireFingerprint(result.checkpointFingerprint, "p12_2_l2_interruption_checkpoint_fingerprint_invalid");
    requireFingerprint(result.executionPlanFingerprint, "p12_2_l2_interruption_execution_fingerprint_invalid");
  } else if (result.status !== "completed") {
    throw new Error("p12_2_l2_unexpected_interruption");
  }
}

export async function executeP122L2OneShot(input: {
  packet: P122L2Packet;
  authorizationLiteral: string;
  priorReceipt?: P122L2Receipt | null;
  executor: P122L2InjectedExecutor;
}): Promise<P122L2Receipt> {
  if (input.authorizationLiteral !== p122L2AuthorizationLiteral(input.packet)) {
    throw new Error("p12_2_l2_operator_authorization_required");
  }
  if (input.priorReceipt?.packetFingerprint === input.packet.fingerprint) {
    throw new Error("p12_2_l2_packet_already_consumed");
  }
  if (!input.executor || typeof input.executor.execute !== "function") {
    throw new Error("p12_2_l2_executor_required");
  }

  const result = await input.executor.execute(input.packet);
  assertResult(input.packet, result);

  const withoutFingerprint: Omit<P122L2Receipt, "fingerprint"> = {
    version: P12_2_L2_VERSION,
    packetFingerprint: input.packet.fingerprint,
    phase: input.packet.phase,
    runId: input.packet.runId,
    invocationAttempt: 1,
    automaticRetryPerformed: false,
    result,
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: sha256(withoutFingerprint),
  });
}

export async function executeP122L2OneShotDurable(input: {
  packet: P122L2Packet;
  authorizationLiteral: string;
  executor: P122L2InjectedExecutor;
  receiptStore: P122L2DurableReceiptStore;
}): Promise<P122L2Receipt> {
  if (input.authorizationLiteral !== p122L2AuthorizationLiteral(input.packet)) {
    throw new Error("p12_2_l2_operator_authorization_required");
  }
  if (!input.executor || typeof input.executor.execute !== "function") {
    throw new Error("p12_2_l2_executor_required");
  }
  if (
    !input.receiptStore ||
    typeof input.receiptStore.claim !== "function" ||
    typeof input.receiptStore.complete !== "function"
  ) {
    throw new Error("p12_2_l2_durable_receipt_store_required");
  }

  await input.receiptStore.claim(input.packet);

  const receipt = await executeP122L2OneShot({
    packet: input.packet,
    authorizationLiteral: input.authorizationLiteral,
    executor: input.executor,
  });
  await input.receiptStore.complete(input.packet, receipt);
  return receipt;
}

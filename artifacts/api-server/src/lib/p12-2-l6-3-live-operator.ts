import { createHash } from "node:crypto";
import {
  executeP12_2BoundedPilotCrawl,
  executeP12_2FullCrawl,
  executeP12_2FullCrawlUntilCheckpoint,
  executeP12_2IncrementalCrawl,
  P12_2_EXECUTION_CONFIRMATION,
  type P12_2ManualConfig,
} from "./first-party-crawl-manual.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import {
  assertP122L2PacketIntegrity,
  executeP122L2OneShotDurable,
  type P122L2ExecutionResult,
  type P122L2InjectedExecutor,
  type P122L2Packet,
  type P122L2Receipt,
} from "./p12-2-l2-one-shot-operator-caller.js";
import { P122L2PostgresReceiptStore } from "./p12-2-l2-durable-receipt-store.js";
import {
  resolveP122L2IncrementalExecutableMaterial,
  type P122L2IncrementalMaterialSource,
} from "./p12-2-l6-2-incremental-material-binding.js";
import type { IncrementalRecrawlPolicy, IncrementalRecrawlTrustedCandidate } from "./incremental-recrawl-planner.js";
import { assertFullSiteCrawlCheckpointFingerprintIntegrity, type FullSiteCrawlCheckpoint } from "./full-site-crawl-control.js";

export const P12_2_L6_3_LIVE_OPERATOR_VERSION = "p12-2-l6-3-live-operator-v1" as const;

export type P122L3OperatorEnvelope = {
  version: typeof P12_2_L6_3_LIVE_OPERATOR_VERSION;
  packet: P122L2Packet;
  resumeCheckpoint?: FullSiteCrawlCheckpoint | null;
  incrementalMaterial?: {
    before: P122L2IncrementalMaterialSource;
    after: P122L2IncrementalMaterialSource;
    policy: IncrementalRecrawlPolicy;
    trustedCandidates?: IncrementalRecrawlTrustedCandidate[];
  } | null;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function configFromPacket(packet: P122L2Packet): P12_2ManualConfig {
  return {
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
}

export function assertP122L3OperatorEnvelopeIntegrity(envelope: P122L3OperatorEnvelope): void {
  if (envelope.version !== P12_2_L6_3_LIVE_OPERATOR_VERSION) {
    throw new Error("p12_2_l6_3_envelope_version_invalid");
  }
  assertP122L2PacketIntegrity(envelope.packet);
  const resume = envelope.resumeCheckpoint ?? null;
  const incremental = envelope.incrementalMaterial ?? null;

  if (envelope.packet.phase === "full_resume") {
    if (!resume || !envelope.packet.resume) throw new Error("p12_2_l6_3_resume_material_required");
    assertFullSiteCrawlCheckpointFingerprintIntegrity(resume);
    if (
      resume.sequence !== envelope.packet.resume.checkpointRevision ||
      resume.fingerprint !== envelope.packet.resume.checkpointFingerprint ||
      resume.planFingerprint !== envelope.packet.resume.executionPlanFingerprint
    ) throw new Error("p12_2_l6_3_resume_material_mismatch");
  } else if (resume !== null) {
    throw new Error("p12_2_l6_3_resume_material_unexpected");
  }

  if (envelope.packet.phase === "incremental") {
    if (!incremental) throw new Error("p12_2_l6_3_incremental_material_required");
  } else if (incremental !== null) {
    throw new Error("p12_2_l6_3_incremental_material_unexpected");
  }
}

export type P122L3ExecutionAdapter = {
  boundedPilotCrawl: typeof executeP12_2BoundedPilotCrawl;
  fullCrawl: typeof executeP12_2FullCrawl;
  fullCrawlUntilCheckpoint: typeof executeP12_2FullCrawlUntilCheckpoint;
  incrementalCrawl: typeof executeP12_2IncrementalCrawl;
};

const DEFAULT_EXECUTION_ADAPTER: P122L3ExecutionAdapter = {
  boundedPilotCrawl: executeP12_2BoundedPilotCrawl,
  fullCrawl: executeP12_2FullCrawl,
  fullCrawlUntilCheckpoint: executeP12_2FullCrawlUntilCheckpoint,
  incrementalCrawl: executeP12_2IncrementalCrawl,
};

export class P122L3LiveExecutor implements P122L2InjectedExecutor {
  constructor(
    private readonly envelope: P122L3OperatorEnvelope,
    private readonly databaseUrl: string,
    private readonly adapter: P122L3ExecutionAdapter = DEFAULT_EXECUTION_ADAPTER,
  ) {}

  async execute(packet: P122L2Packet): Promise<P122L2ExecutionResult> {
    if (packet.fingerprint !== this.envelope.packet.fingerprint) {
      throw new Error("p12_2_l6_3_executor_packet_mismatch");
    }
    const config = configFromPacket(packet);
    const dependencies = { databaseUrl: this.databaseUrl };

    if (packet.phase === "bounded_pilot") {
      const result = await this.adapter.boundedPilotCrawl({
        config, dependencies, runId: packet.runId, observedAt: packet.observedAt,
      });
      return {
        status: "completed",
        receiptFingerprint: result.fingerprint,
        boundedPilotFailureAttribution: result.failureAttribution,
      };
    }

    if (packet.phase === "full_initial") {
      const result = await this.adapter.fullCrawl({
        config, dependencies, runId: packet.runId, observedAt: packet.observedAt, compareToPrevious: false,
      });
      return { status: "completed", receiptFingerprint: result.fingerprint };
    }

    if (packet.phase === "full_reconciliation") {
      const result = await this.adapter.fullCrawl({
        config, dependencies, runId: packet.runId, observedAt: packet.observedAt, compareToPrevious: true,
      });
      return { status: "completed", receiptFingerprint: result.fingerprint };
    }

    if (packet.phase === "full_interrupt") {
      const revision = packet.intentionalInterruptionAfterCheckpointRevision;
      if (revision === null) throw new Error("p12_2_l6_3_interruption_revision_missing");
      const result = await this.adapter.fullCrawlUntilCheckpoint({
        config, dependencies, runId: packet.runId, observedAt: packet.observedAt,
        stopAfterCheckpointRevision: revision,
      });
      return {
        status: "intentional_interruption",
        checkpointRevision: result.checkpointRevision,
        checkpointFingerprint: result.checkpointFingerprint,
        executionPlanFingerprint: result.executionPlanFingerprint,
        receiptFingerprint: result.fingerprint,
      };
    }

    if (packet.phase === "full_resume") {
      const checkpoint = this.envelope.resumeCheckpoint;
      if (!checkpoint) throw new Error("p12_2_l6_3_resume_material_required");
      const result = await this.adapter.fullCrawl({
        config, dependencies, runId: packet.runId, observedAt: packet.observedAt,
        resumeCheckpoint: checkpoint, compareToPrevious: false,
      });
      return { status: "completed", receiptFingerprint: result.fingerprint };
    }

    const materialInput = this.envelope.incrementalMaterial;
    if (!materialInput) throw new Error("p12_2_l6_3_incremental_material_required");
    const material = resolveP122L2IncrementalExecutableMaterial({
      packet,
      before: materialInput.before,
      after: materialInput.after,
      policy: materialInput.policy,
      trustedCandidates: materialInput.trustedCandidates,
    });
    const result = await this.adapter.incrementalCrawl({
      config,
      dependencies,
      run: {
        runId: packet.runId,
        observedAt: packet.observedAt,
        plan: material.incrementalPlan,
        currentExecutionPlan: material.currentExecutionPlan,
      },
    });
    return { status: "completed", receiptFingerprint: result.fingerprint };
  }
}

export async function executeP122L3LiveOperator(input: {
  envelope: P122L3OperatorEnvelope;
  authorizationLiteral: string;
  databaseUrl: string;
}): Promise<P122L2Receipt> {
  const databaseUrl = input.databaseUrl.trim();
  if (!databaseUrl) throw new Error("p12_2_l6_3_database_url_required");
  assertP122L3OperatorEnvelopeIntegrity(input.envelope);

  const store = new P122L2PostgresReceiptStore({ databaseUrl });
  const executor = new P122L3LiveExecutor(input.envelope, databaseUrl);
  return executeP122L2OneShotDurable({
    packet: input.envelope.packet,
    authorizationLiteral: input.authorizationLiteral,
    receiptStore: store,
    executor,
  });
}

export function p122L3LiveOperatorCapability() {
  return Object.freeze({
    version: P12_2_L6_3_LIVE_OPERATOR_VERSION,
    target: "diamond_shelf_first_party",
    exactPacketIntegrityRequired: true,
    packetSpecificAuthorizationRequired: true,
    durableClaimBeforeNetworkExecution: true,
    migrationRequired: "0008_first_party_crawl_l2_invocations.sql",
    maxInvocationAttempts: 1,
    automaticWholeRunRetry: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
}

export function boundedP122L3ErrorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : "p12_2_l6_3_unknown_failure";
  if (/^[a-z0-9_:-]{1,160}$/.test(raw)) return raw;
  return "p12_2_l6_3_failure_" + sha256(raw).slice(0, 16);
}

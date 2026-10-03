import { createHash } from "node:crypto";
import { compareFullSiteCrawlHistory } from "./crawl-history-comparison.js";
import {
  buildIncrementalRecrawlPlan,
  type IncrementalRecrawlPolicy,
  type IncrementalRecrawlTrustedCandidate,
  type IncrementalRecrawlPlan,
} from "./incremental-recrawl-planner.js";
import {
  assertFullSiteCrawlCertificationIntegrity,
  type FullSiteCrawlCertification,
} from "./full-site-crawl-certification.js";
import {
  assertFullSiteCrawlCheckpointIntegrity,
  assertFullSiteCrawlExecutionPlanIntegrity,
  type FullSiteCrawlCheckpoint,
  type FullSiteCrawlExecutionPlan,
} from "./full-site-crawl-control.js";
import type { SitemapInventoryResult } from "./sitemap-inventory.js";
import type { P122L2Packet } from "./p12-2-l2-one-shot-operator-caller.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";

export const P12_2_L6_2_INCREMENTAL_MATERIAL_VERSION = "p12-2-l6-2-incremental-material-v1" as const;

export type P122L2IncrementalMaterialSource = {
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: string;
  inventory: SitemapInventoryResult;
  certification: FullSiteCrawlCertification;
  executionPlan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
};

export type P122L2IncrementalExecutableMaterial = {
  version: typeof P12_2_L6_2_INCREMENTAL_MATERIAL_VERSION;
  packetFingerprint: string;
  beforeRunId: string;
  afterRunId: string;
  comparisonFingerprint: string;
  incrementalPlan: IncrementalRecrawlPlan;
  currentExecutionPlan: FullSiteCrawlExecutionPlan;
  incrementalPlanFingerprint: string;
  executionPlanFingerprint: string;
  trustedCandidateCount: number;
  automaticRetry: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
  executionPerformed: false;
  fingerprint: string;
};

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function assertSource(label: "before" | "after", source: P122L2IncrementalMaterialSource): void {
  if (source.siteId !== DIAMOND_SHELF_SITE_ID) throw new Error(`p12_2_l6_2_${label}_site_id_mismatch`);
  if (source.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error(`p12_2_l6_2_${label}_origin_mismatch`);
  }
  const observedAt = Date.parse(source.observedAt);
  if (!Number.isFinite(observedAt) || new Date(observedAt).toISOString() !== source.observedAt) {
    throw new Error(`p12_2_l6_2_${label}_observed_at_invalid`);
  }
  assertFullSiteCrawlExecutionPlanIntegrity(source.executionPlan);
  assertFullSiteCrawlCheckpointIntegrity(source.executionPlan, source.checkpoint);
  assertFullSiteCrawlCertificationIntegrity(source.certification);
  if (source.checkpoint.status !== "completed") throw new Error(`p12_2_l6_2_${label}_checkpoint_not_completed`);
  if (!source.certification.certification.wholeSiteCertified) {
    throw new Error(`p12_2_l6_2_${label}_not_whole_site_certified`);
  }
  if (source.executionPlan.siteId !== source.siteId || source.executionPlan.canonicalOrigin !== source.canonicalOrigin) {
    throw new Error(`p12_2_l6_2_${label}_execution_identity_mismatch`);
  }
  if (source.checkpoint.siteId !== source.siteId || source.checkpoint.canonicalOrigin !== source.canonicalOrigin) {
    throw new Error(`p12_2_l6_2_${label}_checkpoint_identity_mismatch`);
  }
  if (
    source.inventory.siteId !== source.siteId ||
    source.inventory.canonicalOrigin !== source.canonicalOrigin ||
    source.certification.siteId !== source.siteId ||
    source.certification.canonicalOrigin !== source.canonicalOrigin
  ) {
    throw new Error(`p12_2_l6_2_${label}_source_identity_mismatch`);
  }
  if (
    source.certification.lineage.inventoryFingerprint !== source.inventory.fingerprint ||
    source.certification.lineage.executionPlanFingerprint !== source.executionPlan.fingerprint ||
    source.certification.lineage.checkpointFingerprint !== source.checkpoint.fingerprint
  ) {
    throw new Error(`p12_2_l6_2_${label}_certification_lineage_mismatch`);
  }
}

export function resolveP122L2IncrementalExecutableMaterial(input: {
  packet: P122L2Packet;
  before: P122L2IncrementalMaterialSource;
  after: P122L2IncrementalMaterialSource;
  policy: IncrementalRecrawlPolicy;
  trustedCandidates?: IncrementalRecrawlTrustedCandidate[];
}): P122L2IncrementalExecutableMaterial {
  if (input.packet.phase !== "incremental") throw new Error("p12_2_l6_2_incremental_phase_required");
  if (!input.packet.incremental) throw new Error("p12_2_l6_2_incremental_binding_required");
  if (input.packet.siteId !== DIAMOND_SHELF_SITE_ID) throw new Error("p12_2_l6_2_packet_site_id_mismatch");
  if (input.packet.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("p12_2_l6_2_packet_origin_mismatch");
  }

  assertSource("before", input.before);
  assertSource("after", input.after);

  if (input.before.runId === input.after.runId) throw new Error("p12_2_l6_2_self_lineage_forbidden");
  if (Date.parse(input.before.observedAt) >= Date.parse(input.after.observedAt)) {
    throw new Error("p12_2_l6_2_lineage_chronology_invalid");
  }

  if (
    input.after.executionPlan.source.pageHardLimit !== input.packet.limits.hardPageLimit ||
    input.after.executionPlan.source.absolutePageCeiling !== input.packet.limits.absolutePageCeiling
  ) {
    throw new Error("p12_2_l6_2_packet_full_limit_lineage_mismatch");
  }
  if (
    input.policy.maxPlanUrls !== input.packet.limits.incremental.maxPlanUrls ||
    input.policy.batchSize !== input.packet.limits.incremental.batchSize
  ) {
    throw new Error("p12_2_l6_2_packet_incremental_policy_mismatch");
  }

  const beforeHistory = { inventory: input.before.inventory, certification: input.before.certification };
  const afterHistory = { inventory: input.after.inventory, certification: input.after.certification };
  const comparison = compareFullSiteCrawlHistory({ before: beforeHistory, after: afterHistory });
  const incrementalPlan = buildIncrementalRecrawlPlan({
    comparison,
    before: beforeHistory,
    after: afterHistory,
    policy: input.policy,
    trustedCandidates: input.trustedCandidates,
  });

  if (input.after.executionPlan.fingerprint !== input.packet.incremental.executionPlanFingerprint) {
    throw new Error("p12_2_l6_2_execution_plan_fingerprint_mismatch");
  }
  if (incrementalPlan.source.afterExecutionPlanFingerprint !== input.after.executionPlan.fingerprint) {
    throw new Error("p12_2_l6_2_incremental_execution_lineage_mismatch");
  }
  if (incrementalPlan.fingerprint !== input.packet.incremental.incrementalPlanFingerprint) {
    throw new Error("p12_2_l6_2_incremental_plan_fingerprint_mismatch");
  }

  const withoutFingerprint: Omit<P122L2IncrementalExecutableMaterial, "fingerprint"> = {
    version: P12_2_L6_2_INCREMENTAL_MATERIAL_VERSION,
    packetFingerprint: input.packet.fingerprint,
    beforeRunId: input.before.runId,
    afterRunId: input.after.runId,
    comparisonFingerprint: comparison.fingerprint,
    incrementalPlan,
    currentExecutionPlan: input.after.executionPlan,
    incrementalPlanFingerprint: incrementalPlan.fingerprint,
    executionPlanFingerprint: input.after.executionPlan.fingerprint,
    trustedCandidateCount: input.trustedCandidates?.length ?? 0,
    automaticRetry: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    executionPerformed: false,
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: sha256(withoutFingerprint),
  });
}

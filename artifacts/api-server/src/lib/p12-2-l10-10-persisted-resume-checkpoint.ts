import { FirstPartyCrawlPersistence } from "./first-party-crawl-persistence.js";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
} from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import {
  assertFullSiteCrawlCheckpointFingerprintIntegrity,
  type FullSiteCrawlCheckpoint,
} from "./full-site-crawl-control.js";
import type { P122L2Packet } from "./p12-2-l2-one-shot-operator-caller.js";

export const P12_2_L10_10_VERSION = "p12-2-l10-10-persisted-exact-resume-checkpoint-v1" as const;

export type P122L1010ResumeCheckpointLoaderInput = {
  databaseUrl: string;
  runId: string;
  executionPlanFingerprint: string;
};

export type P122L1010ResumeCheckpointLoader = (
  input: P122L1010ResumeCheckpointLoaderInput,
) => Promise<FullSiteCrawlCheckpoint | null>;

export function assertP122L1010ResumeCheckpointBinding(
  packet: P122L2Packet,
  checkpoint: FullSiteCrawlCheckpoint,
): void {
  if (packet.phase !== "full_resume" || !packet.resume) {
    throw new Error("p12_2_l10_10_resume_binding_required");
  }
  assertFullSiteCrawlCheckpointFingerprintIntegrity(checkpoint);
  if (
    checkpoint.siteId !== packet.siteId ||
    checkpoint.canonicalOrigin !== packet.canonicalOrigin ||
    checkpoint.status !== "pending"
  ) {
    throw new Error("p12_2_l10_10_resume_checkpoint_state_invalid");
  }
  if (
    checkpoint.sequence !== packet.resume.checkpointRevision ||
    checkpoint.fingerprint !== packet.resume.checkpointFingerprint ||
    checkpoint.planFingerprint !== packet.resume.executionPlanFingerprint
  ) {
    throw new Error("p12_2_l10_10_resume_material_mismatch");
  }
}

export const loadP122L1010PersistedResumeCheckpoint: P122L1010ResumeCheckpointLoader = async (input) => {
  const persistence = new FirstPartyCrawlPersistence({ databaseUrl: input.databaseUrl });
  return persistence.loadCheckpoint({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId: input.runId,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: input.executionPlanFingerprint,
  });
};

export function p122L1010PersistedResumeCheckpointCapability() {
  return Object.freeze({
    version: P12_2_L10_10_VERSION,
    persistedCheckpointResolution: true,
    exactRunIdRequired: true,
    exactExecutionPlanFingerprintRequired: true,
    exactCheckpointRevisionRequired: true,
    exactCheckpointFingerprintRequired: true,
    checkpointPayloadTransportRequired: false,
    rawCheckpointLoggingRequired: false,
    failClosedBeforePageExecution: true,
  });
}

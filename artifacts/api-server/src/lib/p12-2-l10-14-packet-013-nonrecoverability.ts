import { createHash } from "node:crypto";
import {
  assertP122L2PacketIntegrity,
  buildP122L2Packet,
  type P122L2Packet,
} from "./p12-2-l2-one-shot-operator-caller.js";
import type { P12_2ManualConfig } from "./first-party-crawl-manual.js";

export const P12_2_L10_14_VERSION =
  "p12-2-l10-14-legacy-packet-013-nonrecoverability-v1" as const;

export const P12_2_L10_14_PACKET_013 = Object.freeze({
  runId: "p12-2-diamond-shelf-full-interrupt-010",
  executionPlanFingerprint: "0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa",
  finalCheckpointRevision: 307,
  finalCheckpointFingerprint: "6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99",
  totalUrls: 3044,
  finalizedUrls: 3044,
  pendingUrls: 0,
  terminalFailures: 1,
  railwayDeploymentId: "87389cf3-5aae-4c29-ab10-2023aa7f5aad",
  terminalOperatorCode: "p12_2_persistence_completed_run_not_certified",
  railwayLogCanonicalUrlCaptured: false,
  checkpointRevisionHistoryRetained: false,
  terminalFailureEventsAvailableAtExecution: false,
  accountingSnapshotAvailableAtExecution: false,
  rawResponseBodyPersisted: false,
  pageContentPersisted: false,
} as const);

export const P12_2_L10_14_TRUSTED_EXACT_URL_SOURCES = Object.freeze([
  "terminal_failure_event",
  "immutable_url_outcome_receipt",
  "historical_checkpoint_transition",
  "operator_log",
] as const);

export type P122L1014ExactUrlEvidenceSource =
  (typeof P12_2_L10_14_TRUSTED_EXACT_URL_SOURCES)[number];

export type P122L1014EvidenceSource =
  | P122L1014ExactUrlEvidenceSource
  | "aggregate_checkpoint"
  | "fresh_recrawl"
  | "manual_guess";

export type P122L1014EvidenceCandidate = {
  source: P122L1014EvidenceSource;
  canonicalUrl: string | null;
  runId: string;
  executionPlanFingerprint: string;
  directUrlIdentity: boolean;
  immutable: boolean;
  contemporaneous: boolean;
};

export type P122L1014Assessment = {
  version: typeof P12_2_L10_14_VERSION;
  runId: typeof P12_2_L10_14_PACKET_013.runId;
  executionPlanFingerprint: typeof P12_2_L10_14_PACKET_013.executionPlanFingerprint;
  status: "exact_url_identified" | "legacy_exact_url_unavailable";
  exactCanonicalUrl: string | null;
  packet013RecoveryAuthorized: false;
  packet013BackfillAuthorized: false;
  freshRunRequired: boolean;
  safeNextPhase: "full_initial" | null;
  reasons: readonly string[];
  fingerprint: string;
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function assertCanonicalDiamondShelfUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("p12_2_l10_14_evidence_url_invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== "https://diamondshelf.us" ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error("p12_2_l10_14_evidence_url_invalid");
  }
}

function evidenceIsExact(candidate: P122L1014EvidenceCandidate): boolean {
  if (
    candidate.runId !== P12_2_L10_14_PACKET_013.runId ||
    candidate.executionPlanFingerprint !== P12_2_L10_14_PACKET_013.executionPlanFingerprint
  ) {
    throw new Error("p12_2_l10_14_evidence_lineage_mismatch");
  }
  if (candidate.canonicalUrl !== null) assertCanonicalDiamondShelfUrl(candidate.canonicalUrl);
  return (
    candidate.canonicalUrl !== null &&
    candidate.directUrlIdentity === true &&
    candidate.immutable === true &&
    candidate.contemporaneous === true &&
    (P12_2_L10_14_TRUSTED_EXACT_URL_SOURCES as readonly string[]).includes(candidate.source)
  );
}

export function assessP122L1014Packet013Evidence(
  candidates: readonly P122L1014EvidenceCandidate[],
): P122L1014Assessment {
  const exactUrls = [...new Set(
    candidates
      .filter(evidenceIsExact)
      .map((candidate) => candidate.canonicalUrl!)
      .sort(),
  )];

  if (exactUrls.length > 1) {
    throw new Error("p12_2_l10_14_conflicting_exact_url_evidence");
  }

  const exactCanonicalUrl = exactUrls[0] ?? null;
  const reasons = exactCanonicalUrl
    ? ["trustworthy_exact_url_identity_present"]
    : [
        "railway_log_does_not_identify_url",
        "checkpoint_revision_history_not_retained",
        "terminal_failure_events_not_available_for_legacy_execution",
        "accounting_snapshot_not_available_for_legacy_execution",
        "aggregate_terminal_failure_counter_not_url_identity",
        "guess_or_recrawl_not_historical_identity_evidence",
      ];

  const withoutFingerprint = {
    version: P12_2_L10_14_VERSION,
    runId: P12_2_L10_14_PACKET_013.runId,
    executionPlanFingerprint: P12_2_L10_14_PACKET_013.executionPlanFingerprint,
    status: exactCanonicalUrl ? "exact_url_identified" as const : "legacy_exact_url_unavailable" as const,
    exactCanonicalUrl,
    packet013RecoveryAuthorized: false as const,
    packet013BackfillAuthorized: false as const,
    freshRunRequired: exactCanonicalUrl === null,
    safeNextPhase: exactCanonicalUrl === null ? "full_initial" as const : null,
    reasons: Object.freeze([...reasons].sort()),
  };

  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  });
}

export function p122L1014CanonicalPacket013Assessment(): P122L1014Assessment {
  return assessP122L1014Packet013Evidence([]);
}

export function buildP122L1014FreshFullInitialPacket(input: {
  runId: string;
  observedAt: string;
  config: P12_2ManualConfig;
}): P122L2Packet {
  if (input.runId === P12_2_L10_14_PACKET_013.runId) {
    throw new Error("p12_2_l10_14_legacy_run_id_reuse_forbidden");
  }

  const assessment = p122L1014CanonicalPacket013Assessment();
  if (!assessment.freshRunRequired || assessment.safeNextPhase !== "full_initial") {
    throw new Error("p12_2_l10_14_fresh_run_not_required");
  }

  const packet = buildP122L2Packet({
    phase: "full_initial",
    runId: input.runId,
    observedAt: input.observedAt,
    config: input.config,
  });
  assertP122L2PacketIntegrity(packet);

  if (
    packet.phase !== "full_initial" ||
    packet.resume !== null ||
    packet.incremental !== null ||
    packet.intentionalInterruptionAfterCheckpointRevision !== null
  ) {
    throw new Error("p12_2_l10_14_fresh_run_packet_invalid");
  }
  return packet;
}

export function p122L1014Capability() {
  return Object.freeze({
    version: P12_2_L10_14_VERSION,
    packet013ExactUrlIdentified: false,
    packet013RecoveryAuthorized: false,
    packet013BackfillAuthorized: false,
    guessedUrlRecoveryAllowed: false,
    freshRecrawlAsHistoricalEvidenceAllowed: false,
    freshFullInitialPacketPlanningAllowed: true,
    liveCrawlExecutionAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    schedulerWorkerActivationAuthorized: false,
    providerOrPublicSiteWriteAuthorized: false,
    deploymentOrPublicationAuthorized: false,
  });
}

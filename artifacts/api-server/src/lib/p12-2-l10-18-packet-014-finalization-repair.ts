import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
} from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import {
  buildP122L2Receipt,
  type P122L2ExecutionResult,
  type P122L2Receipt,
} from "./p12-2-l2-one-shot-operator-caller.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_PACKET,
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";

export const P12_2_L10_18_VERSION =
  "p12-2-l10-18-packet-014-bounded-durable-finalization-v1" as const;

export const P12_2_L10_18_PROJECT_ID =
  "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_18_ENVIRONMENT_ID =
  "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_18_POSTGRES_SERVICE_ID =
  "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;

export const P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT =
  "62022df7bea241b7f86a5286271686c9aa4d0f62bead39a626d1914845e5760b" as const;
export const P12_2_L10_18_INVENTORY_FINGERPRINT =
  "8d650efa3831ae7d8e66c1a43259ff5b5070a543edd191d572a5aad6fe502e67" as const;
export const P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT =
  "f1aee026cc2227f9d72642e25b7ed4935fdfa94bcdc508e4eda7344a2d2b608f" as const;
export const P12_2_L10_18_FINAL_CHECKPOINT_REVISION = 306 as const;

export const P12_2_L10_18_FAILURE_URL =
  "https://diamondshelf.us/blogs/news" as const;
export const P12_2_L10_18_FAILURE_EVENT_FINGERPRINT =
  "2ad7b75d87a05d4c49090afef13278b96a635b881391bd835ae3388e8d989693" as const;
export const P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT =
  "07902f476e0be0e58fe95053428dac51db6ac64b1b22e2c8c541af9be1249d66" as const;
export const P12_2_L10_18_FAILURE_CHECKPOINT_REVISION = 1 as const;

export const P12_2_L10_18_EXPECTED_COUNTERS = Object.freeze({
  totalUrls: 3044,
  finalizedUrls: 3044,
  pendingUrls: 0,
  completedBatches: 305,
  totalBatches: 305,
  fetchedSuccessful: 3043,
  redirects: 0,
  robotsExcluded: 0,
  noindex: 0,
  terminalFailures: 1,
  attemptsRecorded: 3045,
  retryScheduled: 1,
} as const);

const HEX64 = /^[0-9a-f]{64}$/;

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
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

export type P122L1018CompactFinalizationSnapshot = {
  version: typeof P12_2_L10_18_VERSION;
  kind: "packet_014_compact_accounting_finalization";
  packetFingerprint: typeof P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT;
  phase: "full_initial";
  runId: typeof P12_2_L10_15_RUN_ID;
  observedAt: typeof P12_2_L10_15_OBSERVED_AT;
  siteId: typeof DIAMOND_SHELF_SITE_ID;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: typeof P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT;
  inventoryFingerprint: typeof P12_2_L10_18_INVENTORY_FINGERPRINT;
  checkpoint: {
    fingerprint: typeof P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT;
    sequence: typeof P12_2_L10_18_FINAL_CHECKPOINT_REVISION;
    status: "completed";
    counters: {
      fetchedSuccessful: 3043;
      redirects: 0;
      robotsExcluded: 0;
      noindex: 0;
      terminalFailures: 1;
      attemptsRecorded: 3045;
      retryScheduled: 1;
    };
    progress: {
      totalUrls: 3044;
      finalizedUrls: 3044;
      pendingUrls: 0;
      completedBatches: 305;
      totalBatches: 305;
      wholeSiteCertified: false;
    };
  };
  terminalFailureEvidence: readonly [{
    canonicalUrl: typeof P12_2_L10_18_FAILURE_URL;
    eventFingerprint: typeof P12_2_L10_18_FAILURE_EVENT_FINGERPRINT;
    eventType: "terminal_failure";
    sourceEventFingerprint: null;
    eventCheckpointFingerprint: typeof P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT;
    eventCheckpointRevision: typeof P12_2_L10_18_FAILURE_CHECKPOINT_REVISION;
  }];
  certification: {
    certification: {
      wholeSiteCertified: false;
      wholeSiteReason: "blocked";
      blockers: readonly ["terminal_failures_present"];
      assertsCompletenessOnly: true;
      assertsSeoHealth: false;
    };
  };
  reconstruction: {
    fullBridgeSnapshotReconstructed: false;
    inventoryPayloadPersisted: false;
    executionPlanPayloadPersisted: false;
    noNetworkRefetch: true;
    noCrawlReplay: true;
    source: "durable_checkpoint_and_terminal_failure_event";
  };
  persistence: {
    checkpointMutated: false;
    terminalFailureEventMutated: false;
    completedRunCreated: false;
    accountingSnapshotInserted: true;
    invocationCompleted: true;
  };
  fingerprint: string;
};

export type P122L1018AccountingReceipt = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  status: "accounting_complete_uncertified";
  runId: typeof P12_2_L10_15_RUN_ID;
  observedAt: typeof P12_2_L10_15_OBSERVED_AT;
  siteId: typeof DIAMOND_SHELF_SITE_ID;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: typeof P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT;
  checkpointRevision: typeof P12_2_L10_18_FINAL_CHECKPOINT_REVISION;
  checkpointFingerprint: typeof P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT;
  accountingSnapshotFingerprint: string;
  terminalFailures: 1;
  blockers: readonly ["terminal_failures_present"];
  persistence: {
    checkpointPersisted: true;
    accountingSnapshotPersisted: true;
    completedRunPersisted: false;
    terminalFailureEvidencePersisted: true;
    rawResponseBodyPersisted: false;
    rawSitemapXmlPersisted: false;
    pageContentPersisted: false;
  };
  fingerprint: string;
};

export function buildP122L1018CompactFinalizationSnapshot(): P122L1018CompactFinalizationSnapshot {
  const withoutFingerprint: Omit<P122L1018CompactFinalizationSnapshot, "fingerprint"> = {
    version: P12_2_L10_18_VERSION,
    kind: "packet_014_compact_accounting_finalization",
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    phase: "full_initial",
    runId: P12_2_L10_15_RUN_ID,
    observedAt: P12_2_L10_15_OBSERVED_AT,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    inventoryFingerprint: P12_2_L10_18_INVENTORY_FINGERPRINT,
    checkpoint: {
      fingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
      sequence: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
      status: "completed",
      counters: {
        fetchedSuccessful: P12_2_L10_18_EXPECTED_COUNTERS.fetchedSuccessful,
        redirects: P12_2_L10_18_EXPECTED_COUNTERS.redirects,
        robotsExcluded: P12_2_L10_18_EXPECTED_COUNTERS.robotsExcluded,
        noindex: P12_2_L10_18_EXPECTED_COUNTERS.noindex,
        terminalFailures: P12_2_L10_18_EXPECTED_COUNTERS.terminalFailures,
        attemptsRecorded: P12_2_L10_18_EXPECTED_COUNTERS.attemptsRecorded,
        retryScheduled: P12_2_L10_18_EXPECTED_COUNTERS.retryScheduled,
      },
      progress: {
        totalUrls: P12_2_L10_18_EXPECTED_COUNTERS.totalUrls,
        finalizedUrls: P12_2_L10_18_EXPECTED_COUNTERS.finalizedUrls,
        pendingUrls: P12_2_L10_18_EXPECTED_COUNTERS.pendingUrls,
        completedBatches: P12_2_L10_18_EXPECTED_COUNTERS.completedBatches,
        totalBatches: P12_2_L10_18_EXPECTED_COUNTERS.totalBatches,
        wholeSiteCertified: false,
      },
    },
    terminalFailureEvidence: [{
      canonicalUrl: P12_2_L10_18_FAILURE_URL,
      eventFingerprint: P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
      eventType: "terminal_failure",
      sourceEventFingerprint: null,
      eventCheckpointFingerprint: P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT,
      eventCheckpointRevision: P12_2_L10_18_FAILURE_CHECKPOINT_REVISION,
    }],
    certification: {
      certification: {
        wholeSiteCertified: false,
        wholeSiteReason: "blocked",
        blockers: ["terminal_failures_present"],
        assertsCompletenessOnly: true,
        assertsSeoHealth: false,
      },
    },
    reconstruction: {
      fullBridgeSnapshotReconstructed: false,
      inventoryPayloadPersisted: false,
      executionPlanPayloadPersisted: false,
      noNetworkRefetch: true,
      noCrawlReplay: true,
      source: "durable_checkpoint_and_terminal_failure_event",
    },
    persistence: {
      checkpointMutated: false,
      terminalFailureEventMutated: false,
      completedRunCreated: false,
      accountingSnapshotInserted: true,
      invocationCompleted: true,
    },
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  });
}

export function buildP122L1018AccountingReceipt(
  snapshot = buildP122L1018CompactFinalizationSnapshot(),
): P122L1018AccountingReceipt {
  const withoutFingerprint: Omit<P122L1018AccountingReceipt, "fingerprint"> = {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    status: "accounting_complete_uncertified",
    runId: P12_2_L10_15_RUN_ID,
    observedAt: P12_2_L10_15_OBSERVED_AT,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    accountingSnapshotFingerprint: snapshot.fingerprint,
    terminalFailures: 1,
    blockers: ["terminal_failures_present"],
    persistence: {
      checkpointPersisted: true,
      accountingSnapshotPersisted: true,
      completedRunPersisted: false,
      terminalFailureEvidencePersisted: true,
      rawResponseBodyPersisted: false,
      rawSitemapXmlPersisted: false,
      pageContentPersisted: false,
    },
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  });
}

export function buildP122L1018L2Receipt(
  accountingReceipt = buildP122L1018AccountingReceipt(),
): P122L2Receipt {
  const result: P122L2ExecutionResult = {
    status: "accounting_complete_uncertified",
    checkpointRevision: accountingReceipt.checkpointRevision,
    checkpointFingerprint: accountingReceipt.checkpointFingerprint,
    accountingSnapshotFingerprint: accountingReceipt.accountingSnapshotFingerprint,
    terminalFailures: accountingReceipt.terminalFailures,
    receiptFingerprint: accountingReceipt.fingerprint,
  };
  return buildP122L2Receipt(P12_2_L10_15_PACKET, result);
}

export function assertP122L1018DeterministicOutputs(): void {
  const snapshot = buildP122L1018CompactFinalizationSnapshot();
  const accountingReceipt = buildP122L1018AccountingReceipt(snapshot);
  const l2Receipt = buildP122L1018L2Receipt(accountingReceipt);
  for (const value of [
    snapshot.fingerprint,
    accountingReceipt.fingerprint,
    l2Receipt.fingerprint,
  ]) {
    if (!HEX64.test(value)) throw new Error("p12_2_l10_18_output_fingerprint_invalid");
  }
  if (
    l2Receipt.packetFingerprint !== P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT ||
    l2Receipt.phase !== "full_initial" ||
    l2Receipt.runId !== P12_2_L10_15_RUN_ID ||
    l2Receipt.result.status !== "accounting_complete_uncertified" ||
    l2Receipt.result.checkpointFingerprint !== P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT ||
    l2Receipt.result.checkpointRevision !== P12_2_L10_18_FINAL_CHECKPOINT_REVISION ||
    l2Receipt.result.accountingSnapshotFingerprint !== snapshot.fingerprint ||
    l2Receipt.result.terminalFailures !== 1 ||
    l2Receipt.result.receiptFingerprint !== accountingReceipt.fingerprint
  ) {
    throw new Error("p12_2_l10_18_output_lineage_invalid");
  }
}

export function p122L1018RepairAuthorizationFingerprint(): string {
  assertP122L1018DeterministicOutputs();
  const snapshot = buildP122L1018CompactFinalizationSnapshot();
  const accountingReceipt = buildP122L1018AccountingReceipt(snapshot);
  const l2Receipt = buildP122L1018L2Receipt(accountingReceipt);
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_18_VERSION,
    projectId: P12_2_L10_18_PROJECT_ID,
    environmentId: P12_2_L10_18_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_18_POSTGRES_SERVICE_ID,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    observedAt: P12_2_L10_15_OBSERVED_AT,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    inventoryFingerprint: P12_2_L10_18_INVENTORY_FINGERPRINT,
    finalCheckpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    finalCheckpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    failureUrl: P12_2_L10_18_FAILURE_URL,
    failureEventFingerprint: P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
    failureCheckpointFingerprint: P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT,
    failureCheckpointRevision: P12_2_L10_18_FAILURE_CHECKPOINT_REVISION,
    expectedCounters: P12_2_L10_18_EXPECTED_COUNTERS,
    snapshotFingerprint: snapshot.fingerprint,
    accountingReceiptFingerprint: accountingReceipt.fingerprint,
    l2ReceiptFingerprint: l2Receipt.fingerprint,
    databaseWrites: [
      "insert_exactly_one_accounting_snapshot_if_absent",
      "complete_exact_existing_l2_claim",
    ],
    checkpointMutation: false,
    terminalFailureEventMutation: false,
    completedRunMutation: false,
    recoveryReceiptMutation: false,
    networkRequests: false,
    crawlReplay: false,
    attempts: 1,
    automaticRetry: false,
  })).digest("hex");
}

export function p122L1018RepairAuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_18_PACKET_014_FINALIZATION_REPAIR:${p122L1018RepairAuthorizationFingerprint()}`;
}

export type P122L1018RepairResult = {
  version: typeof P12_2_L10_18_VERSION;
  status: "finalized" | "already_finalized";
  packetFingerprint: typeof P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT;
  runId: typeof P12_2_L10_15_RUN_ID;
  checkpointFingerprint: typeof P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT;
  checkpointRevision: typeof P12_2_L10_18_FINAL_CHECKPOINT_REVISION;
  failureUrl: typeof P12_2_L10_18_FAILURE_URL;
  accountingSnapshotFingerprint: string;
  accountingReceiptFingerprint: string;
  l2ReceiptFingerprint: string;
  databaseWritesPerformed: boolean;
  networkRequestsPerformed: false;
  crawlReplayPerformed: false;
};

type Sql = ReturnType<typeof postgres>;

function exactJson(value: unknown): string {
  return stableSerialize(value);
}

export async function executeP122L1018FinalizationRepair(input: {
  authorizationLiteral: string;
  databaseUrl: string;
  sqlFactory?: (databaseUrl: string) => Sql;
}): Promise<P122L1018RepairResult> {
  if (input.authorizationLiteral !== p122L1018RepairAuthorizationLiteral()) {
    throw new Error("p12_2_l10_18_repair_authorization_required");
  }
  const databaseUrl = input.databaseUrl.trim();
  if (!databaseUrl) throw new Error("p12_2_l10_18_database_url_required");

  const snapshot = buildP122L1018CompactFinalizationSnapshot();
  const accountingReceipt = buildP122L1018AccountingReceipt(snapshot);
  const l2Receipt = buildP122L1018L2Receipt(accountingReceipt);
  const sqlFactory = input.sqlFactory ?? ((url: string) => postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  }));
  const sql = sqlFactory(databaseUrl);

  try {
    return await sql.begin(async (tx) => {
      await tx`
        SELECT pg_advisory_xact_lock(
          hashtext('p12_2_l10_18_packet_014_finalization'),
          hashtext(${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT})
        )
      `;

      const invocationRows = await tx<{
        status: string;
        receipt_fingerprint: string | null;
        receipt_payload: unknown | null;
      }[]>`
        SELECT status, receipt_fingerprint, receipt_payload
        FROM first_party_crawl_l2_invocations
        WHERE packet_fingerprint = ${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}
          AND site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND phase = 'full_initial'
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND observed_at = ${P12_2_L10_15_OBSERVED_AT}::timestamptz
        FOR UPDATE
      `;
      if (invocationRows.length !== 1) throw new Error("p12_2_l10_18_invocation_identity_invalid");

      const checkpointRows = await tx<{
        execution_plan_fingerprint: string;
        checkpoint_fingerprint: string;
        checkpoint_revision: number;
        checkpoint_payload: Record<string, unknown>;
      }[]>`
        SELECT execution_plan_fingerprint, checkpoint_fingerprint,
               checkpoint_revision, checkpoint_payload
        FROM first_party_crawl_checkpoints
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
        FOR UPDATE
      `;
      if (checkpointRows.length !== 1) throw new Error("p12_2_l10_18_checkpoint_identity_invalid");
      const checkpoint = checkpointRows[0]!;
      const payload = checkpoint.checkpoint_payload as {
        fingerprint?: string;
        planFingerprint?: string;
        inventoryFingerprint?: string;
        status?: string;
        pendingCanonicalUrls?: unknown[];
        counters?: Record<string, unknown>;
        progress?: Record<string, unknown>;
      };
      if (
        checkpoint.execution_plan_fingerprint !== P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT ||
        checkpoint.checkpoint_fingerprint !== P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT ||
        Number(checkpoint.checkpoint_revision) !== P12_2_L10_18_FINAL_CHECKPOINT_REVISION ||
        payload.fingerprint !== P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT ||
        payload.planFingerprint !== P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT ||
        payload.inventoryFingerprint !== P12_2_L10_18_INVENTORY_FINGERPRINT ||
        payload.status !== "completed" ||
        !Array.isArray(payload.pendingCanonicalUrls) ||
        payload.pendingCanonicalUrls.length !== 0
      ) throw new Error("p12_2_l10_18_checkpoint_lineage_invalid");

      const counters = payload.counters ?? {};
      const progress = payload.progress ?? {};
      const exactNumbers: Array<[unknown, number]> = [
        [progress.totalUrls, P12_2_L10_18_EXPECTED_COUNTERS.totalUrls],
        [progress.finalizedUrls, P12_2_L10_18_EXPECTED_COUNTERS.finalizedUrls],
        [progress.pendingUrls, P12_2_L10_18_EXPECTED_COUNTERS.pendingUrls],
        [progress.completedBatches, P12_2_L10_18_EXPECTED_COUNTERS.completedBatches],
        [progress.totalBatches, P12_2_L10_18_EXPECTED_COUNTERS.totalBatches],
        [counters.fetchedSuccessful, P12_2_L10_18_EXPECTED_COUNTERS.fetchedSuccessful],
        [counters.redirects, P12_2_L10_18_EXPECTED_COUNTERS.redirects],
        [counters.robotsExcluded, P12_2_L10_18_EXPECTED_COUNTERS.robotsExcluded],
        [counters.noindex, P12_2_L10_18_EXPECTED_COUNTERS.noindex],
        [counters.terminalFailures, P12_2_L10_18_EXPECTED_COUNTERS.terminalFailures],
        [counters.attemptsRecorded, P12_2_L10_18_EXPECTED_COUNTERS.attemptsRecorded],
        [counters.retryScheduled, P12_2_L10_18_EXPECTED_COUNTERS.retryScheduled],
      ];
      if (exactNumbers.some(([actual, expected]) => Number(actual) !== expected)) {
        throw new Error("p12_2_l10_18_checkpoint_accounting_invalid");
      }

      const eventRows = await tx<{
        canonical_url: string;
        event_type: string;
        source_event_fingerprint: string | null;
        checkpoint_fingerprint: string;
        checkpoint_revision: number;
        event_fingerprint: string;
        event_payload: Record<string, unknown>;
      }[]>`
        SELECT canonical_url, event_type, source_event_fingerprint,
               checkpoint_fingerprint, checkpoint_revision,
               event_fingerprint, event_payload
        FROM first_party_crawl_terminal_failure_events
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint = ${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
        ORDER BY event_id
        FOR UPDATE
      `;
      if (eventRows.length !== 1) throw new Error("p12_2_l10_18_terminal_failure_count_invalid");
      const event = eventRows[0]!;
      if (
        event.canonical_url !== P12_2_L10_18_FAILURE_URL ||
        event.event_type !== "terminal_failure" ||
        event.source_event_fingerprint !== null ||
        event.checkpoint_fingerprint !== P12_2_L10_18_FAILURE_CHECKPOINT_FINGERPRINT ||
        Number(event.checkpoint_revision) !== P12_2_L10_18_FAILURE_CHECKPOINT_REVISION ||
        event.event_fingerprint !== P12_2_L10_18_FAILURE_EVENT_FINGERPRINT ||
        event.event_payload?.fingerprint !== P12_2_L10_18_FAILURE_EVENT_FINGERPRINT
      ) throw new Error("p12_2_l10_18_terminal_failure_lineage_invalid");

      const completedRows = await tx<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM first_party_crawl_completed_runs
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
      `;
      if (Number(completedRows[0]?.count ?? -1) !== 0) {
        throw new Error("p12_2_l10_18_completed_run_unexpected");
      }

      const recoveryRows = await tx<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM first_party_crawl_terminal_failure_recovery_receipts
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
      `;
      if (Number(recoveryRows[0]?.count ?? -1) !== 0) {
        throw new Error("p12_2_l10_18_recovery_receipt_unexpected");
      }

      const accountingRows = await tx<{
        snapshot_fingerprint: string;
        snapshot_payload: unknown;
        whole_site_certified: boolean;
        terminal_failure_count: number;
      }[]>`
        SELECT snapshot_fingerprint, snapshot_payload,
               whole_site_certified, terminal_failure_count
        FROM first_party_crawl_accounting_snapshots
        WHERE site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint = ${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
        FOR UPDATE
      `;

      const invocation = invocationRows[0]!;
      if (accountingRows.length === 1 && invocation.status === "completed") {
        const existing = accountingRows[0]!;
        if (
          existing.snapshot_fingerprint === snapshot.fingerprint &&
          exactJson(existing.snapshot_payload) === exactJson(snapshot) &&
          existing.whole_site_certified === false &&
          Number(existing.terminal_failure_count) === 1 &&
          invocation.receipt_fingerprint === l2Receipt.fingerprint &&
          exactJson(invocation.receipt_payload) === exactJson(l2Receipt)
        ) {
          return {
            version: P12_2_L10_18_VERSION,
            status: "already_finalized",
            packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
            runId: P12_2_L10_15_RUN_ID,
            checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
            checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
            failureUrl: P12_2_L10_18_FAILURE_URL,
            accountingSnapshotFingerprint: snapshot.fingerprint,
            accountingReceiptFingerprint: accountingReceipt.fingerprint,
            l2ReceiptFingerprint: l2Receipt.fingerprint,
            databaseWritesPerformed: false,
            networkRequestsPerformed: false,
            crawlReplayPerformed: false,
          };
        }
        throw new Error("p12_2_l10_18_existing_finalization_conflict");
      }

      if (
        accountingRows.length !== 0 ||
        invocation.status !== "claimed" ||
        invocation.receipt_fingerprint !== null ||
        invocation.receipt_payload !== null
      ) {
        throw new Error("p12_2_l10_18_pre_repair_state_invalid");
      }

      await tx`
        INSERT INTO first_party_crawl_accounting_snapshots (
          accounting_snapshot_id, site_id, run_id, canonical_origin,
          execution_plan_fingerprint, checkpoint_fingerprint,
          checkpoint_revision, snapshot_fingerprint,
          whole_site_certified, terminal_failure_count,
          observed_at, snapshot_payload
        ) VALUES (
          ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid,
          ${P12_2_L10_15_RUN_ID}, ${DIAMOND_SHELF_CANONICAL_ORIGIN},
          ${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT},
          ${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT},
          ${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}::bigint,
          ${snapshot.fingerprint}, false, 1,
          ${P12_2_L10_15_OBSERVED_AT}::timestamptz,
          ${tx.json(snapshot)}
        )
      `;

      const updated = await tx<{ packet_fingerprint: string }[]>`
        UPDATE first_party_crawl_l2_invocations
        SET status = 'completed',
            receipt_fingerprint = ${l2Receipt.fingerprint},
            receipt_payload = ${tx.json(l2Receipt)}
        WHERE packet_fingerprint = ${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}
          AND site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND phase = 'full_initial'
          AND run_id = ${P12_2_L10_15_RUN_ID}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND observed_at = ${P12_2_L10_15_OBSERVED_AT}::timestamptz
          AND status = 'claimed'
          AND receipt_fingerprint IS NULL
          AND receipt_payload IS NULL
        RETURNING packet_fingerprint
      `;
      if (updated.length !== 1) throw new Error("p12_2_l10_18_invocation_completion_failed");

      return {
        version: P12_2_L10_18_VERSION,
        status: "finalized",
        packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
        runId: P12_2_L10_15_RUN_ID,
        checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
        checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
        failureUrl: P12_2_L10_18_FAILURE_URL,
        accountingSnapshotFingerprint: snapshot.fingerprint,
        accountingReceiptFingerprint: accountingReceipt.fingerprint,
        l2ReceiptFingerprint: l2Receipt.fingerprint,
        databaseWritesPerformed: true,
        networkRequestsPerformed: false,
        crawlReplayPerformed: false,
      };
    });
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export function p122L1018Capability() {
  const snapshot = buildP122L1018CompactFinalizationSnapshot();
  const accountingReceipt = buildP122L1018AccountingReceipt(snapshot);
  const l2Receipt = buildP122L1018L2Receipt(accountingReceipt);
  return Object.freeze({
    version: P12_2_L10_18_VERSION,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    inventoryFingerprint: P12_2_L10_18_INVENTORY_FINGERPRINT,
    checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    terminalFailureUrl: P12_2_L10_18_FAILURE_URL,
    terminalFailureEventFingerprint: P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
    compactSnapshotFingerprint: snapshot.fingerprint,
    accountingReceiptFingerprint: accountingReceipt.fingerprint,
    l2ReceiptFingerprint: l2Receipt.fingerprint,
    fullBridgeSnapshotReconstruction: false,
    networkRefetch: false,
    crawlReplay: false,
    checkpointMutation: false,
    terminalFailureEventMutation: false,
    completedRunMutation: false,
    recoveryReceiptMutation: false,
    accountingSnapshotInsert: true,
    l2InvocationCompletion: true,
    schemaMigrationRequired: false,
    automaticRetry: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  } as const);
}

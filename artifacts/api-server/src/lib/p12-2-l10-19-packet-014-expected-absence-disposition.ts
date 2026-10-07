import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";
import { planFirstPartyCrawl } from "./crawl-controller.js";
import {
  DIAMOND_SHELF_CANONICAL_ORIGIN,
  P12_2_CRAWL_BRIDGE_VERSION,
  type FirstPartyPageTransport,
  type FirstPartySitemapAcquirer,
  type PageTransportResult,
} from "./first-party-crawl-runtime-bridge.js";
import {
  assertTerminalFailureEventIntegrity,
  type TerminalFailureEvent,
} from "./first-party-crawl-terminal-recovery.js";
import {
  createFirstPartyPageTransport,
  createFirstPartySitemapAcquirer,
  DIAMOND_SHELF_SITE_ID,
  type FirstPartyLiveAdapterOptions,
} from "./first-party-live-adapters.js";
import { buildSitemapInventory, type SitemapInventoryResult } from "./sitemap-inventory.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_RUN_ID,
  p122L1015ManualConfig,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_18_ENVIRONMENT_ID,
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
  P12_2_L10_18_POSTGRES_SERVICE_ID,
  P12_2_L10_18_PROJECT_ID,
  buildP122L1018CompactFinalizationSnapshot,
  buildP122L1018L2Receipt,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";

export const P12_2_L10_19_VERSION =
  "p12-2-l10-19-packet-014-expected-absence-disposition-v1" as const;
export const P12_2_L10_19_RECONCILIATION_VERSION =
  "p12-2-l10-19-packet-014-expected-absence-reconciliation-v1" as const;

export const P12_2_L10_19_PROJECT_ID = P12_2_L10_18_PROJECT_ID;
export const P12_2_L10_19_ENVIRONMENT_ID = P12_2_L10_18_ENVIRONMENT_ID;
export const P12_2_L10_19_POSTGRES_SERVICE_ID = P12_2_L10_18_POSTGRES_SERVICE_ID;
export const P12_2_L10_19_FAILURE_URL = P12_2_L10_18_FAILURE_URL;
export const P12_2_L10_19_SOURCE_EVENT_FINGERPRINT =
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT;
export const P12_2_L10_19_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT =
  buildP122L1018CompactFinalizationSnapshot().fingerprint;
export const P12_2_L10_19_SOURCE_L2_RECEIPT_FINGERPRINT =
  buildP122L1018L2Receipt().fingerprint;
export const P12_2_L10_19_ACCEPTED_ABSENCE_HTTP_STATUSES =
  Object.freeze([404, 410] as const);

const VERIFIER_IMAGE_PREFIX =
  "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:";
const HEX64 = /^[0-9a-f]{64}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function requireObservedAt(value: string): string {
  const normalized = value.trim();
  const parsed = Date.parse(normalized);
  if (!normalized || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== normalized) {
    throw new Error("p12_2_l10_19_observed_at_invalid");
  }
  return normalized;
}

function requireVerifierImage(value: string): string {
  const normalized = value.trim();
  if (
    !normalized.startsWith(VERIFIER_IMAGE_PREFIX) ||
    !HEX64.test(normalized.slice(VERIFIER_IMAGE_PREFIX.length))
  ) {
    throw new Error("p12_2_l10_19_verifier_image_invalid");
  }
  return normalized;
}

function requireDeploymentId(value: string): string {
  const normalized = value.trim();
  if (!UUID.test(normalized)) throw new Error("p12_2_l10_19_verifier_deployment_id_invalid");
  return normalized;
}

function acceptedAbsenceStatus(status: number): status is 404 | 410 {
  return P12_2_L10_19_ACCEPTED_ABSENCE_HTTP_STATUSES.includes(status as 404 | 410);
}

export type P122L1019DispositionType =
  | "stale_inventory_absence"
  | "sitemap_orphan_absence";

export type P122L1019Disposition = {
  version: typeof P12_2_L10_19_VERSION;
  packetFingerprint: typeof P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT;
  runId: typeof P12_2_L10_15_RUN_ID;
  siteId: typeof DIAMOND_SHELF_SITE_ID;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: typeof P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT;
  sourceEventFingerprint: typeof P12_2_L10_19_SOURCE_EVENT_FINGERPRINT;
  canonicalUrl: typeof P12_2_L10_19_FAILURE_URL;
  historicalAbsenceHttpStatus: 404 | 410;
  currentAbsenceHttpStatus: 404 | 410;
  freshInventoryFingerprint: string;
  freshInventoryUniqueUrls: number;
  presentInFreshInventory: boolean;
  sourceSitemaps: readonly string[];
  dispositionType: P122L1019DispositionType;
  verifierImage: string;
  verifierDeploymentId: string;
  observedAt: string;
  evidence: {
    historicalTerminalFailurePreserved: true;
    finalCheckpointPreserved: true;
    currentUrlReadMethod: "GET";
    freshSitemapReadOnly: true;
    rawResponseBodyPersisted: false;
    rawSitemapXmlPersisted: false;
    pageContentPersisted: false;
    crawlReplayPerformed: false;
    recoveryExecutionPerformed: false;
    providerWrites: false;
    publicSiteWrites: false;
  };
  fingerprint: string;
};

export type P122L1019ReconciliationReceipt = {
  version: typeof P12_2_L10_19_RECONCILIATION_VERSION;
  packetFingerprint: typeof P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT;
  runId: typeof P12_2_L10_15_RUN_ID;
  siteId: typeof DIAMOND_SHELF_SITE_ID;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: typeof P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT;
  sourceAccountingSnapshotFingerprint:
    typeof P12_2_L10_19_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT;
  sourceCheckpointFingerprint: typeof P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT;
  sourceCheckpointRevision: typeof P12_2_L10_18_FINAL_CHECKPOINT_REVISION;
  sourceEventFingerprint: typeof P12_2_L10_19_SOURCE_EVENT_FINGERPRINT;
  dispositionFingerprint: string;
  rawTerminalFailureCount: 1;
  expectedAbsenceCount: 1;
  effectiveUnresolvedTerminalFailureCount: 0;
  status: "certified_with_expected_absence";
  legacyWholeSiteCertified: false;
  completedRunPersisted: false;
  recoveryReceiptPersisted: false;
  observedAt: string;
  fingerprint: string;
};

export function classifyPermanentExpectedAbsenceEvent(
  event: TerminalFailureEvent,
): 404 | 410 {
  assertTerminalFailureEventIntegrity(event);
  if (
    event.eventType !== "terminal_failure" ||
    event.decisionReason !== "permanent_http" ||
    event.outcome.kind !== "failure" ||
    event.outcome.signal.kind !== "http_status" ||
    !acceptedAbsenceStatus(event.outcome.signal.httpStatus)
  ) {
    throw new Error("p12_2_l10_19_expected_absence_event_invalid");
  }
  return event.outcome.signal.httpStatus;
}

export function historicalAbsenceStatus(event: TerminalFailureEvent): 404 | 410 {
  const status = classifyPermanentExpectedAbsenceEvent(event);
  if (
    event.runId !== P12_2_L10_15_RUN_ID ||
    event.siteId !== DIAMOND_SHELF_SITE_ID ||
    event.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    event.executionPlanFingerprint !== P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT ||
    event.canonicalUrl !== P12_2_L10_19_FAILURE_URL ||
    event.fingerprint !== P12_2_L10_19_SOURCE_EVENT_FINGERPRINT
  ) {
    throw new Error("p12_2_l10_19_historical_absence_evidence_invalid");
  }
  return status;
}

export function currentAbsenceStatus(outcome: PageTransportResult): 404 | 410 {
  if (
    outcome.kind !== "failure" ||
    outcome.signal.kind !== "http_status" ||
    !acceptedAbsenceStatus(outcome.signal.httpStatus)
  ) {
    throw new Error("p12_2_l10_19_current_absence_not_proven");
  }
  return outcome.signal.httpStatus;
}

export function classifyExpectedAbsenceInventory(
  entries: readonly { canonicalUrl: string; sourceSitemaps: readonly string[] }[],
  canonicalUrl: string,
): {
  presentInFreshInventory: boolean;
  sourceSitemaps: string[];
  dispositionType: P122L1019DispositionType;
} {
  const entry = entries.find((item) => item.canonicalUrl === canonicalUrl);
  const presentInFreshInventory = Boolean(entry);
  return {
    presentInFreshInventory,
    sourceSitemaps: entry ? [...entry.sourceSitemaps].sort() : [],
    dispositionType: presentInFreshInventory
      ? "sitemap_orphan_absence"
      : "stale_inventory_absence",
  };
}

export function buildP122L1019Disposition(input: {
  sourceEvent: TerminalFailureEvent;
  currentOutcome: PageTransportResult;
  freshInventory: SitemapInventoryResult;
  verifierImage: string;
  verifierDeploymentId: string;
  observedAt: string;
}): P122L1019Disposition {
  const historicalStatus = historicalAbsenceStatus(input.sourceEvent);
  const currentStatus = currentAbsenceStatus(input.currentOutcome);
  const verifierImage = requireVerifierImage(input.verifierImage);
  const verifierDeploymentId = requireDeploymentId(input.verifierDeploymentId);
  const observedAt = requireObservedAt(input.observedAt);

  if (
    input.freshInventory.siteId !== DIAMOND_SHELF_SITE_ID ||
    input.freshInventory.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    !HEX64.test(input.freshInventory.fingerprint) ||
    input.freshInventory.completeness.complete !== true
  ) {
    throw new Error("p12_2_l10_19_fresh_inventory_invalid");
  }

  const {
    presentInFreshInventory,
    sourceSitemaps,
    dispositionType,
  } = classifyExpectedAbsenceInventory(
    input.freshInventory.inventory.entries,
    P12_2_L10_19_FAILURE_URL,
  );

  const withoutFingerprint: Omit<P122L1019Disposition, "fingerprint"> = {
    version: P12_2_L10_19_VERSION,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    sourceEventFingerprint: P12_2_L10_19_SOURCE_EVENT_FINGERPRINT,
    canonicalUrl: P12_2_L10_19_FAILURE_URL,
    historicalAbsenceHttpStatus: historicalStatus,
    currentAbsenceHttpStatus: currentStatus,
    freshInventoryFingerprint: input.freshInventory.fingerprint,
    freshInventoryUniqueUrls: input.freshInventory.inventory.uniqueUrls,
    presentInFreshInventory,
    sourceSitemaps,
    dispositionType,
    verifierImage,
    verifierDeploymentId,
    observedAt,
    evidence: {
      historicalTerminalFailurePreserved: true,
      finalCheckpointPreserved: true,
      currentUrlReadMethod: "GET",
      freshSitemapReadOnly: true,
      rawResponseBodyPersisted: false,
      rawSitemapXmlPersisted: false,
      pageContentPersisted: false,
      crawlReplayPerformed: false,
      recoveryExecutionPerformed: false,
      providerWrites: false,
      publicSiteWrites: false,
    },
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  });
}

export function buildP122L1019ReconciliationReceipt(
  disposition: P122L1019Disposition,
): P122L1019ReconciliationReceipt {
  if (
    disposition.sourceEventFingerprint !== P12_2_L10_19_SOURCE_EVENT_FINGERPRINT ||
    disposition.canonicalUrl !== P12_2_L10_19_FAILURE_URL ||
    !HEX64.test(disposition.fingerprint)
  ) {
    throw new Error("p12_2_l10_19_disposition_lineage_invalid");
  }
  const withoutFingerprint: Omit<P122L1019ReconciliationReceipt, "fingerprint"> = {
    version: P12_2_L10_19_RECONCILIATION_VERSION,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    sourceAccountingSnapshotFingerprint:
      P12_2_L10_19_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT,
    sourceCheckpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    sourceCheckpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    sourceEventFingerprint: P12_2_L10_19_SOURCE_EVENT_FINGERPRINT,
    dispositionFingerprint: disposition.fingerprint,
    rawTerminalFailureCount: 1,
    expectedAbsenceCount: 1,
    effectiveUnresolvedTerminalFailureCount: 0,
    status: "certified_with_expected_absence",
    legacyWholeSiteCertified: false,
    completedRunPersisted: false,
    recoveryReceiptPersisted: false,
    observedAt: disposition.observedAt,
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  });
}

export function p122L1019DispositionAuthorizationFingerprint(verifierImage: string): string {
  const image = requireVerifierImage(verifierImage);
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_VERSION,
    projectId: P12_2_L10_19_PROJECT_ID,
    environmentId: P12_2_L10_19_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_POSTGRES_SERVICE_ID,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    originalObservedAt: P12_2_L10_15_OBSERVED_AT,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    finalCheckpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    finalCheckpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    sourceEventFingerprint: P12_2_L10_19_SOURCE_EVENT_FINGERPRINT,
    failureUrl: P12_2_L10_19_FAILURE_URL,
    sourceAccountingSnapshotFingerprint:
      P12_2_L10_19_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT,
    sourceL2ReceiptFingerprint: P12_2_L10_19_SOURCE_L2_RECEIPT_FINGERPRINT,
    acceptedAbsenceHttpStatuses: [...P12_2_L10_19_ACCEPTED_ABSENCE_HTTP_STATUSES],
    verifierImage: image,
    liveReads: [
      "exact_failed_url_get_once",
      "fresh_authoritative_sitemap_inventory",
    ],
    databaseWrites: [
      "insert_exactly_one_terminal_failure_disposition",
      "insert_exactly_one_reconciliation_receipt",
    ],
    checkpointMutation: false,
    terminalFailureEventMutation: false,
    accountingSnapshotMutation: false,
    l2InvocationMutation: false,
    completedRunMutation: false,
    recoveryReceiptMutation: false,
    crawlReplay: false,
    recoveryExecution: false,
    providerWrites: false,
    publicSiteWrites: false,
    attempts: 1,
    automaticRetry: false,
  })).digest("hex");
}

export function p122L1019DispositionAuthorizationLiteral(verifierImage: string): string {
  return `AUTHORIZE:P12_2_L10_19_PACKET_014_EXPECTED_ABSENCE_DISPOSITION:${p122L1019DispositionAuthorizationFingerprint(verifierImage)}`;
}

type Sql = ReturnType<typeof postgres>;

async function loadExactSourceEvent(sql: Sql): Promise<TerminalFailureEvent> {
  const rows = await sql<{ event_payload: TerminalFailureEvent }[]>`
    SELECT event_payload
    FROM first_party_crawl_terminal_failure_events
    WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
      AND run_id=${P12_2_L10_15_RUN_ID}
      AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
      AND execution_plan_fingerprint=${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
      AND canonical_url=${P12_2_L10_19_FAILURE_URL}
      AND event_type='terminal_failure'
      AND source_event_fingerprint IS NULL
      AND event_fingerprint=${P12_2_L10_19_SOURCE_EVENT_FINGERPRINT}
  `;
  if (rows.length !== 1) throw new Error("p12_2_l10_19_source_event_identity_invalid");
  const event = rows[0]!.event_payload;
  historicalAbsenceStatus(event);
  return event;
}

async function assertSchemaReady(sql: Sql): Promise<void> {
  const rows = await sql<{ dispositions: boolean; reconciliations: boolean }[]>`
    SELECT
      to_regclass('public.first_party_crawl_terminal_failure_dispositions') IS NOT NULL AS dispositions,
      to_regclass('public.first_party_crawl_terminal_failure_reconciliation_receipts') IS NOT NULL AS reconciliations
  `;
  if (!rows[0]?.dispositions || !rows[0]?.reconciliations) {
    throw new Error("p12_2_l10_19_schema_not_ready");
  }
}

function buildFreshInventoryPlan() {
  const config = p122L1015ManualConfig();
  const crawlPlan = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: {
        targetClass: "first_party",
        siteId: DIAMOND_SHELF_SITE_ID,
        canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      },
      hardPageLimit: config.limits.hardPageLimit,
    },
    { absolutePageCeiling: config.limits.absolutePageCeiling },
  );
  return { config, crawlPlan };
}

export async function verifyP122L1019ExpectedAbsence(input: {
  sourceEvent: TerminalFailureEvent;
  verifierImage: string;
  verifierDeploymentId: string;
  observedAt: string;
  sitemapAcquirer?: FirstPartySitemapAcquirer;
  pageTransport?: FirstPartyPageTransport;
  liveAdapterOptions?: Omit<FirstPartyLiveAdapterOptions, "maxTransientPageBytes">;
}): Promise<{
  disposition: P122L1019Disposition;
  reconciliation: P122L1019ReconciliationReceipt;
  sitemapDocumentsRead: number;
}> {
  historicalAbsenceStatus(input.sourceEvent);
  const { config, crawlPlan } = buildFreshInventoryPlan();
  const adapterOptions: FirstPartyLiveAdapterOptions = {
    ...(input.liveAdapterOptions ?? {}),
    maxTransientPageBytes: config.limits.maxTransientPageBytes,
  };
  const sitemapAcquirer =
    input.sitemapAcquirer ?? createFirstPartySitemapAcquirer(adapterOptions);
  const pageTransport =
    input.pageTransport ?? createFirstPartyPageTransport(adapterOptions);

  const currentOutcome = await pageTransport.get({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    canonicalUrl: P12_2_L10_19_FAILURE_URL,
    method: "GET",
    timeoutMs: config.limits.executionPolicy.requestTimeoutMs,
    maxRedirects: config.limits.executionPolicy.maxRedirectsPerRequest,
    followRedirects: false,
    responseBodyPersistence: false,
  });
  currentAbsenceStatus(currentOutcome);

  const documents = await sitemapAcquirer.load({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: config.rootSitemapUrl,
    maxDocuments: config.limits.sitemapPolicy.maxDocuments,
    maxDocumentBytes: config.limits.sitemapPolicy.maxDocumentBytes,
    maxDepth: config.limits.sitemapPolicy.maxDepth,
    maxUrlLength: config.limits.executionPolicy.maxUrlLength,
    sameOriginOnly: true,
    httpsOnly: true,
    queryAllowed: false,
    fragmentAllowed: false,
  });
  const freshInventory = buildSitemapInventory({
    plan: crawlPlan,
    rootSitemapUrl: config.rootSitemapUrl,
    documents,
    policy: config.limits.sitemapPolicy,
  });

  const disposition = buildP122L1019Disposition({
    sourceEvent: input.sourceEvent,
    currentOutcome,
    freshInventory,
    verifierImage: input.verifierImage,
    verifierDeploymentId: input.verifierDeploymentId,
    observedAt: input.observedAt,
  });
  const reconciliation = buildP122L1019ReconciliationReceipt(disposition);
  return { disposition, reconciliation, sitemapDocumentsRead: documents.length };
}

export type P122L1019ExecutionResult = {
  version: typeof P12_2_L10_19_VERSION;
  status: "certified_with_expected_absence";
  packetFingerprint: typeof P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT;
  runId: typeof P12_2_L10_15_RUN_ID;
  canonicalUrl: typeof P12_2_L10_19_FAILURE_URL;
  dispositionType: P122L1019DispositionType;
  historicalAbsenceHttpStatus: 404 | 410;
  currentAbsenceHttpStatus: 404 | 410;
  presentInFreshInventory: boolean;
  freshInventoryFingerprint: string;
  dispositionFingerprint: string;
  reconciliationReceiptFingerprint: string;
  databaseWritesPerformed: true;
  urlGetsPerformed: 1;
  sitemapDocumentsRead: number;
  checkpointMutated: false;
  terminalFailureEventMutated: false;
  accountingSnapshotMutated: false;
  l2InvocationMutated: false;
  completedRunCreated: false;
  recoveryReceiptCreated: false;
  crawlReplayPerformed: false;
  recoveryExecutionPerformed: false;
  providerWrites: false;
  publicSiteWrites: false;
};

export async function executeP122L1019ExpectedAbsenceDisposition(input: {
  authorizationLiteral: string;
  databaseUrl: string;
  verifierImage: string;
  verifierDeploymentId: string;
  observedAt?: string;
  sitemapAcquirer?: FirstPartySitemapAcquirer;
  pageTransport?: FirstPartyPageTransport;
  liveAdapterOptions?: Omit<FirstPartyLiveAdapterOptions, "maxTransientPageBytes">;
  sqlFactory?: (databaseUrl: string) => Sql;
}): Promise<P122L1019ExecutionResult> {
  const verifierImage = requireVerifierImage(input.verifierImage);
  const verifierDeploymentId = requireDeploymentId(input.verifierDeploymentId);
  if (
    input.authorizationLiteral !==
      p122L1019DispositionAuthorizationLiteral(verifierImage)
  ) {
    throw new Error("p12_2_l10_19_authorization_required");
  }
  const databaseUrl = input.databaseUrl.trim();
  if (!databaseUrl) throw new Error("p12_2_l10_19_database_url_required");
  const observedAt = requireObservedAt(
    input.observedAt ?? new Date().toISOString(),
  );

  const sqlFactory = input.sqlFactory ?? ((url: string) => postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  }));
  const sql = sqlFactory(databaseUrl);

  try {
    await assertSchemaReady(sql);
    const sourceEvent = await loadExactSourceEvent(sql);

    const verified = await verifyP122L1019ExpectedAbsence({
      sourceEvent,
      verifierImage,
      verifierDeploymentId,
      observedAt,
      sitemapAcquirer: input.sitemapAcquirer,
      pageTransport: input.pageTransport,
      liveAdapterOptions: input.liveAdapterOptions,
    });

    await sql.begin(async (tx) => {
      await tx`
        SELECT pg_advisory_xact_lock(
          hashtext('p12_2_l10_19_packet_014_expected_absence'),
          hashtext(${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT})
        )
      `;

      const invocation = await tx<{
        status: string;
        receipt_fingerprint: string | null;
      }[]>`
        SELECT status, receipt_fingerprint
        FROM first_party_crawl_l2_invocations
        WHERE packet_fingerprint=${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}
          AND site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND phase='full_initial'
          AND run_id=${P12_2_L10_15_RUN_ID}
          AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND observed_at=${P12_2_L10_15_OBSERVED_AT}::timestamptz
        FOR UPDATE
      `;
      if (
        invocation.length !== 1 ||
        invocation[0]!.status !== "completed" ||
        invocation[0]!.receipt_fingerprint !== P12_2_L10_19_SOURCE_L2_RECEIPT_FINGERPRINT
      ) throw new Error("p12_2_l10_19_l2_lineage_invalid");

      const checkpoints = await tx<{
        checkpoint_fingerprint: string;
        checkpoint_revision: number;
        checkpoint_payload: {
          status?: string;
          counters?: { terminalFailures?: number };
          progress?: { totalUrls?: number; finalizedUrls?: number; pendingUrls?: number };
        };
      }[]>`
        SELECT checkpoint_fingerprint, checkpoint_revision, checkpoint_payload
        FROM first_party_crawl_checkpoints
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id=${P12_2_L10_15_RUN_ID}
          AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint=${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
        FOR UPDATE
      `;
      const checkpoint = checkpoints[0];
      if (
        checkpoints.length !== 1 ||
        !checkpoint ||
        checkpoint.checkpoint_fingerprint !== P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT ||
        Number(checkpoint.checkpoint_revision) !== P12_2_L10_18_FINAL_CHECKPOINT_REVISION ||
        checkpoint.checkpoint_payload?.status !== "completed" ||
        Number(checkpoint.checkpoint_payload?.counters?.terminalFailures) !== 1 ||
        Number(checkpoint.checkpoint_payload?.progress?.totalUrls) !== 3044 ||
        Number(checkpoint.checkpoint_payload?.progress?.finalizedUrls) !== 3044 ||
        Number(checkpoint.checkpoint_payload?.progress?.pendingUrls) !== 0
      ) throw new Error("p12_2_l10_19_checkpoint_lineage_invalid");

      const events = await tx<{ event_payload: TerminalFailureEvent }[]>`
        SELECT event_payload
        FROM first_party_crawl_terminal_failure_events
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id=${P12_2_L10_15_RUN_ID}
          AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint=${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
          AND canonical_url=${P12_2_L10_19_FAILURE_URL}
          AND event_type='terminal_failure'
          AND source_event_fingerprint IS NULL
          AND event_fingerprint=${P12_2_L10_19_SOURCE_EVENT_FINGERPRINT}
        FOR UPDATE
      `;
      if (events.length !== 1) throw new Error("p12_2_l10_19_source_event_identity_invalid");
      const lockedEvent = events[0]!.event_payload;
      historicalAbsenceStatus(lockedEvent);
      if (stableSerialize(lockedEvent) !== stableSerialize(sourceEvent)) {
        throw new Error("p12_2_l10_19_source_event_changed");
      }

      const accounting = await tx<{
        snapshot_fingerprint: string;
        terminal_failure_count: number;
        whole_site_certified: boolean;
      }[]>`
        SELECT snapshot_fingerprint, terminal_failure_count, whole_site_certified
        FROM first_party_crawl_accounting_snapshots
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id=${P12_2_L10_15_RUN_ID}
          AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND execution_plan_fingerprint=${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
        FOR UPDATE
      `;
      if (
        accounting.length !== 1 ||
        accounting[0]!.snapshot_fingerprint !==
          P12_2_L10_19_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT ||
        Number(accounting[0]!.terminal_failure_count) !== 1 ||
        accounting[0]!.whole_site_certified !== false
      ) throw new Error("p12_2_l10_19_accounting_lineage_invalid");

      const completedRuns = await tx<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM first_party_crawl_completed_runs
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id=${P12_2_L10_15_RUN_ID}
          AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
      `;
      if (Number(completedRuns[0]?.count ?? -1) !== 0) {
        throw new Error("p12_2_l10_19_completed_run_unexpected");
      }

      const recoveryReceipts = await tx<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM first_party_crawl_terminal_failure_recovery_receipts
        WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
          AND run_id=${P12_2_L10_15_RUN_ID}
          AND canonical_origin=${DIAMOND_SHELF_CANONICAL_ORIGIN}
      `;
      if (Number(recoveryReceipts[0]?.count ?? -1) !== 0) {
        throw new Error("p12_2_l10_19_recovery_receipt_unexpected");
      }

      const existing = await tx<{ dispositions: number; reconciliations: number }[]>`
        SELECT
          (
            SELECT COUNT(*)::int
            FROM first_party_crawl_terminal_failure_dispositions
            WHERE source_event_fingerprint=${P12_2_L10_19_SOURCE_EVENT_FINGERPRINT}
          ) AS dispositions,
          (
            SELECT COUNT(*)::int
            FROM first_party_crawl_terminal_failure_reconciliation_receipts
            WHERE site_id=${DIAMOND_SHELF_SITE_ID}::uuid
              AND run_id=${P12_2_L10_15_RUN_ID}
              AND execution_plan_fingerprint=${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}
          ) AS reconciliations
      `;
      if (
        Number(existing[0]?.dispositions ?? -1) !== 0 ||
        Number(existing[0]?.reconciliations ?? -1) !== 0
      ) throw new Error("p12_2_l10_19_disposition_already_exists");

      await tx`
        INSERT INTO first_party_crawl_terminal_failure_dispositions (
          disposition_id, site_id, run_id, canonical_origin,
          execution_plan_fingerprint, source_event_fingerprint,
          canonical_url, disposition_type, absence_http_status,
          fresh_inventory_fingerprint, present_in_fresh_inventory,
          verifier_image, verifier_deployment_id, observed_at,
          disposition_fingerprint, disposition_payload
        ) VALUES (
          ${randomUUID()}::uuid,
          ${DIAMOND_SHELF_SITE_ID}::uuid,
          ${P12_2_L10_15_RUN_ID},
          ${DIAMOND_SHELF_CANONICAL_ORIGIN},
          ${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT},
          ${P12_2_L10_19_SOURCE_EVENT_FINGERPRINT},
          ${P12_2_L10_19_FAILURE_URL},
          ${verified.disposition.dispositionType},
          ${verified.disposition.currentAbsenceHttpStatus},
          ${verified.disposition.freshInventoryFingerprint},
          ${verified.disposition.presentInFreshInventory},
          ${verified.disposition.verifierImage},
          ${verified.disposition.verifierDeploymentId}::uuid,
          ${verified.disposition.observedAt}::timestamptz,
          ${verified.disposition.fingerprint},
          ${tx.json(verified.disposition)}
        )
      `;

      await tx`
        INSERT INTO first_party_crawl_terminal_failure_reconciliation_receipts (
          reconciliation_receipt_id, site_id, run_id, canonical_origin,
          execution_plan_fingerprint, source_accounting_snapshot_fingerprint,
          disposition_fingerprint, raw_terminal_failure_count,
          expected_absence_count, effective_unresolved_terminal_failure_count,
          status, observed_at, receipt_fingerprint, receipt_payload
        ) VALUES (
          ${randomUUID()}::uuid,
          ${DIAMOND_SHELF_SITE_ID}::uuid,
          ${P12_2_L10_15_RUN_ID},
          ${DIAMOND_SHELF_CANONICAL_ORIGIN},
          ${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT},
          ${P12_2_L10_19_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT},
          ${verified.disposition.fingerprint},
          1,
          1,
          0,
          'certified_with_expected_absence',
          ${verified.reconciliation.observedAt}::timestamptz,
          ${verified.reconciliation.fingerprint},
          ${tx.json(verified.reconciliation)}
        )
      `;
    });

    return {
      version: P12_2_L10_19_VERSION,
      status: "certified_with_expected_absence",
      packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
      runId: P12_2_L10_15_RUN_ID,
      canonicalUrl: P12_2_L10_19_FAILURE_URL,
      dispositionType: verified.disposition.dispositionType,
      historicalAbsenceHttpStatus:
        verified.disposition.historicalAbsenceHttpStatus,
      currentAbsenceHttpStatus: verified.disposition.currentAbsenceHttpStatus,
      presentInFreshInventory: verified.disposition.presentInFreshInventory,
      freshInventoryFingerprint: verified.disposition.freshInventoryFingerprint,
      dispositionFingerprint: verified.disposition.fingerprint,
      reconciliationReceiptFingerprint: verified.reconciliation.fingerprint,
      databaseWritesPerformed: true,
      urlGetsPerformed: 1,
      sitemapDocumentsRead: verified.sitemapDocumentsRead,
      checkpointMutated: false,
      terminalFailureEventMutated: false,
      accountingSnapshotMutated: false,
      l2InvocationMutated: false,
      completedRunCreated: false,
      recoveryReceiptCreated: false,
      crawlReplayPerformed: false,
      recoveryExecutionPerformed: false,
      providerWrites: false,
      publicSiteWrites: false,
    };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export function p122L1019Capability() {
  return Object.freeze({
    version: P12_2_L10_19_VERSION,
    target: P12_2_L10_19_FAILURE_URL,
    acceptedAbsenceHttpStatuses: [...P12_2_L10_19_ACCEPTED_ABSENCE_HTTP_STATUSES],
    historicalAbsenceEvidenceRequired: true,
    currentAbsenceEvidenceRequired: true,
    freshSitemapInventoryRequired: true,
    dispositionTypes: [
      "stale_inventory_absence",
      "sitemap_orphan_absence",
    ] as const,
    rawTerminalFailureCountPreserved: true,
    effectiveUnresolvedTerminalFailures: 0,
    reconciliationStatus: "certified_with_expected_absence",
    migrationRequired: "0011_first_party_crawl_expected_absence_disposition.sql",
    maxInvocationAttempts: 1,
    automaticRetry: false,
    checkpointMutation: false,
    terminalFailureEventMutation: false,
    accountingSnapshotMutation: false,
    l2InvocationMutation: false,
    completedRunMutation: false,
    recoveryReceiptMutation: false,
    crawlReplay: false,
    recoveryExecution: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  } as const);
}

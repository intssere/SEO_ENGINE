import { createHash } from "node:crypto";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
  P12_2_L10_18_POSTGRES_SERVICE_ID,
  P12_2_L10_18_PROJECT_ID,
  P12_2_L10_18_ENVIRONMENT_ID,
  buildP122L1018CompactFinalizationSnapshot,
  buildP122L1018L2Receipt,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";

export const P12_2_L10_19_MIGRATION_VERSION =
  "p12-2-l10-19-0011-expected-absence-disposition-apply-v1" as const;
export const P12_2_L10_19_MIGRATION_PROJECT_ID = P12_2_L10_18_PROJECT_ID;
export const P12_2_L10_19_MIGRATION_ENVIRONMENT_ID = P12_2_L10_18_ENVIRONMENT_ID;
export const P12_2_L10_19_MIGRATION_POSTGRES_SERVICE_ID = P12_2_L10_18_POSTGRES_SERVICE_ID;
export const P12_2_L10_19_MIGRATION_PATH =
  "lib/db/migrations/0011_first_party_crawl_expected_absence_disposition.sql" as const;
export const P12_2_L10_19_MIGRATION_BLOB_SHA =
  "8749184f481474a4a085eaacf3ff154e8ebfe903" as const;
export const P12_2_L10_19_MIGRATION_EXPECTED_PRE_TABLE_COUNT = 41 as const;
export const P12_2_L10_19_MIGRATION_EXPECTED_POST_TABLE_COUNT = 43 as const;
export const P12_2_L10_19_MIGRATION_ACCOUNTING_SNAPSHOT_FINGERPRINT =
  buildP122L1018CompactFinalizationSnapshot().fingerprint;
export const P12_2_L10_19_MIGRATION_L2_RECEIPT_FINGERPRINT =
  buildP122L1018L2Receipt().fingerprint;

export function p122L1019MigrationAuthorizationFingerprint(): string {
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_MIGRATION_VERSION,
    projectId: P12_2_L10_19_MIGRATION_PROJECT_ID,
    environmentId: P12_2_L10_19_MIGRATION_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_MIGRATION_POSTGRES_SERVICE_ID,
    migrationPath: P12_2_L10_19_MIGRATION_PATH,
    migrationBlobSha: P12_2_L10_19_MIGRATION_BLOB_SHA,
    expectedPrePublicBaseTableCount: P12_2_L10_19_MIGRATION_EXPECTED_PRE_TABLE_COUNT,
    expectedPostPublicBaseTableCount: P12_2_L10_19_MIGRATION_EXPECTED_POST_TABLE_COUNT,
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    executionPlanFingerprint: P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
    checkpointFingerprint: P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
    checkpointRevision: P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
    sourceEventFingerprint: P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
    failureUrl: P12_2_L10_18_FAILURE_URL,
    acceptedHistoricalHttpStatuses: [404,410],
    sourceAccountingSnapshotFingerprint: P12_2_L10_19_MIGRATION_ACCOUNTING_SNAPSHOT_FINGERPRINT,
    sourceL2ReceiptFingerprint: P12_2_L10_19_MIGRATION_L2_RECEIPT_FINGERPRINT,
    engineeringPolicyTablesAbsent: true,
    targetTablesInitiallyAbsent: true,
    targetRowsInitiallyZero: true,
    psqlProcesses: 1,
    attempts: 1,
    retries: 0,
    fallback: false,
  })).digest("hex");
}

export function p122L1019MigrationAuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_19_0011_APPLY:${p122L1019MigrationAuthorizationFingerprint()}`;
}

export function p122L1019MigrationCapability() {
  return Object.freeze({
    version: P12_2_L10_19_MIGRATION_VERSION,
    migrationPath: P12_2_L10_19_MIGRATION_PATH,
    migrationBlobSha: P12_2_L10_19_MIGRATION_BLOB_SHA,
    expectedPreTableCount: P12_2_L10_19_MIGRATION_EXPECTED_PRE_TABLE_COUNT,
    expectedPostTableCount: P12_2_L10_19_MIGRATION_EXPECTED_POST_TABLE_COUNT,
    targetTablesAdded: 2,
    dataBackfill: false,
    psqlProcesses: 1,
    attempts: 1,
    retries: 0,
    fallback: false,
    providerWrites: false,
    publicSiteWrites: false,
    crawlExecution: false,
    recoveryExecution: false,
  } as const);
}

import { createHash } from "node:crypto";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_RUN_ID,
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

export const P12_2_L10_19_A_VERSION =
  "p12-2-l10-19-a-0011-expected-absence-schema-apply-v1" as const;
export const P12_2_L10_19_A_PROJECT_ID = P12_2_L10_18_PROJECT_ID;
export const P12_2_L10_19_A_ENVIRONMENT_ID = P12_2_L10_18_ENVIRONMENT_ID;
export const P12_2_L10_19_A_POSTGRES_SERVICE_ID = P12_2_L10_18_POSTGRES_SERVICE_ID;
export const P12_2_L10_19_A_SITE_ID = DIAMOND_SHELF_SITE_ID;
export const P12_2_L10_19_A_ORIGIN = DIAMOND_SHELF_CANONICAL_ORIGIN;
export const P12_2_L10_19_A_MIGRATION_PATH =
  "lib/db/migrations/0011_first_party_crawl_expected_absence_disposition.sql" as const;
export const P12_2_L10_19_A_MIGRATION_BLOB_SHA =
  "8749184f481474a4a085eaacf3ff154e8ebfe903" as const;
export const P12_2_L10_19_A_MIGRATION_SHA256 =
  "07a0ad844d34b401a8972a70a4bf767cf0c8853679ce5203c8a9f1b35bb9a700" as const;
export const P12_2_L10_19_A_EXPECTED_PRE_TABLE_COUNT = 41 as const;
export const P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT = 43 as const;
export const P12_2_L10_19_A_PACKET_FINGERPRINT =
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT;
export const P12_2_L10_19_A_RUN_ID = P12_2_L10_15_RUN_ID;
export const P12_2_L10_19_A_OBSERVED_AT = P12_2_L10_15_OBSERVED_AT;
export const P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT =
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT;
export const P12_2_L10_19_A_CHECKPOINT_FINGERPRINT =
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT;
export const P12_2_L10_19_A_CHECKPOINT_REVISION =
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION;
export const P12_2_L10_19_A_FAILURE_URL = P12_2_L10_18_FAILURE_URL;
export const P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT =
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT;
export const P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT =
  buildP122L1018CompactFinalizationSnapshot().fingerprint;
export const P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT =
  buildP122L1018L2Receipt().fingerprint;

export function p122L1019AMigrationAuthorizationFingerprint(): string {
  return createHash("sha256").update(JSON.stringify({
    version: P12_2_L10_19_A_VERSION,
    projectId: P12_2_L10_19_A_PROJECT_ID,
    environmentId: P12_2_L10_19_A_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_A_POSTGRES_SERVICE_ID,
    siteId: P12_2_L10_19_A_SITE_ID,
    canonicalOrigin: P12_2_L10_19_A_ORIGIN,
    migrationPath: P12_2_L10_19_A_MIGRATION_PATH,
    migrationBlobSha: P12_2_L10_19_A_MIGRATION_BLOB_SHA,
    migrationSha256: P12_2_L10_19_A_MIGRATION_SHA256,
    expectedPrePublicBaseTableCount: P12_2_L10_19_A_EXPECTED_PRE_TABLE_COUNT,
    expectedPostPublicBaseTableCount: P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT,
    packetFingerprint: P12_2_L10_19_A_PACKET_FINGERPRINT,
    runId: P12_2_L10_19_A_RUN_ID,
    observedAt: P12_2_L10_19_A_OBSERVED_AT,
    executionPlanFingerprint: P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT,
    checkpointFingerprint: P12_2_L10_19_A_CHECKPOINT_FINGERPRINT,
    checkpointRevision: P12_2_L10_19_A_CHECKPOINT_REVISION,
    failureUrl: P12_2_L10_19_A_FAILURE_URL,
    failureEventFingerprint: P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT,
    accountingSnapshotFingerprint: P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT,
    l2ReceiptFingerprint: P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT,
    completedRunCount: 0,
    recoveryReceiptCount: 0,
    existingDispositionCount: 0,
    existingReconciliationCount: 0,
    engineeringPolicyTablesAbsent: true,
    psqlProcesses: 1,
    attempts: 1,
    retries: 0,
    fallback: false,
  })).digest("hex");
}

export function p122L1019AMigrationAuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L10_19_0011_APPLY:${p122L1019AMigrationAuthorizationFingerprint()}`;
}

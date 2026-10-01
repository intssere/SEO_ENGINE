import { createHash } from "node:crypto";

export const P12_2_L1A_VERSION = "p12-2-l1a-readonly-production-binding-v1" as const;

export const P12_2_L1A_SCOPE = Object.freeze({
  railwayProjectId: "52265e29-921b-4652-ac0d-9da4e5e69936",
  railwayEnvironmentId: "7f8d920f-f6c6-44f0-b9fe-252cb4f32298",
  postgresServiceId: "b69e0633-7ab9-40ab-85f3-c9edd6acb031",
  siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
  canonicalOrigin: "https://diamondshelf.us",
  migrationPath: "lib/db/migrations/0004_first_party_crawl_execution_state.sql",
  migrationBlob: "c46e007f087d0edbb6e4f5c8cda1490e9f0be548",
  expectedPreMigrationTableCount: 34,
  expectedPostMigrationTableCount: 37,
  p12Tables: [
    "first_party_crawl_checkpoints",
    "first_party_crawl_completed_runs",
    "first_party_crawl_incremental_receipts",
  ] as const,
  allowedSiteColumns: ["id", "canonical_origin"] as const,
  ddlAllowed: false,
  dmlAllowed: false,
  applicationDataReadsAllowed: false,
  migrationExecutionAllowed: false,
  crawlExecutionAllowed: false,
  networkProviderReadsAllowed: false,
  schedulerWorkerActivationAllowed: false,
} as const);

export type P122L1AObservedP12Table = {
  name: (typeof P12_2_L1A_SCOPE.p12Tables)[number];
  columnsMatchCertifiedContract: boolean;
  constraintsMatchCertifiedContract: boolean;
  indexesMatchCertifiedContract: boolean;
};

export type P122L1AObservation = {
  publicBaseTableCount: number;
  p12TablesPresent: boolean;
  p12Tables: P122L1AObservedP12Table[];
  exactSiteRowFound: boolean;
  exactSiteCanonicalOrigin: string | null;
  extraSiteRowsRead: number;
  ddlStatementsExecuted: number;
  dmlStatementsExecuted: number;
  applicationRowsReadBeyondExactSiteBinding: number;
};

export type P122L1AAssessment =
  | {
      status: "eligible_for_migration_review";
      schemaState: "certified_pre_migration_34";
      migrationAlreadyApplied: false;
      code: "p12_2_l1a_pre_migration_state_matches";
    }
  | {
      status: "migration_not_required";
      schemaState: "certified_post_migration_37";
      migrationAlreadyApplied: true;
      code: "p12_2_l1a_post_migration_state_matches";
    }
  | {
      status: "blocked";
      schemaState: "unexpected";
      migrationAlreadyApplied: boolean | null;
      code: string;
    };

export type P122L1AReceipt = {
  version: typeof P12_2_L1A_VERSION;
  scope: typeof P12_2_L1A_SCOPE;
  observation: P122L1AObservation;
  assessment: P122L1AAssessment;
  fingerprint: string;
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function exactP12TableSet(observation: P122L1AObservation): boolean {
  if (observation.p12Tables.length !== P12_2_L1A_SCOPE.p12Tables.length) return false;
  const expected = [...P12_2_L1A_SCOPE.p12Tables].sort();
  const actual = observation.p12Tables.map((table) => table.name).sort();
  return expected.every((name, i) => name === actual[i]);
}

function allP12StructuresMatch(observation: P122L1AObservation): boolean {
  return (
    exactP12TableSet(observation) &&
    observation.p12Tables.every(
      (table) =>
        table.columnsMatchCertifiedContract &&
        table.constraintsMatchCertifiedContract &&
        table.indexesMatchCertifiedContract,
    )
  );
}

export function assessP122L1AObservation(
  observation: P122L1AObservation,
): P122L1AAssessment {
  if (
    observation.ddlStatementsExecuted !== 0 ||
    observation.dmlStatementsExecuted !== 0 ||
    observation.applicationRowsReadBeyondExactSiteBinding !== 0 ||
    observation.extraSiteRowsRead !== 0
  ) {
    return {
      status: "blocked",
      schemaState: "unexpected",
      migrationAlreadyApplied: null,
      code: "p12_2_l1a_observation_scope_violated",
    };
  }

  if (
    !observation.exactSiteRowFound ||
    observation.exactSiteCanonicalOrigin !== P12_2_L1A_SCOPE.canonicalOrigin
  ) {
    return {
      status: "blocked",
      schemaState: "unexpected",
      migrationAlreadyApplied: null,
      code: "p12_2_l1a_site_binding_mismatch",
    };
  }

  if (
    observation.publicBaseTableCount === P12_2_L1A_SCOPE.expectedPreMigrationTableCount &&
    observation.p12TablesPresent === false &&
    observation.p12Tables.length === 0
  ) {
    return {
      status: "eligible_for_migration_review",
      schemaState: "certified_pre_migration_34",
      migrationAlreadyApplied: false,
      code: "p12_2_l1a_pre_migration_state_matches",
    };
  }

  if (
    observation.publicBaseTableCount === P12_2_L1A_SCOPE.expectedPostMigrationTableCount &&
    observation.p12TablesPresent === true &&
    allP12StructuresMatch(observation)
  ) {
    return {
      status: "migration_not_required",
      schemaState: "certified_post_migration_37",
      migrationAlreadyApplied: true,
      code: "p12_2_l1a_post_migration_state_matches",
    };
  }

  return {
    status: "blocked",
    schemaState: "unexpected",
    migrationAlreadyApplied: observation.p12TablesPresent ? true : null,
    code: "p12_2_l1a_schema_state_unexpected",
  };
}

export function buildP122L1AReceipt(
  observation: P122L1AObservation,
): P122L1AReceipt {
  const assessment = assessP122L1AObservation(observation);
  const withoutFingerprint = {
    version: P12_2_L1A_VERSION,
    scope: P12_2_L1A_SCOPE,
    observation,
    assessment,
  };
  return Object.freeze({
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  });
}

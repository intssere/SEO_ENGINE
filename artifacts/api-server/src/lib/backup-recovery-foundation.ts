import { createHash } from "node:crypto";
import {
  P3_6A_SCHEMA_CONTRACT_FINGERPRINT,
  assertP36APostgresSchemaContractIntegrity,
} from "./observation-evidence-postgres-schema-contract.js";

export const P11_4_RECOVERY_VERSION = "p11.4-backup-recovery-v1" as const;

export const P11_4_RECOVERY_BOUNDS = Object.freeze({
  maxManifests: 100,
  maxBackupAgeMinutes: 525_600,
  maxRpoMinutes: 43_200,
  maxRtoMinutes: 43_200,
  maxObjectCount: 10_000_000_000,
  maxBytes: Number.MAX_SAFE_INTEGER,
  maxBlockersPerStage: 32,
});

export const P11_4_EXPECTED_MIGRATIONS = Object.freeze([
  "0001_core.sql",
  "0002_auth.sql",
  "0003_observation_evidence_schema.sql",
] as const);

export type RecoveryDomain =
  | "postgres_core"
  | "postgres_auth_audit"
  | "postgres_observation_evidence"
  | "source_migrations"
  | "external_secrets"
  | "external_provider_state"
  | "runtime_ephemeral";

export type RecoveryProtectionClass =
  | "database_backup_required"
  | "source_controlled"
  | "external_manual"
  | "non_authoritative";

export type RecoveryInventoryItem = {
  domain: RecoveryDomain;
  protectionClass: RecoveryProtectionClass;
  containedInPostgresBackup: boolean;
  authoritative: boolean;
  description: string;
};

export type RecoveryObjectives = {
  rpoMinutes: number;
  rtoMinutes: number;
};

export type BackupStatus = "complete" | "partial" | "failed";
export type BackupVerificationStatus = "verified" | "unverified" | "failed";

export type BackupManifestInput = {
  backupId: string;
  status: BackupStatus;
  createdAt: string;
  coverageThrough: string;
  domains: RecoveryDomain[];
  migrationFiles: string[];
  p36SchemaFingerprint: string;
  objectCount: number | null;
  bytes: number | null;
  checksum: {
    algorithm: "sha256";
    digest: string;
  };
  encrypted: boolean | null;
  verification: {
    status: BackupVerificationStatus;
    verifiedAt: string | null;
  };
};

export type NormalizedBackupManifest = {
  version: typeof P11_4_RECOVERY_VERSION;
  backupId: string;
  backupFingerprint: string;
  status: BackupStatus;
  createdAt: string;
  coverageThrough: string;
  domains: RecoveryDomain[];
  migrationFiles: string[];
  p36SchemaFingerprint: string;
  objectCount: number | null;
  bytes: number | null;
  checksum: {
    algorithm: "sha256";
    digest: string;
  };
  encrypted: boolean | null;
  verification: {
    status: BackupVerificationStatus;
    verifiedAt: string | null;
  };
};

export type BackupEligibility = {
  backupId: string;
  backupFingerprint: string;
  eligible: boolean;
  ageMinutes: number;
  rpoMinutes: number;
  blockers: string[];
};

export type RecoveryScenario =
  | "database_loss_corruption"
  | "accidental_destructive_mutation"
  | "region_runtime_loss"
  | "credential_secret_loss"
  | "provider_outage"
  | "public_site_provider_write_regression";

export type RecoveryScenarioProjection = {
  scenario: RecoveryScenario;
  databaseBackupRelevant: boolean;
  sourceRecoveryRelevant: boolean;
  externalManualDependencies: string[];
  backupCanFullyRecoverScenario: boolean;
  notes: string[];
};

export type RestoreStage =
  | "incident_declared"
  | "writes_frozen"
  | "isolated_target_ready"
  | "base_restore_complete"
  | "schema_lineage_verified"
  | "integrity_verified"
  | "app_readonly_smoke_verified"
  | "external_dependencies_reconciled"
  | "cutover_review_ready"
  | "post_recovery_verified";

export type RestoreStageStatus = "not_run" | "completed" | "blocked";

export type RestoreStageEvidenceInput = {
  stage: RestoreStage;
  status: RestoreStageStatus;
  startedAt: string | null;
  completedAt: string | null;
  verificationFingerprint: string | null;
  blockers: string[];
};

export type NormalizedRestoreStageEvidence = RestoreStageEvidenceInput & {
  evidenceFingerprint: string;
};

export type RecoveryExerciseInput = {
  exerciseId: string;
  scenario: RecoveryScenario;
  incidentAt: string;
  referenceTime: string;
  objectives: RecoveryObjectives;
  manifests: BackupManifestInput[];
  selectedBackupId: string | null;
  stages: RestoreStageEvidenceInput[];
};

export type RecoveryCertification =
  | "certified_synthetic"
  | "blocked"
  | "incomplete"
  | "not_backup_recoverable";

export type RecoveryExerciseReport = {
  version: typeof P11_4_RECOVERY_VERSION;
  exerciseId: string;
  reportId: string;
  reportFingerprint: string;
  scenario: RecoveryScenarioProjection;
  referenceTime: string;
  incidentAt: string;
  objectives: RecoveryObjectives;
  inventory: RecoveryInventoryItem[];
  manifests: NormalizedBackupManifest[];
  selectedBackup: NormalizedBackupManifest | null;
  selectedBackupEligibility: BackupEligibility | null;
  stages: NormalizedRestoreStageEvidence[];
  measuredRpoMinutes: number | null;
  measuredRtoMinutes: number | null;
  rpoObjectiveMet: boolean | null;
  rtoObjectiveMet: boolean | null;
  certification: RecoveryCertification;
  blockers: string[];
  safety: ReturnType<typeof recoveryCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const REQUIRED_DATABASE_DOMAINS = Object.freeze([
  "postgres_core",
  "postgres_auth_audit",
  "postgres_observation_evidence",
] as const satisfies readonly RecoveryDomain[]);
const ALL_DOMAINS = new Set<RecoveryDomain>([
  "postgres_core",
  "postgres_auth_audit",
  "postgres_observation_evidence",
  "source_migrations",
  "external_secrets",
  "external_provider_state",
  "runtime_ephemeral",
]);
const BACKUP_STATUSES = new Set<BackupStatus>(["complete", "partial", "failed"]);
const VERIFICATION_STATUSES = new Set<BackupVerificationStatus>([
  "verified",
  "unverified",
  "failed",
]);

export const P11_4_RESTORE_STAGE_ORDER = Object.freeze([
  "incident_declared",
  "writes_frozen",
  "isolated_target_ready",
  "base_restore_complete",
  "schema_lineage_verified",
  "integrity_verified",
  "app_readonly_smoke_verified",
  "external_dependencies_reconciled",
  "cutover_review_ready",
  "post_recovery_verified",
] as const satisfies readonly RestoreStage[]);

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function identifier(value: unknown, field: string): string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) throw new Error("invalid_" + field);
  return value;
}

function timestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("invalid_" + field);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("invalid_" + field);
  return new Date(parsed).toISOString();
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error("invalid_" + field);
  return value;
}

function integer(value: unknown, min: number, max: number, field: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error("invalid_" + field);
  }
  return value as number;
}

function uniqueSortedDomains(values: unknown): RecoveryDomain[] {
  if (!Array.isArray(values)) throw new Error("invalid_backup_domains");
  const domains = values.map((value) => {
    if (typeof value !== "string" || !ALL_DOMAINS.has(value as RecoveryDomain)) {
      throw new Error("invalid_backup_domain");
    }
    return value as RecoveryDomain;
  });
  if (new Set(domains).size !== domains.length) throw new Error("duplicate_backup_domain");
  return domains.sort();
}

function exactMigrationFiles(values: unknown): string[] {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    throw new Error("invalid_migration_files");
  }
  if (new Set(values as string[]).size !== values.length) {
    throw new Error("duplicate_migration_file");
  }
  return [...(values as string[])];
}

function minutesBetween(earlier: string, later: string): number {
  return Number(((Date.parse(later) - Date.parse(earlier)) / 60_000).toFixed(3));
}

function boundedOptionalInteger(
  value: unknown,
  max: number,
  field: string,
): number | null {
  if (value === null) return null;
  return integer(value, 0, max, field);
}

export function buildRecoveryInventory(): RecoveryInventoryItem[] {
  return [
    {
      domain: "postgres_core",
      protectionClass: "database_backup_required",
      containedInPostgresBackup: true,
      authoritative: true,
      description: "Core application operational and historical PostgreSQL state from 0001_core.sql.",
    },
    {
      domain: "postgres_auth_audit",
      protectionClass: "database_backup_required",
      containedInPostgresBackup: true,
      authoritative: true,
      description: "Authentication sessions and auth audit events from 0002_auth.sql.",
    },
    {
      domain: "postgres_observation_evidence",
      protectionClass: "database_backup_required",
      containedInPostgresBackup: true,
      authoritative: true,
      description: "P3.6 observation/evidence and association state from 0003_observation_evidence_schema.sql.",
    },
    {
      domain: "source_migrations",
      protectionClass: "source_controlled",
      containedInPostgresBackup: false,
      authoritative: true,
      description: "Git-controlled source and migration definitions; recovered from canonical source control, not a database backup.",
    },
    {
      domain: "external_secrets",
      protectionClass: "external_manual",
      containedInPostgresBackup: false,
      authoritative: true,
      description: "Secret values referenced by database secret_ref fields are external dependencies and are not contained in a PostgreSQL backup.",
    },
    {
      domain: "external_provider_state",
      protectionClass: "external_manual",
      containedInPostgresBackup: false,
      authoritative: true,
      description: "Provider/public-site external state is outside database-backup scope and requires separate reconciliation.",
    },
    {
      domain: "runtime_ephemeral",
      protectionClass: "non_authoritative",
      containedInPostgresBackup: false,
      authoritative: false,
      description: "Runtime-local caches/build artifacts/process state are not authoritative recovery inputs.",
    },
  ];
}

export function normalizeRecoveryObjectives(input: RecoveryObjectives): RecoveryObjectives {
  return {
    rpoMinutes: integer(
      input.rpoMinutes,
      0,
      P11_4_RECOVERY_BOUNDS.maxRpoMinutes,
      "rpo_minutes",
    ),
    rtoMinutes: integer(
      input.rtoMinutes,
      1,
      P11_4_RECOVERY_BOUNDS.maxRtoMinutes,
      "rto_minutes",
    ),
  };
}

export function normalizeBackupManifest(
  input: BackupManifestInput,
  referenceTime: string,
): NormalizedBackupManifest {
  const normalizedReference = timestamp(referenceTime, "backup_reference_time");
  const backupId = identifier(input.backupId, "backup_id");
  if (!BACKUP_STATUSES.has(input.status)) throw new Error("invalid_backup_status");
  const createdAt = timestamp(input.createdAt, "backup_created_at");
  const coverageThrough = timestamp(input.coverageThrough, "backup_coverage_through");
  if (Date.parse(coverageThrough) > Date.parse(createdAt)) {
    throw new Error("backup_coverage_after_creation");
  }
  if (Date.parse(createdAt) > Date.parse(normalizedReference)) {
    throw new Error("backup_created_in_future");
  }
  const domains = uniqueSortedDomains(input.domains);
  const migrationFiles = exactMigrationFiles(input.migrationFiles);
  const p36SchemaFingerprint = exactFingerprint(
    input.p36SchemaFingerprint,
    "p36_schema_fingerprint",
  );
  const objectCount = boundedOptionalInteger(
    input.objectCount,
    P11_4_RECOVERY_BOUNDS.maxObjectCount,
    "object_count",
  );
  const bytes = boundedOptionalInteger(
    input.bytes,
    P11_4_RECOVERY_BOUNDS.maxBytes,
    "backup_bytes",
  );
  if (input.checksum?.algorithm !== "sha256") throw new Error("unsupported_checksum_algorithm");
  const checksum = {
    algorithm: "sha256" as const,
    digest: exactFingerprint(input.checksum.digest, "backup_checksum"),
  };
  if (input.encrypted !== null && typeof input.encrypted !== "boolean") {
    throw new Error("invalid_backup_encrypted");
  }
  if (!VERIFICATION_STATUSES.has(input.verification?.status)) {
    throw new Error("invalid_backup_verification_status");
  }
  const verifiedAt = input.verification.verifiedAt === null
    ? null
    : timestamp(input.verification.verifiedAt, "backup_verified_at");
  if (input.verification.status === "verified" && verifiedAt === null) {
    throw new Error("verified_backup_missing_verified_at");
  }
  if (input.verification.status !== "verified" && verifiedAt !== null) {
    throw new Error("unverified_backup_has_verified_at");
  }
  if (verifiedAt !== null && Date.parse(verifiedAt) < Date.parse(createdAt)) {
    throw new Error("backup_verified_before_creation");
  }
  if (verifiedAt !== null && Date.parse(verifiedAt) > Date.parse(normalizedReference)) {
    throw new Error("backup_verified_in_future");
  }

  const identity = {
    backupId,
    status: input.status,
    createdAt,
    coverageThrough,
    domains,
    migrationFiles,
    p36SchemaFingerprint,
    objectCount,
    bytes,
    checksum,
    encrypted: input.encrypted,
    verification: {
      status: input.verification.status,
      verifiedAt,
    },
  };
  const backupFingerprint = hash({
    version: P11_4_RECOVERY_VERSION,
    purpose: "backup_manifest",
    ...identity,
  });
  return {
    version: P11_4_RECOVERY_VERSION,
    backupFingerprint,
    ...identity,
  };
}

function normalizeBackupManifests(
  manifests: BackupManifestInput[],
  referenceTime: string,
): NormalizedBackupManifest[] {
  if (!Array.isArray(manifests) || manifests.length > P11_4_RECOVERY_BOUNDS.maxManifests) {
    throw new Error("invalid_backup_manifest_count");
  }
  const byId = new Map<string, NormalizedBackupManifest>();
  for (const raw of manifests) {
    const manifest = normalizeBackupManifest(raw, referenceTime);
    const existing = byId.get(manifest.backupId);
    if (!existing) {
      byId.set(manifest.backupId, manifest);
      continue;
    }
    if (existing.backupFingerprint !== manifest.backupFingerprint) {
      throw new Error("conflicting_backup_manifest_replay");
    }
  }
  return [...byId.values()].sort((a, b) =>
    b.coverageThrough.localeCompare(a.coverageThrough)
    || a.backupFingerprint.localeCompare(b.backupFingerprint)
  );
}

function expectedMigrationLineage(manifest: NormalizedBackupManifest): boolean {
  return stableJson(manifest.migrationFiles) === stableJson(P11_4_EXPECTED_MIGRATIONS);
}

function hasRequiredDatabaseDomains(manifest: NormalizedBackupManifest): boolean {
  return REQUIRED_DATABASE_DOMAINS.every((domain) => manifest.domains.includes(domain));
}

export function evaluateBackupEligibility(input: {
  manifest: NormalizedBackupManifest;
  objectives: RecoveryObjectives;
  referenceTime: string;
}): BackupEligibility {
  const referenceTime = timestamp(input.referenceTime, "eligibility_reference_time");
  const objectives = normalizeRecoveryObjectives(input.objectives);
  const ageMinutes = minutesBetween(input.manifest.coverageThrough, referenceTime);
  if (ageMinutes < 0 || ageMinutes > P11_4_RECOVERY_BOUNDS.maxBackupAgeMinutes) {
    throw new Error("backup_age_out_of_bounds");
  }
  const blockers: string[] = [];
  if (Date.parse(input.manifest.createdAt) > Date.parse(referenceTime)) {
    blockers.push("backup_created_after_reference");
  }
  if (input.manifest.status !== "complete") blockers.push("backup_not_complete");
  if (input.manifest.verification.status !== "verified") {
    blockers.push("backup_integrity_not_verified");
  }
  if (!hasRequiredDatabaseDomains(input.manifest)) {
    blockers.push("required_database_domain_missing");
  }
  if (!expectedMigrationLineage(input.manifest)) {
    blockers.push("migration_lineage_mismatch");
  }
  if (input.manifest.p36SchemaFingerprint !== P3_6A_SCHEMA_CONTRACT_FINGERPRINT) {
    blockers.push("p36_schema_fingerprint_mismatch");
  }
  if (ageMinutes > objectives.rpoMinutes) blockers.push("rpo_window_exceeded");
  return {
    backupId: input.manifest.backupId,
    backupFingerprint: input.manifest.backupFingerprint,
    eligible: blockers.length === 0,
    ageMinutes,
    rpoMinutes: objectives.rpoMinutes,
    blockers,
  };
}

export function projectRecoveryScenario(
  scenario: RecoveryScenario,
): RecoveryScenarioProjection {
  switch (scenario) {
    case "database_loss_corruption":
      return {
        scenario,
        databaseBackupRelevant: true,
        sourceRecoveryRelevant: true,
        externalManualDependencies: ["external_secrets_reconciliation", "provider_connection_validation"],
        backupCanFullyRecoverScenario: false,
        notes: ["Database backup can restore in-scope PostgreSQL state, but external secrets/provider state require separate reconciliation."],
      };
    case "accidental_destructive_mutation":
      return {
        scenario,
        databaseBackupRelevant: true,
        sourceRecoveryRelevant: true,
        externalManualDependencies: ["external_secrets_reconciliation", "provider_side_effect_review"],
        backupCanFullyRecoverScenario: false,
        notes: ["Database restore can recover in-scope persisted state only; external side effects are outside backup scope."],
      };
    case "region_runtime_loss":
      return {
        scenario,
        databaseBackupRelevant: true,
        sourceRecoveryRelevant: true,
        externalManualDependencies: ["runtime_reprovisioning", "external_secrets_reconciliation", "provider_connection_validation"],
        backupCanFullyRecoverScenario: false,
        notes: ["Source plus database state are necessary but runtime and external dependencies require separate recovery."],
      };
    case "credential_secret_loss":
      return {
        scenario,
        databaseBackupRelevant: false,
        sourceRecoveryRelevant: false,
        externalManualDependencies: ["secret_reissue_or_external_secret_restore", "connection_revalidation"],
        backupCanFullyRecoverScenario: false,
        notes: ["Secret values are not contained in PostgreSQL backup scope."],
      };
    case "provider_outage":
      return {
        scenario,
        databaseBackupRelevant: false,
        sourceRecoveryRelevant: false,
        externalManualDependencies: ["provider_recovery_or_failover_review", "connection_revalidation"],
        backupCanFullyRecoverScenario: false,
        notes: ["A provider outage is not repaired by restoring the application database."],
      };
    case "public_site_provider_write_regression":
      return {
        scenario,
        databaseBackupRelevant: true,
        sourceRecoveryRelevant: true,
        externalManualDependencies: ["external_state_diff", "provider_or_public_site_rollback", "post_rollback_verification"],
        backupCanFullyRecoverScenario: false,
        notes: ["Database backup cannot itself reverse external provider/public-site writes."],
      };
    default:
      throw new Error("unsupported_recovery_scenario");
  }
}

function normalizeBlockers(values: unknown): string[] {
  if (!Array.isArray(values) || values.length > P11_4_RECOVERY_BOUNDS.maxBlockersPerStage) {
    throw new Error("invalid_restore_stage_blockers");
  }
  const blockers = values.map((value) => identifier(value, "restore_stage_blocker")).sort();
  if (new Set(blockers).size !== blockers.length) throw new Error("duplicate_restore_stage_blocker");
  return blockers;
}

function normalizeStage(
  input: RestoreStageEvidenceInput,
  referenceTime: string,
): NormalizedRestoreStageEvidence {
  if (!P11_4_RESTORE_STAGE_ORDER.includes(input.stage)) {
    throw new Error("invalid_restore_stage");
  }
  if (!["not_run", "completed", "blocked"].includes(input.status)) {
    throw new Error("invalid_restore_stage_status");
  }
  const startedAt = input.startedAt === null
    ? null
    : timestamp(input.startedAt, "restore_stage_started_at");
  const completedAt = input.completedAt === null
    ? null
    : timestamp(input.completedAt, "restore_stage_completed_at");
  const blockers = normalizeBlockers(input.blockers);
  const verificationFingerprint = input.verificationFingerprint === null
    ? null
    : exactFingerprint(input.verificationFingerprint, "restore_stage_verification_fingerprint");

  if (input.status === "not_run") {
    if (startedAt !== null || completedAt !== null || verificationFingerprint !== null || blockers.length > 0) {
      throw new Error("not_run_stage_has_evidence");
    }
  } else if (input.status === "completed") {
    if (startedAt === null || completedAt === null || verificationFingerprint === null || blockers.length > 0) {
      throw new Error("completed_stage_evidence_incomplete");
    }
  } else {
    if (startedAt === null || completedAt !== null || blockers.length === 0) {
      throw new Error("blocked_stage_evidence_invalid");
    }
  }
  if (startedAt !== null && Date.parse(startedAt) > Date.parse(referenceTime)) {
    throw new Error("restore_stage_started_in_future");
  }
  if (completedAt !== null) {
    if (Date.parse(completedAt) < Date.parse(startedAt!)) {
      throw new Error("restore_stage_completion_before_start");
    }
    if (Date.parse(completedAt) > Date.parse(referenceTime)) {
      throw new Error("restore_stage_completed_in_future");
    }
  }

  const identity = {
    stage: input.stage,
    status: input.status,
    startedAt,
    completedAt,
    verificationFingerprint,
    blockers,
  };
  return {
    ...identity,
    evidenceFingerprint: hash({
      version: P11_4_RECOVERY_VERSION,
      purpose: "restore_stage_evidence",
      ...identity,
    }),
  };
}

function normalizeStages(
  stages: RestoreStageEvidenceInput[],
  referenceTime: string,
): NormalizedRestoreStageEvidence[] {
  if (!Array.isArray(stages)) throw new Error("invalid_restore_stages");
  const byStage = new Map<RestoreStage, NormalizedRestoreStageEvidence>();
  for (const raw of stages) {
    const stage = normalizeStage(raw, referenceTime);
    if (byStage.has(stage.stage)) throw new Error("duplicate_restore_stage");
    byStage.set(stage.stage, stage);
  }
  const normalized = P11_4_RESTORE_STAGE_ORDER.map((stage) =>
    byStage.get(stage) ?? normalizeStage({
      stage,
      status: "not_run",
      startedAt: null,
      completedAt: null,
      verificationFingerprint: null,
      blockers: [],
    }, referenceTime)
  );

  let priorIncomplete = false;
  let priorCompletion: string | null = null;
  for (const stage of normalized) {
    if (stage.status === "completed") {
      if (priorIncomplete) throw new Error("restore_stage_order_violation");
      if (priorCompletion !== null && Date.parse(stage.startedAt!) < Date.parse(priorCompletion)) {
        throw new Error("restore_stage_time_order_violation");
      }
      priorCompletion = stage.completedAt;
    } else {
      priorIncomplete = true;
    }
  }
  return normalized;
}

function exerciseCertification(input: {
  scenario: RecoveryScenarioProjection;
  eligibility: BackupEligibility | null;
  stages: NormalizedRestoreStageEvidence[];
  rpoObjectiveMet: boolean | null;
  rtoObjectiveMet: boolean | null;
}): { certification: RecoveryCertification; blockers: string[] } {
  const blockers: string[] = [];
  if (!input.scenario.databaseBackupRelevant) {
    blockers.push("scenario_not_recoverable_by_database_backup");
    return { certification: "not_backup_recoverable", blockers };
  }
  if (input.eligibility === null) {
    blockers.push("backup_not_selected");
  } else if (!input.eligibility.eligible) {
    blockers.push(...input.eligibility.blockers);
  }
  const blockedStages = input.stages.filter((stage) => stage.status === "blocked");
  const notRunStages = input.stages.filter((stage) => stage.status === "not_run");
  blockers.push(...blockedStages.flatMap((stage) =>
    stage.blockers.map((blocker) => stage.stage + ":" + blocker)
  ));
  if (notRunStages.length > 0) blockers.push("required_restore_stage_not_completed");
  if (input.rpoObjectiveMet === false) blockers.push("rpo_objective_missed");
  if (input.rtoObjectiveMet === false) blockers.push("rto_objective_missed");

  const unique = [...new Set(blockers)].sort();
  if (unique.length > 0) {
    const onlyMissingStages =
      unique.length === 1 && unique[0] === "required_restore_stage_not_completed";
    return {
      certification: onlyMissingStages ? "incomplete" : "blocked",
      blockers: unique,
    };
  }
  return { certification: "certified_synthetic", blockers: [] };
}

export function buildRecoveryExerciseReport(
  input: RecoveryExerciseInput,
): RecoveryExerciseReport {
  assertP36APostgresSchemaContractIntegrity();
  const exerciseId = identifier(input.exerciseId, "exercise_id");
  const referenceTime = timestamp(input.referenceTime, "reference_time");
  const incidentAt = timestamp(input.incidentAt, "incident_at");
  if (Date.parse(incidentAt) > Date.parse(referenceTime)) {
    throw new Error("incident_in_future");
  }
  const objectives = normalizeRecoveryObjectives(input.objectives);
  const inventory = buildRecoveryInventory();
  const scenario = projectRecoveryScenario(input.scenario);
  const manifests = normalizeBackupManifests(input.manifests, referenceTime);
  const stages = normalizeStages(input.stages, referenceTime);

  const selectedBackup = input.selectedBackupId === null
    ? null
    : manifests.find((manifest) => manifest.backupId === input.selectedBackupId) ?? null;
  if (input.selectedBackupId !== null && selectedBackup === null) {
    throw new Error("selected_backup_not_found");
  }

  const selectedBackupEligibility = selectedBackup === null
    ? null
    : evaluateBackupEligibility({
        manifest: selectedBackup,
        objectives,
        referenceTime: incidentAt,
      });

  const measuredRpoMinutes = selectedBackup === null
    ? null
    : minutesBetween(selectedBackup.coverageThrough, incidentAt);
  if (measuredRpoMinutes !== null && measuredRpoMinutes < 0) {
    throw new Error("selected_backup_coverage_after_incident");
  }

  const firstStage = stages[0]!;
  const finalStage = stages.at(-1)!;
  const measuredRtoMinutes =
    firstStage.status === "completed"
    && finalStage.status === "completed"
    && firstStage.startedAt !== null
    && finalStage.completedAt !== null
      ? minutesBetween(firstStage.startedAt, finalStage.completedAt)
      : null;

  const rpoObjectiveMet = measuredRpoMinutes === null
    ? null
    : measuredRpoMinutes <= objectives.rpoMinutes;
  const rtoObjectiveMet = measuredRtoMinutes === null
    ? null
    : measuredRtoMinutes <= objectives.rtoMinutes;

  const certification = exerciseCertification({
    scenario,
    eligibility: selectedBackupEligibility,
    stages,
    rpoObjectiveMet,
    rtoObjectiveMet,
  });
  const safety = recoveryCapability();
  const identity = {
    exerciseId,
    scenario,
    referenceTime,
    incidentAt,
    objectives,
    inventory,
    manifests,
    selectedBackup,
    selectedBackupEligibility,
    stages,
    measuredRpoMinutes,
    measuredRtoMinutes,
    rpoObjectiveMet,
    rtoObjectiveMet,
    certification: certification.certification,
    blockers: certification.blockers,
    safety,
  };
  const reportFingerprint = hash({
    version: P11_4_RECOVERY_VERSION,
    purpose: "recovery_exercise_report",
    ...identity,
  });
  return {
    version: P11_4_RECOVERY_VERSION,
    reportId: "rcr-" + reportFingerprint.slice(0, 24),
    reportFingerprint,
    ...identity,
  };
}

export function recoveryCapability() {
  return Object.freeze({
    version: P11_4_RECOVERY_VERSION,
    deterministicProjectionOnly: true as const,
    offlineOnly: true as const,
    suppliedFixturesOnly: true as const,
    planningAndCertificationOnly: true as const,
    productionBackupDiscoveryAuthorized: false as const,
    productionBackupReadAuthorized: false as const,
    productionBackupExportAuthorized: false as const,
    backupCreationAuthorized: false as const,
    restoreExecutionAuthorized: false as const,
    pointInTimeRecoveryAuthorized: false as const,
    snapshotApiAuthorized: false as const,
    storageApiAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    productionDdlAuthorized: false as const,
    secretRetrievalAuthorized: false as const,
    secretRotationAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    runtimeMutationAuthorized: false as const,
    failoverAuthorized: false as const,
    cutoverAuthorized: false as const,
    schedulerActivated: false as const,
    workerActivated: false as const,
    retryDispatchAuthorized: false as const,
    task51ExecutionAuthorized: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    p9_8ImplementationAuthorized: false as const,
    deploymentAuthorized: false as const,
    publicationAuthorized: false as const,
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  P3_6A_SCHEMA_CONTRACT_FINGERPRINT,
} from "./observation-evidence-postgres-schema-contract.js";
import {
  P11_4_EXPECTED_MIGRATIONS,
  P11_4_RECOVERY_VERSION,
  P11_4_RESTORE_STAGE_ORDER,
  buildRecoveryExerciseReport,
  buildRecoveryInventory,
  evaluateBackupEligibility,
  normalizeBackupManifest,
  normalizeRecoveryObjectives,
  projectRecoveryScenario,
  recoveryCapability,
  type BackupManifestInput,
  type RecoveryObjectives,
  type RestoreStageEvidenceInput,
} from "./backup-recovery-foundation.js";

const REFERENCE = "2026-09-21T10:30:00.000Z";
const INCIDENT = "2026-09-21T10:00:00.000Z";
const OBJECTIVES: RecoveryObjectives = {
  rpoMinutes: 15,
  rtoMinutes: 30,
};

function manifest(overrides: Partial<BackupManifestInput> = {}): BackupManifestInput {
  return {
    backupId: "backup-20260921-0955",
    status: "complete",
    createdAt: "2026-09-21T09:55:00.000Z",
    coverageThrough: "2026-09-21T09:50:00.000Z",
    domains: [
      "postgres_core",
      "postgres_auth_audit",
      "postgres_observation_evidence",
    ],
    migrationFiles: [...P11_4_EXPECTED_MIGRATIONS],
    p36SchemaFingerprint: P3_6A_SCHEMA_CONTRACT_FINGERPRINT,
    objectCount: 1250,
    bytes: 4_000_000,
    checksum: {
      algorithm: "sha256",
      digest: "a".repeat(64),
    },
    encrypted: true,
    verification: {
      status: "verified",
      verifiedAt: "2026-09-21T09:56:00.000Z",
    },
    ...overrides,
  };
}

function completedStages(
  finalCompletedAt = "2026-09-21T10:20:00.000Z",
): RestoreStageEvidenceInput[] {
  const starts = [
    "2026-09-21T10:01:00.000Z",
    "2026-09-21T10:02:00.000Z",
    "2026-09-21T10:03:00.000Z",
    "2026-09-21T10:05:00.000Z",
    "2026-09-21T10:08:00.000Z",
    "2026-09-21T10:10:00.000Z",
    "2026-09-21T10:12:00.000Z",
    "2026-09-21T10:14:00.000Z",
    "2026-09-21T10:16:00.000Z",
    "2026-09-21T10:18:00.000Z",
  ];
  const completions = [
    "2026-09-21T10:01:30.000Z",
    "2026-09-21T10:02:30.000Z",
    "2026-09-21T10:04:00.000Z",
    "2026-09-21T10:07:00.000Z",
    "2026-09-21T10:09:00.000Z",
    "2026-09-21T10:11:00.000Z",
    "2026-09-21T10:13:00.000Z",
    "2026-09-21T10:15:00.000Z",
    "2026-09-21T10:17:00.000Z",
    finalCompletedAt,
  ];
  return P11_4_RESTORE_STAGE_ORDER.map((stage, index) => ({
    stage,
    status: "completed" as const,
    startedAt: starts[index]!,
    completedAt: completions[index]!,
    verificationFingerprint: String(index + 1).padStart(64, "0"),
    blockers: [],
  }));
}

function report(input: {
  manifests?: BackupManifestInput[];
  selectedBackupId?: string | null;
  stages?: RestoreStageEvidenceInput[];
  objectives?: RecoveryObjectives;
  scenario?: Parameters<typeof projectRecoveryScenario>[0];
} = {}) {
  return buildRecoveryExerciseReport({
    exerciseId: "exercise-primary",
    scenario: input.scenario ?? "database_loss_corruption",
    incidentAt: INCIDENT,
    referenceTime: REFERENCE,
    objectives: input.objectives ?? OBJECTIVES,
    manifests: input.manifests ?? [manifest()],
    selectedBackupId: input.selectedBackupId === undefined
      ? "backup-20260921-0955"
      : input.selectedBackupId,
    stages: input.stages ?? completedStages(),
  });
}

test("P11.4 recovery inventory clearly separates database, source, external and ephemeral domains", () => {
  const inventory = buildRecoveryInventory();

  assert.equal(inventory.length, 7);
  assert.deepEqual(
    inventory.filter((item) => item.containedInPostgresBackup).map((item) => item.domain).sort(),
    ["postgres_auth_audit", "postgres_core", "postgres_observation_evidence"],
  );
  assert.equal(
    inventory.find((item) => item.domain === "external_secrets")?.protectionClass,
    "external_manual",
  );
  assert.equal(
    inventory.find((item) => item.domain === "external_provider_state")?.containedInPostgresBackup,
    false,
  );
  assert.equal(
    inventory.find((item) => item.domain === "runtime_ephemeral")?.authoritative,
    false,
  );
});

test("P11.4 produces a deterministic synthetic recovery certification only from complete verified evidence", () => {
  const first = report();
  const replay = report({
    manifests: [manifest(), manifest()],
    stages: [...completedStages()].reverse(),
  });

  assert.equal(first.version, P11_4_RECOVERY_VERSION);
  assert.equal(first.certification, "certified_synthetic");
  assert.equal(first.measuredRpoMinutes, 10);
  assert.equal(first.measuredRtoMinutes, 19);
  assert.equal(first.rpoObjectiveMet, true);
  assert.equal(first.rtoObjectiveMet, true);
  assert.deepEqual(first.blockers, []);
  assert.equal(first.selectedBackupEligibility?.eligible, true);
  assert.equal(first.selectedBackup?.backupId, "backup-20260921-0955");
  assert.equal(first.reportFingerprint, replay.reportFingerprint);
  assert.deepEqual(first, replay);
});

test("backup manifest replay dedupes exactly and conflicting replay fails closed", () => {
  const exact = report({ manifests: [manifest(), manifest()] });
  assert.equal(exact.manifests.length, 1);

  assert.throws(() => report({
    manifests: [
      manifest(),
      manifest({ checksum: { algorithm: "sha256", digest: "b".repeat(64) } }),
    ],
  }), /conflicting_backup_manifest_replay/);
});

test("partial, unverified, stale, incomplete-domain and schema-mismatched backups cannot certify", () => {
  const cases: Array<[Partial<BackupManifestInput>, string]> = [
    [{ status: "partial" }, "backup_not_complete"],
    [{ verification: { status: "unverified", verifiedAt: null } }, "backup_integrity_not_verified"],
    [{
      coverageThrough: "2026-09-21T09:00:00.000Z",
      createdAt: "2026-09-21T09:05:00.000Z",
      verification: { status: "verified", verifiedAt: "2026-09-21T09:06:00.000Z" },
    }, "rpo_window_exceeded"],
    [{
      domains: ["postgres_core", "postgres_auth_audit"],
    }, "required_database_domain_missing"],
    [{
      p36SchemaFingerprint: "f".repeat(64),
    }, "p36_schema_fingerprint_mismatch"],
    [{
      migrationFiles: ["0001_core.sql", "0002_auth.sql"],
    }, "migration_lineage_mismatch"],
  ];

  for (const [override, blocker] of cases) {
    const candidate = manifest(override);
    const result = report({ manifests: [candidate] });
    assert.equal(result.certification, "blocked");
    assert.ok(result.blockers.includes(blocker), blocker);
  }
});

test("a backup created after the incident cannot be selected even if its coverage is earlier", () => {
  const candidate = manifest({
    createdAt: "2026-09-21T10:05:00.000Z",
    coverageThrough: "2026-09-21T09:59:00.000Z",
    verification: {
      status: "verified",
      verifiedAt: "2026-09-21T10:06:00.000Z",
    },
  });
  const result = report({ manifests: [candidate] });
  assert.equal(result.certification, "blocked");
  assert.ok(result.blockers.includes("backup_created_after_reference"));
});

test("RPO and RTO objectives are caller-supplied, bounded and a miss blocks certification", () => {
  assert.deepEqual(normalizeRecoveryObjectives(OBJECTIVES), OBJECTIVES);
  assert.throws(() => normalizeRecoveryObjectives({
    rpoMinutes: -1,
    rtoMinutes: 10,
  }), /invalid_rpo_minutes/);

  const rpoMiss = report({
    objectives: { rpoMinutes: 5, rtoMinutes: 30 },
  });
  assert.equal(rpoMiss.rpoObjectiveMet, false);
  assert.equal(rpoMiss.certification, "blocked");
  assert.ok(rpoMiss.blockers.includes("rpo_objective_missed"));

  const rtoMiss = report({
    objectives: { rpoMinutes: 15, rtoMinutes: 10 },
  });
  assert.equal(rtoMiss.rtoObjectiveMet, false);
  assert.equal(rtoMiss.certification, "blocked");
  assert.ok(rtoMiss.blockers.includes("rto_objective_missed"));
});

test("restore stages are ordered, cannot be skipped and blocked dependencies remain explicit", () => {
  const skipped = completedStages().filter((stage) => stage.stage !== "integrity_verified");
  assert.throws(() => report({ stages: skipped }), /restore_stage_order_violation/);

  const blocked: RestoreStageEvidenceInput[] = completedStages()
    .slice(0, 7)
    .map((stage) => ({ ...stage }));
  blocked.push({
    stage: "external_dependencies_reconciled",
    status: "blocked",
    startedAt: "2026-09-21T10:14:00.000Z",
    completedAt: null,
    verificationFingerprint: null,
    blockers: ["external_secret_unavailable"],
  });

  const result = report({ stages: blocked });
  assert.equal(result.certification, "blocked");
  assert.ok(
    result.blockers.includes(
      "external_dependencies_reconciled:external_secret_unavailable",
    ),
  );
  assert.ok(result.blockers.includes("required_restore_stage_not_completed"));
});

test("incomplete restore evidence remains incomplete rather than being treated as success", () => {
  const result = report({
    stages: completedStages().slice(0, 5),
  });
  assert.equal(result.certification, "incomplete");
  assert.deepEqual(result.blockers, ["required_restore_stage_not_completed"]);
  assert.equal(result.measuredRtoMinutes, null);
  assert.equal(result.rtoObjectiveMet, null);
});

test("credential loss and provider outage are explicitly not database-backup-recoverable", () => {
  for (const scenario of ["credential_secret_loss", "provider_outage"] as const) {
    const projection = projectRecoveryScenario(scenario);
    assert.equal(projection.databaseBackupRelevant, false);
    assert.equal(projection.backupCanFullyRecoverScenario, false);
    assert.ok(projection.externalManualDependencies.length > 0);

    const result = report({
      scenario,
      selectedBackupId: null,
      manifests: [],
      stages: [],
    });
    assert.equal(result.certification, "not_backup_recoverable");
    assert.deepEqual(result.blockers, ["scenario_not_recoverable_by_database_backup"]);
  }
});

test("public-site/provider write regression retains external rollback dependencies", () => {
  const projection = projectRecoveryScenario("public_site_provider_write_regression");
  assert.equal(projection.databaseBackupRelevant, true);
  assert.equal(projection.backupCanFullyRecoverScenario, false);
  assert.ok(projection.externalManualDependencies.includes("provider_or_public_site_rollback"));
});

test("manifest normalization validates chronology, checksum and verification semantics", () => {
  assert.throws(() => normalizeBackupManifest(manifest({
    coverageThrough: "2026-09-21T09:58:00.000Z",
    createdAt: "2026-09-21T09:57:00.000Z",
  }), REFERENCE), /backup_coverage_after_creation/);

  assert.throws(() => normalizeBackupManifest(manifest({
    checksum: { algorithm: "sha256", digest: "not-a-hash" },
  }), REFERENCE), /invalid_backup_checksum/);

  assert.throws(() => normalizeBackupManifest(manifest({
    verification: { status: "verified", verifiedAt: null },
  }), REFERENCE), /verified_backup_missing_verified_at/);
});

test("eligibility is descriptive and never manufactures backup existence", () => {
  const normalized = normalizeBackupManifest(manifest(), REFERENCE);
  const eligibility = evaluateBackupEligibility({
    manifest: normalized,
    objectives: OBJECTIVES,
    referenceTime: INCIDENT,
  });
  assert.equal(eligibility.eligible, true);

  const noBackup = report({
    manifests: [],
    selectedBackupId: null,
    stages: [],
  });
  assert.equal(noBackup.certification, "blocked");
  assert.ok(noBackup.blockers.includes("backup_not_selected"));
  assert.ok(noBackup.blockers.includes("required_restore_stage_not_completed"));
});

test("P11.4 capability stays offline and denies all production recovery execution authority", () => {
  assert.deepEqual(recoveryCapability(), {
    version: P11_4_RECOVERY_VERSION,
    deterministicProjectionOnly: true,
    offlineOnly: true,
    suppliedFixturesOnly: true,
    planningAndCertificationOnly: true,
    productionBackupDiscoveryAuthorized: false,
    productionBackupReadAuthorized: false,
    productionBackupExportAuthorized: false,
    backupCreationAuthorized: false,
    restoreExecutionAuthorized: false,
    pointInTimeRecoveryAuthorized: false,
    snapshotApiAuthorized: false,
    storageApiAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    productionDdlAuthorized: false,
    secretRetrievalAuthorized: false,
    secretRotationAuthorized: false,
    providerNetworkReadAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    runtimeMutationAuthorized: false,
    failoverAuthorized: false,
    cutoverAuthorized: false,
    schedulerActivated: false,
    workerActivated: false,
    retryDispatchAuthorized: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    p9_8ImplementationAuthorized: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
});

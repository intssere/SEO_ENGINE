import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("P11.4 recovery foundation stays pure, offline and execution-free", async () => {
  const code = await source("./backup-recovery-foundation.ts");

  assert.match(code, /P11_4_RECOVERY_VERSION/);
  assert.match(code, /deterministicProjectionOnly: true/);
  assert.match(code, /offlineOnly: true/);
  assert.match(code, /suppliedFixturesOnly: true/);
  assert.match(code, /planningAndCertificationOnly: true/);
  assert.match(code, /productionBackupDiscoveryAuthorized: false/);
  assert.match(code, /productionBackupReadAuthorized: false/);
  assert.match(code, /productionBackupExportAuthorized: false/);
  assert.match(code, /backupCreationAuthorized: false/);
  assert.match(code, /restoreExecutionAuthorized: false/);
  assert.match(code, /pointInTimeRecoveryAuthorized: false/);
  assert.match(code, /snapshotApiAuthorized: false/);
  assert.match(code, /storageApiAuthorized: false/);
  assert.match(code, /productionDbReadAuthorized: false/);
  assert.match(code, /productionDbWriteAuthorized: false/);
  assert.match(code, /productionDdlAuthorized: false/);
  assert.match(code, /secretRetrievalAuthorized: false/);
  assert.match(code, /secretRotationAuthorized: false/);
  assert.match(code, /failoverAuthorized: false/);
  assert.match(code, /cutoverAuthorized: false/);
  assert.match(code, /deploymentAuthorized: false/);
  assert.match(code, /publicationAuthorized: false/);

  assert.doesNotMatch(code, /process\.env/);
  assert.doesNotMatch(code, /\bfetch\s*\(/);
  assert.doesNotMatch(code, /node:child_process/);
  assert.doesNotMatch(code, /\bexec(?:File|Sync)?\s*\(/);
  assert.doesNotMatch(code, /\bspawn(?:Sync)?\s*\(/);
  assert.doesNotMatch(code, /from ["']postgres["']/);
  assert.doesNotMatch(code, /from ["']drizzle-orm["']/);
  assert.doesNotMatch(code, /pg_dump/);
  assert.doesNotMatch(code, /pg_restore/);
});

test("P11.4 source contract binds current migration and P3.6 schema lineage", async () => {
  const code = await source("./backup-recovery-foundation.ts");

  assert.match(code, /0001_core\.sql/);
  assert.match(code, /0002_auth\.sql/);
  assert.match(code, /0003_observation_evidence_schema\.sql/);
  assert.match(code, /P3_6A_SCHEMA_CONTRACT_FINGERPRINT/);
  assert.match(code, /assertP36APostgresSchemaContractIntegrity/);
  assert.match(code, /migration_lineage_mismatch/);
  assert.match(code, /p36_schema_fingerprint_mismatch/);
  assert.match(code, /backup_integrity_not_verified/);
  assert.match(code, /backup_created_after_reference/);
  assert.match(code, /restore_stage_order_violation/);
});

test("P11.4 documentation states synthetic certification and production-recovery limits", async () => {
  const doc = await source("../../../../docs/p11-4-backup-recovery.md");

  assert.match(doc, /deterministic\/offline/i);
  assert.match(doc, /does \\*\\*not\\*\\* prove/i);\n  assert.match(doc, /production backups exist/i);
  assert.match(doc, /RPO/i);
  assert.match(doc, /RTO/i);
  assert.match(doc, /external secrets/i);
  assert.match(doc, /provider\/public-site state/i);
  assert.match(doc, /no production backup/i);
  assert.match(doc, /deployment or publication/i);
});

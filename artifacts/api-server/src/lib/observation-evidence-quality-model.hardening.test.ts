import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createObservation } from "./observation-evidence-persistence-design.js";
import { planObservationWrite } from "./observation-evidence-persistence-plan.js";
import { planRetentionHistory } from "./observation-evidence-retention-history-model.js";
import { buildRetentionHistoryReadModel } from "./observation-evidence-retention-history-read-model.js";
import {
  EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION,
  EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS,
  P3_5_LIMITS,
  buildEvidenceQualityConflictModel,
} from "./observation-evidence-quality-model.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function context() {
  const candidate = createObservation({
    subject: {
      kind: "site",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      urlId: null,
      canonicalUrl: null,
    },
    observationKind: "technical_issue:crawl.inventory_incomplete",
    materialValue: { status: "open" },
    evidenceReferences: [{
      evidenceId: hash("evidence-id"),
      evidenceFingerprint: hash("evidence"),
      sourceKind: "source_a",
      sourceFingerprint: hash("source-a"),
      dimension: "status",
      quality: "direct",
      availability: "available",
      referenceFingerprint: hash("placeholder"),
    }],
    provenance: {
      sourceKind: "source_a",
      sourceFingerprint: hash("source-a"),
      collectorId: "collector_a",
    },
    confidence: "verified",
    observedAt: "2026-09-16T07:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
  });
  const writePlan = planObservationWrite([], candidate);
  const referenceTime = "2026-09-16T07:30:00.000Z";
  const retentionPlan = planRetentionHistory({ existingRecords: [], writePlan, referenceTime });
  const readContext = { existingRecords: [], writePlan, referenceTime, retentionPlan } as const;
  const readQuery = {
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    page: { limit: 100 },
  } as const;
  const readModel = buildRetentionHistoryReadModel(readContext, readQuery);
  return { readContext, readQuery, readModel, referenceTime } as const;
}

test("P3.5 production source contains no network, DB/ORM/read, SQL mutation, filesystem-write, secret-binding, worker or ambient-clock primitives", () => {
  const source = readFileSync(new URL("./observation-evidence-quality-model.ts", import.meta.url), "utf8");
  const forbidden: Array<[RegExp, string]> = [
    [/\bfetch\s*\(/, "fetch"],
    [/\baxios\b/i, "axios"],
    [/from\s+["']node:(?:http|https|net|dns|tls|dgram)["']/, "network module"],
    [/\b(?:pg|postgres|mysql2|sqlite3|better-sqlite3|prisma|drizzle|knex|sequelize|typeorm)\b/i, "database client or ORM"],
    [/\bSELECT\b/i, "SQL read"],
    [/\bCREATE\s+(?:TABLE|INDEX|SCHEMA|DATABASE)\b/i, "SQL DDL"],
    [/\bALTER\s+(?:TABLE|SCHEMA|DATABASE)\b/i, "SQL DDL"],
    [/\bDROP\s+(?:TABLE|INDEX|SCHEMA|DATABASE)\b/i, "SQL DDL"],
    [/\bINSERT\s+INTO\b/i, "SQL DML"],
    [/\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b/i, "SQL DML"],
    [/\bDELETE\s+FROM\b/i, "SQL DML"],
    [/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/, "filesystem write"],
    [/\bprocess\.env\b/, "environment binding"],
    [/\b(?:setInterval|setTimeout)\s*\(/, "scheduler primitive"],
    [/\b(?:Worker|worker_threads|child_process)\b/, "worker/process primitive"],
    [/\bDate\.now\s*\(/, "ambient wall clock"],
    [/\bnew\s+Date\s*\(\s*\)/, "ambient wall clock"],
  ];
  for (const [pattern, label] of forbidden) {
    assert.equal(pattern.test(source), false, `production source must not contain ${label}`);
  }
});

test("P3.5 all production DB/read/persistence/mutation/runtime/provider/publication gates remain fail-closed", () => {
  assert.ok(Object.keys(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION).length > 0);
  assert.ok(Object.values(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION).every((value) => value === false));
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.productionQualityRuntimeEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.productionReadModelRuntimeEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.productionDatabaseReadsEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.productionPersistenceEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.realDatabaseClientEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.archiveExecutionEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.pruneExecutionEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.destructiveDeleteEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.ddlEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.dmlEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.networkEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.schedulerEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.workerEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.publicSiteWritesEnabled, false);
  assert.equal(EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION.publicationAuthorized, false);
});

test("P3.5 storage-neutral quality/conflict index intent is bounded and declarative", () => {
  assert.ok(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.length <= P3_5_LIMITS.indexIntents);
  assert.equal(new Set(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.map((intent) => intent.name)).size, EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.length);
  assert.ok(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.every((intent) => intent.fields.length > 0));
  assert.ok(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.some((intent) => intent.fields.includes("supportTier")));
  assert.ok(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.some((intent) => intent.fields.includes("provenanceFingerprint")));
  assert.ok(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS.some((intent) => intent.fields.includes("conflictGroupId") && intent.fields.includes("resolutionState")));
});

test("P3.5 rejects unbounded filters and page sizes before quality projection", () => {
  const qualityContext = context();
  const excessiveSupportTiers = Array.from({ length: P3_5_LIMITS.filterValues + 1 }, () => "strong" as const);
  assert.throws(
    () => buildEvidenceQualityConflictModel(qualityContext, { supportTiers: excessiveSupportTiers }),
    /evidence_quality_support_filter_limit_exceeded/,
  );
  assert.throws(
    () => buildEvidenceQualityConflictModel(qualityContext, { page: { limit: P3_5_LIMITS.pageLimit + 1 } }),
    /evidence_quality_page_limit_invalid/,
  );
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createObservation } from "./observation-evidence-persistence-design.js";
import { planObservationWrite } from "./observation-evidence-persistence-plan.js";
import { planRetentionHistory } from "./observation-evidence-retention-history-model.js";
import {
  P3_4_LIMITS,
  RETENTION_HISTORY_READ_AUTHORIZATION,
  RETENTION_HISTORY_READ_INDEX_INTENTS,
  buildRetentionHistoryReadModel,
} from "./observation-evidence-retention-history-read-model.js";

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
  const referenceTime = "2026-09-17T00:00:00.000Z";
  const retentionPlan = planRetentionHistory({ existingRecords: [], writePlan, referenceTime });
  return { existingRecords: [], writePlan, referenceTime, retentionPlan } as const;
}

test("P3.4 production source contains no network, DB/ORM, SQL mutation, filesystem-write, secret-binding, worker or ambient-clock primitives", () => {
  const source = readFileSync(new URL("./observation-evidence-retention-history-read-model.ts", import.meta.url), "utf8");
  const forbidden: Array<[RegExp, string]> = [
    [/\bfetch\s*\(/, "fetch"],
    [/\baxios\b/i, "axios"],
    [/from\s+["']node:(?:http|https|net|dns|tls|dgram)["']/, "network module"],
    [/\b(?:pg|postgres|mysql2|sqlite3|better-sqlite3|prisma|drizzle|knex|sequelize|typeorm)\b/i, "database client or ORM"],
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

test("P3.4 all production DB, persistence, mutation, runtime, provider and publication gates remain fail-closed", () => {
  assert.ok(Object.keys(RETENTION_HISTORY_READ_AUTHORIZATION).length > 0);
  assert.ok(Object.values(RETENTION_HISTORY_READ_AUTHORIZATION).every((value) => value === false));
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.productionReadModelRuntimeEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.productionDatabaseReadsEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.productionPersistenceEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.archiveExecutionEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.pruneExecutionEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.destructiveDeleteEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.realDatabaseClientEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.ddlEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.dmlEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.networkEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.schedulerEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.workerEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.publicSiteWritesEnabled, false);
  assert.equal(RETENTION_HISTORY_READ_AUTHORIZATION.publicationAuthorized, false);
});

test("P3.4 storage-neutral read index intent is bounded and declarative", () => {
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.length <= P3_4_LIMITS.indexIntents);
  assert.equal(new Set(RETENTION_HISTORY_READ_INDEX_INTENTS.map((intent) => intent.name)).size, RETENTION_HISTORY_READ_INDEX_INTENTS.length);
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.every((intent) => intent.fields.length > 0));
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.some((intent) => intent.fields.includes("semanticKey") && intent.fields.includes("observedAt")));
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.some((intent) => intent.fields.includes("provenanceFingerprint")));
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.some((intent) => intent.fields.includes("retentionClass") && intent.fields.includes("disposition")));
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.some((intent) => intent.fields.includes("fromObservationId")));
  assert.ok(RETENTION_HISTORY_READ_INDEX_INTENTS.some((intent) => intent.fields.includes("toObservationId")));
});

test("P3.4 rejects unbounded filters and page sizes before projection", () => {
  const readContext = context();
  const excessiveKinds = Array.from({ length: P3_4_LIMITS.filterValues + 1 }, (_, index) => `kind:${index}`);
  assert.throws(
    () => buildRetentionHistoryReadModel(readContext, {
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      observationKinds: excessiveKinds,
    }),
    /history_read_kind_filter_limit_exceeded/,
  );
  assert.throws(
    () => buildRetentionHistoryReadModel(readContext, {
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      page: { limit: P3_4_LIMITS.pageLimit + 1 },
    }),
    /history_read_page_limit_invalid/,
  );
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createObservation } from "./observation-evidence-persistence-design.js";
import {
  applyObservationWritePlanInMemory,
  planObservationWrite,
} from "./observation-evidence-persistence-plan.js";
import {
  P3_3_LIMITS,
  RETENTION_HISTORY_AUTHORIZATION,
  RETENTION_INDEX_INTENTS,
  planRetentionHistory,
} from "./observation-evidence-retention-history-model.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function observation(sourceNumber: number, status: string, observedAt: string) {
  return createObservation({
    subject: {
      kind: "site",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      urlId: null,
      canonicalUrl: null,
    },
    observationKind: "technical_issue:crawl.inventory_incomplete",
    materialValue: { status },
    provenance: {
      sourceKind: `source_${sourceNumber}`,
      sourceFingerprint: hash(`source-${sourceNumber}`),
      collectorId: `collector_${sourceNumber}`,
    },
    confidence: "verified",
    observedAt,
    freshForMs: 60 * 60 * 1_000,
  });
}

test("P3.3 production source contains no network, DB/ORM, SQL mutation, filesystem-write, secret-binding, worker or ambient-clock primitives", () => {
  const source = readFileSync(new URL("./observation-evidence-retention-history-model.ts", import.meta.url), "utf8");
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

test("P3.3 all persistence, deletion, runtime, provider and publication gates remain fail-closed", () => {
  assert.ok(Object.keys(RETENTION_HISTORY_AUTHORIZATION).length > 0);
  assert.ok(Object.values(RETENTION_HISTORY_AUTHORIZATION).every((value) => value === false));
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.productionPersistenceEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.archiveExecutionEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.pruneExecutionEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.destructiveDeleteEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.realDatabaseClientEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.ddlEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.dmlEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.networkEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.schedulerEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.workerEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.publicSiteWritesEnabled, false);
  assert.equal(RETENTION_HISTORY_AUTHORIZATION.publicationAuthorized, false);
});

test("P3.3 storage-neutral lookup/index intent is bounded and declarative", () => {
  assert.ok(RETENTION_INDEX_INTENTS.length <= P3_3_LIMITS.indexIntents);
  assert.equal(new Set(RETENTION_INDEX_INTENTS.map((intent) => intent.name)).size, RETENTION_INDEX_INTENTS.length);
  assert.ok(RETENTION_INDEX_INTENTS.every((intent) => intent.fields.length > 0));
  assert.ok(RETENTION_INDEX_INTENTS.some((intent) => intent.unique && intent.fields.includes("relationFingerprint")));
  assert.ok(RETENTION_INDEX_INTENTS.some((intent) => intent.fields.includes("fromObservationId")));
  assert.ok(RETENTION_INDEX_INTENTS.some((intent) => intent.fields.includes("toObservationId")));
  assert.ok(RETENTION_INDEX_INTENTS.some((intent) => intent.fields.includes("retentionClass")));
  assert.ok(RETENTION_INDEX_INTENTS.some((intent) => intent.fields.includes("disposition")));
});

test("P3.3 rejects relation input beyond the bounded retained-history ceiling before replay", () => {
  const old = observation(1, "open", "2026-09-16T06:00:00.000Z");
  const candidate = observation(2, "resolved", "2026-09-16T07:00:00.000Z");
  const firstWrite = planObservationWrite([old], candidate);
  const firstPlan = planRetentionHistory({
    existingRecords: [old],
    writePlan: firstWrite,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });
  const relation = firstPlan.relationIntents[0];
  assert.ok(relation);
  const postRecords = applyObservationWritePlanInMemory([old], firstWrite);
  const replayWrite = planObservationWrite(postRecords, candidate);
  const excessiveRelations = Array.from({ length: P3_3_LIMITS.existingRelations + 1 }, () => relation);
  assert.throws(
    () => planRetentionHistory({
      existingRecords: postRecords,
      writePlan: replayWrite,
      existingRelations: excessiveRelations,
      referenceTime: "2026-09-17T00:00:00.000Z",
    }),
    /retention_existing_relation_limit_exceeded/,
  );
});

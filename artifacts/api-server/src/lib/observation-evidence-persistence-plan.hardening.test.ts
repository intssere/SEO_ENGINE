import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createObservation } from "./observation-evidence-persistence-design.js";
import {
  P3_2_LIMITS,
  PERSISTENCE_INDEX_INTENTS,
  PERSISTENCE_PLAN_AUTHORIZATION,
  assertObservationWritePlanIntegrity,
  planObservationWrite,
} from "./observation-evidence-persistence-plan.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function record(sourceNumber: number, status = "open") {
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
    observedAt: "2026-09-16T06:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
  });
}

test("P3.2 production source contains no network, DB/ORM, SQL mutation, filesystem-write, secret-binding or worker primitives", () => {
  const source = readFileSync(new URL("./observation-evidence-persistence-plan.ts", import.meta.url), "utf8");
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
  ];
  for (const [pattern, label] of forbidden) {
    assert.equal(pattern.test(source), false, `production source must not contain ${label}`);
  }
});

test("P3.2 all production capability and authorization gates remain fail-closed", () => {
  assert.ok(Object.keys(PERSISTENCE_PLAN_AUTHORIZATION).length > 0);
  assert.ok(Object.values(PERSISTENCE_PLAN_AUTHORIZATION).every((value) => value === false));
  assert.equal(PERSISTENCE_PLAN_AUTHORIZATION.productionPersistenceEnabled, false);
  assert.equal(PERSISTENCE_PLAN_AUTHORIZATION.ddlEnabled, false);
  assert.equal(PERSISTENCE_PLAN_AUTHORIZATION.dmlEnabled, false);
  assert.equal(PERSISTENCE_PLAN_AUTHORIZATION.realDatabaseClientEnabled, false);
  assert.equal(PERSISTENCE_PLAN_AUTHORIZATION.migrationEnabled, false);
  assert.equal(PERSISTENCE_PLAN_AUTHORIZATION.publicationAuthorized, false);
});

test("P3.2 index intents stay bounded, declarative and storage-neutral", () => {
  assert.ok(PERSISTENCE_INDEX_INTENTS.length <= P3_2_LIMITS.indexIntents);
  assert.equal(new Set(PERSISTENCE_INDEX_INTENTS.map((intent) => intent.name)).size, PERSISTENCE_INDEX_INTENTS.length);
  assert.ok(PERSISTENCE_INDEX_INTENTS.every((intent) => intent.fields.length > 0));
  assert.ok(PERSISTENCE_INDEX_INTENTS.some((intent) => intent.unique && intent.fields.includes("observationId")));
  assert.ok(PERSISTENCE_INDEX_INTENTS.some((intent) => intent.fields.includes("provenanceFingerprint")));
  assert.ok(PERSISTENCE_INDEX_INTENTS.some((intent) => intent.fields.includes("staleAfter")));
});

test("P3.2 rejects a relation fanout beyond the bounded planning ceiling", () => {
  const existing = Array.from({ length: P3_2_LIMITS.relationTargets + 1 }, (_, index) => record(index));
  const candidate = record(P3_2_LIMITS.relationTargets + 10, "resolved");
  assert.throws(() => planObservationWrite(existing, candidate), /persistence_plan_relation_target_limit_exceeded/);
});

test("P3.2 plan integrity is bound to exact candidate and existing snapshot fingerprints", () => {
  const existing = record(1, "open");
  const candidate = createObservation({
    subject: existing.subject,
    observationKind: existing.observationKind,
    materialValue: { status: "resolved" },
    provenance: {
      sourceKind: existing.provenance.sourceKind,
      sourceFingerprint: existing.provenance.sourceFingerprint,
      collectorId: existing.provenance.collectorId,
    },
    confidence: "verified",
    observedAt: "2026-09-16T07:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
  });
  const plan = planObservationWrite([existing], candidate);
  assert.doesNotThrow(() => assertObservationWritePlanIntegrity(plan, [existing]));
  const forged = {
    ...plan,
    persistenceKey: { ...plan.persistenceKey, staleAfter: "2026-09-17T00:00:00.000Z" },
  };
  assert.throws(() => assertObservationWritePlanIntegrity(forged, [existing]), /persistence_plan_fingerprint_mismatch/);
});

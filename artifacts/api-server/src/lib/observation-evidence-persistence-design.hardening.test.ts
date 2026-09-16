import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OBSERVATION_AUTHORIZATION,
  P3_1_LIMITS,
  assertObservationHistoryIntegrity,
  buildObservationHistory,
  createObservation,
} from "./observation-evidence-persistence-design.js";

const fingerprint = (character: string) => character.repeat(64);

function record(observedAt: string, status: string) {
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
      sourceKind: "hardening_source",
      sourceFingerprint: fingerprint("a"),
      collectorId: "hardening_collector",
    },
    confidence: "verified",
    observedAt,
    freshForMs: 60 * 60 * 1_000,
  });
}

test("P3.1 production source contains no network, DB/ORM, SQL mutation, filesystem-write, secret-binding or worker primitives", () => {
  const source = readFileSync(new URL("./observation-evidence-persistence-design.ts", import.meta.url), "utf8");
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

test("P3.1 all capability and authorization gates remain fail-closed", () => {
  assert.deepEqual(OBSERVATION_AUTHORIZATION, {
    persistenceEnabled: false,
    ddlEnabled: false,
    dmlEnabled: false,
    databaseClientEnabled: false,
    migrationEnabled: false,
    networkEnabled: false,
    providerReadsAuthorized: false,
    providerWritesAuthorized: false,
    liveCrawlExecutionEnabled: false,
    filesystemWritesEnabled: false,
    environmentSecretBindingEnabled: false,
    schedulerEnabled: false,
    workerEnabled: false,
    autonomousMutationEnabled: false,
    publicSiteWritesEnabled: false,
    publicationAuthorized: false,
  });
  assert.ok(Object.values(OBSERVATION_AUTHORIZATION).every((value) => value === false));
});

test("P3.1 rejects unbounded observation collections and material maps", () => {
  const tooManyFields = Object.fromEntries(Array.from({ length: P3_1_LIMITS.valueFields + 1 }, (_, index) => [`field${index}`, index]));
  assert.throws(() => createObservation({
    subject: { kind: "site", siteId: "diamond-shelf", canonicalOrigin: "https://diamondshelf.us", urlId: null, canonicalUrl: null },
    observationKind: "technical_issue:test",
    materialValue: tooManyFields,
    provenance: { sourceKind: "hardening_source", sourceFingerprint: fingerprint("a"), collectorId: "hardening_collector" },
    confidence: "high",
    observedAt: "2026-09-16T06:00:00.000Z",
  }), /observation_material_value_invalid/);

  const one = record("2026-09-16T06:00:00.000Z", "one");
  assert.throws(
    () => buildObservationHistory(Array.from({ length: P3_1_LIMITS.historyRecords + 1 }, () => one), "2026-09-16T07:00:00.000Z"),
    /observation_history_record_limit_exceeded/,
  );
});

test("P3.1 history integrity rejects forged supersession relationships rather than trusting caller state", () => {
  const first = record("2026-09-16T06:00:00.000Z", "one");
  const second = record("2026-09-16T06:30:00.000Z", "two");
  const history = buildObservationHistory([first, second], "2026-09-16T06:45:00.000Z");
  assert.doesNotThrow(() => assertObservationHistoryIntegrity(history));

  const forged = {
    ...history,
    relations: history.relations.map((item, index) => index === 0 ? { ...item, toObservationId: item.fromObservationId } : item),
  };
  assert.throws(() => assertObservationHistoryIntegrity(forged), /observation_history_fingerprint_mismatch|observation_history_supersession_cycle/);
});

test("P3.1 does not retain caller-supplied arbitrary payload structures", () => {
  assert.throws(() => createObservation({
    subject: { kind: "site", siteId: "diamond-shelf", canonicalOrigin: "https://diamondshelf.us", urlId: null, canonicalUrl: null },
    observationKind: "technical_issue:test",
    materialValue: { nested: { token: "secret" } as never },
    provenance: { sourceKind: "hardening_source", sourceFingerprint: fingerprint("a"), collectorId: "hardening_collector" },
    confidence: "high",
    observedAt: "2026-09-16T06:00:00.000Z",
  }), /observation_material_scalar_invalid/);
});

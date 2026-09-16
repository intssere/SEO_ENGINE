import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  P3_2_PHYSICAL_INDEX_MAPPINGS,
  P3_3_P3_4_HISTORY_COMPATIBILITY,
  P3_6A_EVIDENCE_INDEXES,
  P3_6A_SCHEMA_CONTRACT,
  P3_6A_TABLE_CONTRACTS,
  POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION,
  assertP36APostgresSchemaContractIntegrity,
} from "./observation-evidence-postgres-schema-contract.js";

test("P3.6A production contract source contains no execution, SQL, secret, network, filesystem-write, worker or ambient-clock primitive", () => {
  const source = readFileSync(new URL("./observation-evidence-postgres-schema-contract.ts", import.meta.url), "utf8");
  const forbidden: Array<[RegExp, string]> = [
    [/\bfetch\s*\(/, "fetch"],
    [/\baxios\b/i, "axios"],
    [/from\s+["']node:(?:http|https|net|dns|tls|dgram)["']/, "network module"],
    [/from\s+["'](?:pg|postgres|mysql2|sqlite3|better-sqlite3|prisma|drizzle|knex|sequelize|typeorm)["']/, "database client or ORM"],
    [/\bCREATE\s+(?:TABLE|INDEX|SCHEMA|DATABASE)\b/i, "SQL DDL"],
    [/\bALTER\s+(?:TABLE|SCHEMA|DATABASE)\b/i, "SQL DDL"],
    [/\bDROP\s+(?:TABLE|INDEX|SCHEMA|DATABASE)\b/i, "SQL DDL"],
    [/\bTRUNCATE\b/i, "SQL destructive DDL"],
    [/\bINSERT\s+INTO\b/i, "SQL DML"],
    [/\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b/i, "SQL DML"],
    [/\bDELETE\s+FROM\b/i, "SQL DML"],
    [/\bMERGE\s+INTO\b/i, "SQL DML"],
    [/\bCOPY\s+[A-Za-z_][A-Za-z0-9_.]*\s+(?:FROM|TO)\b/i, "SQL COPY"],
    [/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/, "filesystem write"],
    [/\bprocess\.env\b/, "environment binding"],
    [/\b(?:setInterval|setTimeout)\s*\(/, "scheduler primitive"],
    [/\b(?:Worker|worker_threads|child_process)\b/, "worker/process primitive"],
    [/\bDate\.now\s*\(/, "ambient clock"],
    [/\bnew\s+Date\s*\(\s*\)/, "ambient clock"],
    [/\bMath\.random\s*\(/, "random identity"],
    [/\brandomUUID\s*\(/, "random UUID identity"],
    [/\bDEFAULT\s+(?:now\s*\(|CURRENT_TIMESTAMP)\b/i, "database wall-clock default"],
  ];
  for (const [pattern, label] of forbidden) {
    assert.equal(pattern.test(source), false, `production contract source must not contain ${label}`);
  }
});

test("P3.6A physical contract is bounded, internally resolvable and fail-closed", () => {
  assert.doesNotThrow(() => assertP36APostgresSchemaContractIntegrity());
  assert.equal(P3_6A_TABLE_CONTRACTS.length, 3);
  assert.ok(P3_2_PHYSICAL_INDEX_MAPPINGS.length > 0);
  assert.ok(P3_6A_EVIDENCE_INDEXES.length > 0);
  assert.ok(P3_3_P3_4_HISTORY_COMPATIBILITY.length > 0);
  assert.match(P3_6A_SCHEMA_CONTRACT.contractFingerprint, /^[a-f0-9]{64}$/);
  assert.ok(Object.values(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION).every((value) => value === false));
});

test("P3.6A contract does not persist P3.5 quality/conflict advisory fields", () => {
  const persistedColumns = P3_6A_TABLE_CONTRACTS.flatMap((table) => table.columns.map((column) => column.name));
  const forbiddenAdvisoryColumns = [
    "support_tier",
    "freshness_state",
    "conflict_group_id",
    "resolution_state",
    "preferred_value_fingerprint",
    "assessment_fingerprint",
    "group_fingerprint",
  ];
  for (const column of forbiddenAdvisoryColumns) assert.equal(persistedColumns.includes(column), false, `${column} must remain advisory-only`);
});

test("P3.6A deferred P3.3/P3.4 relation/decision mappings remain explicit instead of silently disappearing", () => {
  const deferred = P3_3_P3_4_HISTORY_COMPATIBILITY.filter((mapping) => mapping.status === "deferred_relation_or_decision_storage");
  assert.ok(deferred.length >= 1);
  assert.ok(deferred.every((mapping) => mapping.table === null));
  assert.ok(deferred.every((mapping) => mapping.columns.length === 0));
  assert.ok(deferred.every((mapping) => mapping.reason.length > 0));
});

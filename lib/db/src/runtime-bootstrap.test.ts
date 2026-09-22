import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAMOND_SHELF_SITE,
  EXPECTED_CORE_TABLE_COUNT,
  EXPECTED_CURRENT_TABLE_COUNT,
  EXPECTED_OBSERVATION_EVIDENCE_TABLE_COUNT,
  EXPECTED_RUNTIME_TABLE_COUNT,
  EXPECTED_CRAWL_EXECUTION_STATE_TABLE_COUNT,
  EXPECTED_P12_2_TABLE_COUNT,
  planRuntimeBootstrap,
} from "./runtime-bootstrap.js";

test("empty public schema is eligible for core plus auth migrations", () => {
  const plan = planRuntimeBootstrap(0);
  assert.equal(plan.schemaState, "empty");
  assert.equal(plan.applyCoreMigration, true);
  assert.equal(plan.applyAuthMigration, true);
  assert.equal(plan.upsertDiamondShelf, true);
  assert.equal(plan.blocked, false);
});

test("legacy core schema is eligible only for the Task #55 auth migration", () => {
  const plan = planRuntimeBootstrap(EXPECTED_CORE_TABLE_COUNT);
  assert.equal(plan.schemaState, "core_ready");
  assert.equal(plan.applyCoreMigration, false);
  assert.equal(plan.applyAuthMigration, true);
  assert.equal(plan.upsertDiamondShelf, true);
  assert.equal(plan.blocked, false);
});

test("fully initialized runtime schema skips migrations and allows idempotent site upsert", () => {
  const plan = planRuntimeBootstrap(EXPECTED_RUNTIME_TABLE_COUNT);
  assert.equal(plan.schemaState, "ready");
  assert.equal(plan.applyCoreMigration, false);
  assert.equal(plan.applyAuthMigration, false);
  assert.equal(plan.upsertDiamondShelf, true);
  assert.equal(plan.blocked, false);
});

test("current P3.6 and future P12.2 schemas are recognized without automatic migration", () => {
  for (const count of [EXPECTED_CURRENT_TABLE_COUNT, EXPECTED_P12_2_TABLE_COUNT]) {
    const plan = planRuntimeBootstrap(count);
    assert.equal(plan.schemaState, "ready");
    assert.equal(plan.blocked, false);
    assert.equal(plan.applyCoreMigration, false);
    assert.equal(plan.applyAuthMigration, false);
    assert.equal(plan.upsertDiamondShelf, true);
  }
});

test("unrecognized partial or unsupported future schema states fail closed", () => {
  for (const count of [
    12,
    EXPECTED_CORE_TABLE_COUNT + 1,
    EXPECTED_RUNTIME_TABLE_COUNT + 1,
    EXPECTED_CURRENT_TABLE_COUNT + 1,
    EXPECTED_P12_2_TABLE_COUNT + 1,
  ]) {
    const plan = planRuntimeBootstrap(count);
    assert.equal(plan.schemaState, "partial");
    assert.equal(plan.blocked, true);
    assert.equal(plan.applyCoreMigration, false);
    assert.equal(plan.applyAuthMigration, false);
    assert.match(plan.reason ?? "", /not a recognized state/);
  }
});

test("invalid table counts fail closed", () => {
  assert.equal(planRuntimeBootstrap(-1).blocked, true);
  assert.equal(planRuntimeBootstrap(2.5).blocked, true);
});

test("bootstrap target is locked to Diamond Shelf production identity", () => {
  assert.equal(DIAMOND_SHELF_SITE.domain, "diamondshelf.us");
  assert.equal(DIAMOND_SHELF_SITE.canonicalOrigin, "https://diamondshelf.us");
  assert.equal(DIAMOND_SHELF_SITE.platform, "shopify");
});

test("current runtime schema count includes the P3.6 observation/evidence tables", () => {
  assert.equal(EXPECTED_OBSERVATION_EVIDENCE_TABLE_COUNT, 3);
  assert.equal(EXPECTED_CURRENT_TABLE_COUNT, 34);
  assert.equal(
    EXPECTED_CURRENT_TABLE_COUNT,
    EXPECTED_RUNTIME_TABLE_COUNT + EXPECTED_OBSERVATION_EVIDENCE_TABLE_COUNT,
  );
});


test("P12.2 future schema count adds exactly three crawl execution-state tables", () => {
  assert.equal(EXPECTED_CRAWL_EXECUTION_STATE_TABLE_COUNT, 3);
  assert.equal(EXPECTED_P12_2_TABLE_COUNT, 37);
  assert.equal(
    EXPECTED_P12_2_TABLE_COUNT,
    EXPECTED_CURRENT_TABLE_COUNT + EXPECTED_CRAWL_EXECUTION_STATE_TABLE_COUNT,
  );
});

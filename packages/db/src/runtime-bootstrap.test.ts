import assert from "node:assert/strict";
import test from "node:test";
import { DIAMOND_SHELF_SITE, EXPECTED_CORE_TABLE_COUNT, planRuntimeBootstrap } from "./runtime-bootstrap.js";

test("empty public schema is eligible for one core migration", () => {
  const plan = planRuntimeBootstrap(0);
  assert.equal(plan.schemaState, "empty");
  assert.equal(plan.applyCoreMigration, true);
  assert.equal(plan.upsertDiamondShelf, true);
  assert.equal(plan.blocked, false);
});

test("fully initialized core schema skips migration and allows idempotent site upsert", () => {
  const plan = planRuntimeBootstrap(EXPECTED_CORE_TABLE_COUNT);
  assert.equal(plan.schemaState, "ready");
  assert.equal(plan.applyCoreMigration, false);
  assert.equal(plan.upsertDiamondShelf, true);
  assert.equal(plan.blocked, false);
});

test("partial schema fails closed rather than applying destructive guesses", () => {
  const plan = planRuntimeBootstrap(12);
  assert.equal(plan.schemaState, "partial");
  assert.equal(plan.blocked, true);
  assert.equal(plan.applyCoreMigration, false);
  assert.match(plan.reason ?? "", /partial/);
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

import assert from "node:assert/strict";
import test from "node:test";
import {
  assessP122L1AObservation,
  buildP122L1AReceipt,
  P12_2_L1A_SCOPE,
} from "./p12-2-l1a-readonly-production-binding.js";

const site = {
  exactSiteRowFound: true,
  exactSiteCanonicalOrigin: "https://diamondshelf.us",
  extraSiteRowsRead: 0,
  ddlStatementsExecuted: 0,
  dmlStatementsExecuted: 0,
  applicationRowsReadBeyondExactSiteBinding: 0,
};

test("accepts only exact 34-table pre-migration state for migration review", () => {
  const result = assessP122L1AObservation({
    ...site,
    publicBaseTableCount: 34,
    p12TablesPresent: false,
    p12Tables: [],
  });
  assert.deepEqual(result, {
    status: "eligible_for_migration_review",
    schemaState: "certified_pre_migration_34",
    migrationAlreadyApplied: false,
    code: "p12_2_l1a_pre_migration_state_matches",
  });
});

test("accepts exact 37-table post-migration structure without requiring migration", () => {
  const result = assessP122L1AObservation({
    ...site,
    publicBaseTableCount: 37,
    p12TablesPresent: true,
    p12Tables: P12_2_L1A_SCOPE.p12Tables.map((name) => ({
      name,
      columnsMatchCertifiedContract: true,
      constraintsMatchCertifiedContract: true,
      indexesMatchCertifiedContract: true,
    })),
  });
  assert.equal(result.status, "migration_not_required");
  assert.equal(result.migrationAlreadyApplied, true);
});

test("fails closed on site mismatch, extra row reads or any write", () => {
  const base = {
    ...site,
    publicBaseTableCount: 34,
    p12TablesPresent: false,
    p12Tables: [],
  };
  assert.equal(assessP122L1AObservation({
    ...base,
    exactSiteCanonicalOrigin: "https://example.com",
  }).status, "blocked");
  assert.equal(assessP122L1AObservation({
    ...base,
    extraSiteRowsRead: 1,
  }).status, "blocked");
  assert.equal(assessP122L1AObservation({
    ...base,
    ddlStatementsExecuted: 1,
  }).status, "blocked");
  assert.equal(assessP122L1AObservation({
    ...base,
    dmlStatementsExecuted: 1,
  }).status, "blocked");
});

test("fails closed on partial or structurally mismatched 37-table state", () => {
  const result = assessP122L1AObservation({
    ...site,
    publicBaseTableCount: 37,
    p12TablesPresent: true,
    p12Tables: P12_2_L1A_SCOPE.p12Tables.map((name, index) => ({
      name,
      columnsMatchCertifiedContract: index !== 0,
      constraintsMatchCertifiedContract: true,
      indexesMatchCertifiedContract: true,
    })),
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.code, "p12_2_l1a_schema_state_unexpected");
});

test("receipt is deterministic", () => {
  const observation = {
    ...site,
    publicBaseTableCount: 34,
    p12TablesPresent: false,
    p12Tables: [],
  };
  assert.equal(
    buildP122L1AReceipt(observation).fingerprint,
    buildP122L1AReceipt(observation).fingerprint,
  );
});

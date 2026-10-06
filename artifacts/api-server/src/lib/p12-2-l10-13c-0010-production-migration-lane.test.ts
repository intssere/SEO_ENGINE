import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_13C_A_EXPECTED_TABLE_COUNT,
  P12_2_L10_13C_A_MIGRATION_BLOB_SHA,
  P12_2_L10_13C_A_MIGRATION_SHA256,
  P12_2_L10_13C_A_QUERIES,
  assertP122L1013CAQueryContract,
  p122L1013CAAuthorizationFingerprint,
  p122L1013CAAuthorizationLiteral,
  p122L1013CAQuerySetFingerprint,
} from "./p12-2-l10-13c-a-0010-readonly-certification.js";
import {
  P12_2_L10_13C_B_EXPECTED_POST_TABLE_COUNT,
  P12_2_L10_13C_B_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L10_13C_B_MIGRATION_BLOB_SHA,
  P12_2_L10_13C_B_MIGRATION_SHA256,
  p122L1013CBAuthorizationFingerprint,
  p122L1013CBAuthorizationLiteral,
} from "./p12-2-l10-13c-b-0010-apply-contract.js";
import {
  P12_2_L10_13C_C_EXPECTED_TABLE_COUNT,
  P12_2_L10_13C_C_MIGRATION_BLOB_SHA,
  P12_2_L10_13C_C_MIGRATION_SHA256,
  P12_2_L10_13C_C_QUERIES,
  assertP122L1013CCQueryContract,
  p122L1013CCAuthorizationFingerprint,
  p122L1013CCAuthorizationLiteral,
  p122L1013CCQuerySetFingerprint,
} from "./p12-2-l10-13c-c-0010-post-certification.js";

const BLOB="a22547808f1a8d30424c659435dc81bf3da44023";
const SHA256="f97c1d5417d0eaf0eae46d075e1b85125a1a2aa91881a921b640f596fc921516";

test("L10.13C migration 0010 contracts pin the exact immutable migration identity",()=>{
  assert.equal(P12_2_L10_13C_A_MIGRATION_BLOB_SHA,BLOB);
  assert.equal(P12_2_L10_13C_B_MIGRATION_BLOB_SHA,BLOB);
  assert.equal(P12_2_L10_13C_C_MIGRATION_BLOB_SHA,BLOB);
  assert.equal(P12_2_L10_13C_A_MIGRATION_SHA256,SHA256);
  assert.equal(P12_2_L10_13C_B_MIGRATION_SHA256,SHA256);
  assert.equal(P12_2_L10_13C_C_MIGRATION_SHA256,SHA256);
  assert.equal(P12_2_L10_13C_A_EXPECTED_TABLE_COUNT,44);
  assert.equal(P12_2_L10_13C_B_EXPECTED_PRE_TABLE_COUNT,44);
  assert.equal(P12_2_L10_13C_B_EXPECTED_POST_TABLE_COUNT,47);
  assert.equal(P12_2_L10_13C_C_EXPECTED_TABLE_COUNT,47);
});

test("L10.13C pre/post certification contracts are SELECT-only and deterministic",()=>{
  assert.doesNotThrow(()=>assertP122L1013CAQueryContract());
  assert.doesNotThrow(()=>assertP122L1013CCQueryContract());
  assert.equal(P12_2_L10_13C_A_QUERIES.length,6);
  assert.equal(P12_2_L10_13C_C_QUERIES.length,6);
  for(const query of [...P12_2_L10_13C_A_QUERIES,...P12_2_L10_13C_C_QUERIES]){
    assert.match(query.sql.trim(),/^SELECT\b/i);
    assert.equal(query.sql.includes(";"),false);
  }
  assert.match(p122L1013CAQuerySetFingerprint(),/^[0-9a-f]{64}$/);
  assert.match(p122L1013CCQuerySetFingerprint(),/^[0-9a-f]{64}$/);
  assert.match(p122L1013CAAuthorizationFingerprint(),/^[0-9a-f]{64}$/);
  assert.match(p122L1013CCAuthorizationFingerprint(),/^[0-9a-f]{64}$/);
  assert.match(p122L1013CAAuthorizationLiteral(),/^AUTHORIZE:P12_2_L10_13C_0010_PRE_APPLY_READ_ONLY:[0-9a-f]{64}$/);
  assert.match(p122L1013CCAuthorizationLiteral(),/^AUTHORIZE:P12_2_L10_13C_0010_POST_APPLY_READ_ONLY:[0-9a-f]{64}$/);
});

test("L10.13C apply authorization is separate and deterministic",()=>{
  assert.match(p122L1013CBAuthorizationFingerprint(),/^[0-9a-f]{64}$/);
  assert.match(p122L1013CBAuthorizationLiteral(),/^AUTHORIZE:P12_2_L10_13C_0010_APPLY:[0-9a-f]{64}$/);
  assert.notEqual(p122L1013CBAuthorizationLiteral(),p122L1013CAAuthorizationLiteral());
  assert.notEqual(p122L1013CBAuthorizationLiteral(),p122L1013CCAuthorizationLiteral());
});

test("L10.13C pre/post guards preserve packet 013 durable state and target-table emptiness semantics",()=>{
  const pre=P12_2_L10_13C_A_QUERIES.map(q=>q.sql).join("\n");
  const post=P12_2_L10_13C_C_QUERIES.map(q=>q.sql).join("\n");
  assert.match(pre,/6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99/);
  assert.match(pre,/terminalFailures/);
  assert.match(pre,/first_party_crawl_terminal_failure_events/);
  assert.match(post,/6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99/);
  assert.match(post,/first_party_crawl_terminal_failure_events\)=0/);
  assert.match(post,/trg_first_party_crawl_accounting_snapshots_immutable/);
});

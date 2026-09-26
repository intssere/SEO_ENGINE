import assert from "node:assert/strict";
import test from "node:test";
import { attestDatabaseBinding, P8_8_W09C2D_PARSER_VERSION } from "./p8-8-w09c2d-binding-attestation.js";

const KEYS = [
  "parser_version","scheme_family","host","port","database_name","provider_hint",
  "endpoint_or_compute_hint","project_hint","branch_hint","timeline_or_equivalent_hint",
  "binding_fingerprint","secret_material_exposed","network_access_performed",
  "database_session_opened","state_mutated","result","code",
].sort();

test("sanitizes a synthetic Neon-shaped binding and exposes exact keys only", () => {
  const raw = "postgresql://alice:super-secret@ep-example-123.us-east-2.aws.neon.tech:5432/appdb?sslmode=require&token=hidden#fragment";
  const result = attestDatabaseBinding(raw);
  assert.deepEqual(Object.keys(result).sort(), KEYS);
  assert.equal(result.parser_version, P8_8_W09C2D_PARSER_VERSION);
  assert.equal(result.host, "ep-example-123.us-east-2.aws.neon.tech");
  assert.equal(result.database_name, "appdb");
  assert.equal(result.provider_hint, "neon");
  assert.equal(result.endpoint_or_compute_hint, "ep-example-123");
  assert.equal(result.project_hint, null);
  assert.equal(result.branch_hint, null);
  assert.equal(result.timeline_or_equivalent_hint, null);
  assert.equal(result.secret_material_exposed, false);
  assert.equal(result.network_access_performed, false);
  assert.equal(result.database_session_opened, false);
  assert.equal(result.state_mutated, false);
  const serialized = JSON.stringify(result);
  for (const forbidden of ["alice","super-secret","sslmode","token","hidden","fragment",raw]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("credential and query-secret changes cannot affect identity fingerprint", () => {
  const a = attestDatabaseBinding("postgres://u1:p1@ep-example-123.us-east-2.aws.neon.tech/appdb?sslmode=require&token=one");
  const b = attestDatabaseBinding("postgresql://u2:p2@ep-example-123.us-east-2.aws.neon.tech/appdb?sslmode=verify-full&token=two");
  assert.equal(a.binding_fingerprint, b.binding_fingerprint);
});

test("unknown PostgreSQL hosts remain unknown and do not invent lineage", () => {
  const result = attestDatabaseBinding("postgresql://u:p@db.example.test:5432/appdb");
  assert.equal(result.result, "pass");
  assert.equal(result.provider_hint, "unknown");
  assert.equal(result.endpoint_or_compute_hint, null);
  assert.equal(result.project_hint, null);
  assert.equal(result.branch_hint, null);
  assert.equal(result.timeline_or_equivalent_hint, null);
});

test("historical identifiers are never defaulted", () => {
  const serialized = JSON.stringify(attestDatabaseBinding("postgresql://u:p@db.example.test/appdb"));
  for (const historical of ["late-sunset-42762033","br-super-frost-b341k9ms","07b8ce1a7a41f71ba395a1bab2b03de3","ep-lucky-river-b3sh13is","ep-muddy-mouse-b34bjs0w"]) {
    assert.equal(serialized.includes(historical), false);
  }
});

test("fails closed with fixed codes for unsupported and malformed inputs", () => {
  assert.equal(attestDatabaseBinding("").code, "missing_binding");
  assert.equal(attestDatabaseBinding("x".repeat(8193)).code, "binding_too_large");
  assert.equal(attestDatabaseBinding("https://example.test/db").code, "unsupported_scheme");
  assert.equal(attestDatabaseBinding("not a uri").code, "malformed_binding");
  assert.equal(attestDatabaseBinding("postgresql://user:pass@host.example/").code, "missing_database_name");
  assert.equal(attestDatabaseBinding("postgresql://user:pass@host.example/bad%2Fname").code, "invalid_database_name");
});

test("parser does not read ambient DATABASE_URL", () => {
  const prior = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://ambient:secret@ep-ambient.us-east-2.aws.neon.tech/ambientdb";
  try {
    const result = attestDatabaseBinding("");
    assert.equal(result.code, "missing_binding");
    assert.equal(result.host, null);
    assert.equal(result.database_name, null);
  } finally {
    if (prior === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prior;
  }
});

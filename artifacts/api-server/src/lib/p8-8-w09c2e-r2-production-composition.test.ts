import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { attestDatabaseBinding } from "./p8-8-w09c2d-binding-attestation.js";
import {
  resolveProductionBindingAttestation,
  type P88W09C2ER1ExpectedIdentity,
} from "./p8-8-w09c2e-r1-binding-resolution.js";
import {
  createProductionBindingSupplier,
  P8_8_W09C2E_R2_COMPOSITION_VERSION,
} from "./p8-8-w09c2e-r2-production-composition.js";
import type { ServingProvenanceAttestation } from "./p8-8-w09c2-h6-r1-serving-provenance.js";

const expected: P88W09C2ER1ExpectedIdentity = {
  deployment_publication_identity: "deployment-synthetic-r2",
  canonical_application_sha: "a".repeat(40),
  canonical_tree_sha: "b".repeat(40),
  serving_provenance_fingerprint: "c".repeat(64),
};

function serving(commit = expected.canonical_application_sha): ServingProvenanceAttestation {
  return {
    result: "pass",
    code: "ok",
    attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1",
    provenance: {
      schema_version: "p8-8-w09c2f-build-provenance-v1",
      canonical_commit_sha: commit,
      canonical_tree_sha: expected.canonical_tree_sha,
      source_branch: "main",
      generated_at_build: "2026-09-26T00:00:00.000Z",
      provenance_fingerprint: expected.serving_provenance_fingerprint,
    },
  };
}

test("adapter preserves the exact opaque binding value", () => {
  const raw = "postgresql://synthetic-user:synthetic-pass@example.invalid/db?token=synthetic#fragment";
  const supplier = createProductionBindingSupplier(raw);
  assert.equal(P8_8_W09C2E_R2_COMPOSITION_VERSION, "p8-8-w09c2e-r2-production-composition-v1");
  assert.strictEqual(supplier(), raw);
});

test("exact provenance permits one supplier and one parser invocation", async () => {
  const raw = "postgresql://secret-user:secret-pass@ep-r2-safe.us-east-2.aws.neon.tech/neondb?sslmode=require#secret-fragment";
  const baseSupplier = createProductionBindingSupplier(raw);
  let supplierCalls = 0;
  let parserCalls = 0;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    () => { supplierCalls += 1; return baseSupplier(); },
    (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
  );
  assert.equal(result.result, "pass");
  assert.equal(supplierCalls, 1);
  assert.equal(parserCalls, 1);
  assert.equal(result.binding_resolution_attempt_count, 1);
  assert.equal(result.parser_invocation_count, 1);
  const serialized = JSON.stringify(result);
  for (const secret of ["secret-user", "secret-pass", "sslmode", "secret-fragment"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("provenance mismatch performs zero supplier and parser access", async () => {
  const baseSupplier = createProductionBindingSupplier("postgresql://u:p@example.invalid/db");
  let supplierCalls = 0;
  let parserCalls = 0;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving("d".repeat(40)),
    () => { supplierCalls += 1; return baseSupplier(); },
    (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
  );
  assert.equal(result.code, "serving_provenance_mismatch");
  assert.equal(supplierCalls, 0);
  assert.equal(parserCalls, 0);
});

test("missing composition binding fails closed before parser invocation", async () => {
  const supplier = createProductionBindingSupplier(undefined);
  let parserCalls = 0;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    supplier,
    (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
  );
  assert.equal(result.code, "production_binding_missing");
  assert.equal(result.binding_resolution_attempt_count, 1);
  assert.equal(result.parser_invocation_count, 0);
  assert.equal(parserCalls, 0);
});

test("adapter and composition root retain the static authority boundary", async () => {
  const adapter = await readFile(new URL("./p8-8-w09c2e-r2-production-composition.ts", import.meta.url), "utf8");
  const index = await readFile(new URL("../index.ts", import.meta.url), "utf8");
  const forbiddenAdapter = [
    "process" + ".env",
    "DATABASE" + "_URL",
    "postgres" + "(",
    "fetch" + "(",
    "http" + ".request",
    "https" + ".request",
    "dns" + ".",
    "Rail" + "way",
    "read" + "File(",
    "write" + "File(",
    "logger" + ".",
    "scheduler" + ".",
    "worker" + ".",
    "resolveProduction" + "BindingAttestation",
  ];
  for (const marker of forbiddenAdapter) assert.equal(adapter.includes(marker), false, marker);

  assert.equal((index.match(/process\.env\.DATABASE_URL/g) ?? []).length, 1);
  assert.equal(index.includes("createProductionBindingSupplier(databaseBinding)"), true);
  assert.equal(index.includes("resolveProductionBindingAttestation"), false);
  assert.equal(index.includes("/w09-c2e"), false);
});

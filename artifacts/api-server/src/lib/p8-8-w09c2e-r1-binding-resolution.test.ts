import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  resolveProductionBindingAttestation,
  type P88W09C2ER1ExpectedIdentity,
} from "./p8-8-w09c2e-r1-binding-resolution.js";
import {
  P8_8_W09C2D_PARSER_VERSION,
  attestDatabaseBinding,
  type P88W09C2DBindingAttestation,
} from "./p8-8-w09c2d-binding-attestation.js";
import type { ServingProvenanceAttestation } from "./p8-8-w09c2-h6-r1-serving-provenance.js";

const expected: P88W09C2ER1ExpectedIdentity = {
  deployment_publication_identity: "deployment-synthetic-1",
  canonical_application_sha: "a".repeat(40),
  canonical_tree_sha: "b".repeat(40),
  serving_provenance_fingerprint: "c".repeat(64),
};

function serving(overrides: Record<string, string> = {}): ServingProvenanceAttestation {
  return {
    result: "pass",
    code: "ok",
    attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1",
    provenance: {
      schema_version: "p8-8-w09c2f-build-provenance-v1",
      canonical_commit_sha: overrides.commit ?? expected.canonical_application_sha,
      canonical_tree_sha: overrides.tree ?? expected.canonical_tree_sha,
      source_branch: "main",
      generated_at_build: "2026-09-26T00:00:00.000Z",
      provenance_fingerprint: overrides.fingerprint ?? expected.serving_provenance_fingerprint,
    },
  };
}

test("exact provenance invokes supplier and parser once and emits only sanitized identity", async () => {
  const raw = "postgresql://secret-user:secret-password@ep-safe-123.us-east-2.aws.neon.tech/neondb?sslmode=require#secret-fragment";
  let supplierCalls = 0;
  let parserCalls = 0;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    () => { supplierCalls += 1; return raw; },
    (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
  );
  assert.equal(supplierCalls, 1);
  assert.equal(parserCalls, 1);
  assert.equal(result.result, "pass");
  assert.equal(result.code, "ok");
  assert.equal(result.binding_resolution_attempt_count, 1);
  assert.equal(result.parser_invocation_count, 1);
  assert.equal(result.parser_version, P8_8_W09C2D_PARSER_VERSION);
  assert.equal(result.host, "ep-safe-123.us-east-2.aws.neon.tech");
  const serialized = JSON.stringify(result);
  for (const secret of ["secret-user", "secret-password", "sslmode", "secret-fragment"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

for (const [name, load] of [
  ["unavailable", async () => ({ result: "fail_closed", code: "artifact_unavailable", attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1" } as const)],
  ["commit mismatch", async () => serving({ commit: "d".repeat(40) })],
  ["tree mismatch", async () => serving({ tree: "d".repeat(40) })],
  ["fingerprint mismatch", async () => serving({ fingerprint: "d".repeat(64) })],
] as const) {
  test(`provenance ${name} blocks binding and parser access`, async () => {
    let supplierCalls = 0;
    let parserCalls = 0;
    const result = await resolveProductionBindingAttestation(
      expected,
      load,
      () => { supplierCalls += 1; return "postgresql://u:p@example.com/db"; },
      (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
    );
    assert.equal(result.result, "fail_closed");
    assert.equal(supplierCalls, 0);
    assert.equal(parserCalls, 0);
    assert.equal(result.binding_resolution_attempt_count, 0);
    assert.equal(result.parser_invocation_count, 0);
  });
}

test("missing expected publication identity fails before provenance or binding", async () => {
  let provenanceCalls = 0;
  let supplierCalls = 0;
  const result = await resolveProductionBindingAttestation(
    { ...expected, deployment_publication_identity: "" },
    async () => { provenanceCalls += 1; return serving(); },
    () => { supplierCalls += 1; return "postgresql://u:p@example.com/db"; },
  );
  assert.equal(result.code, "missing_expected_publication_identity");
  assert.equal(provenanceCalls, 0);
  assert.equal(supplierCalls, 0);
});

test("unbound supplier fails closed without parser invocation", async () => {
  const result = await resolveProductionBindingAttestation(expected, async () => serving());
  assert.equal(result.code, "production_binding_source_unbound");
  assert.equal(result.binding_resolution_attempt_count, 0);
  assert.equal(result.parser_invocation_count, 0);
});

test("missing binding consumes one supplier attempt but never invokes parser", async () => {
  let parserCalls = 0;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    () => undefined,
    (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
  );
  assert.equal(result.code, "production_binding_missing");
  assert.equal(result.binding_resolution_attempt_count, 1);
  assert.equal(result.parser_invocation_count, 0);
  assert.equal(parserCalls, 0);
});

test("parser fail-closed is sanitized and counted exactly once", async () => {
  const raw = "not-a-secret-but-malformed";
  let parserCalls = 0;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    () => raw,
    (binding) => { parserCalls += 1; return attestDatabaseBinding(binding); },
  );
  assert.equal(parserCalls, 1);
  assert.equal(result.code, "parser_fail_closed");
  assert.equal(result.binding_resolution_attempt_count, 1);
  assert.equal(result.parser_invocation_count, 1);
  assert.equal(JSON.stringify(result).includes(raw), false);
});

test("parser exception cannot leak the raw binding", async () => {
  const raw = "postgresql://leak-user:leak-pass@example.com/db?token=leak-token";
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    () => raw,
    () => { throw new Error(raw); },
  );
  assert.equal(result.code, "parser_fail_closed");
  assert.equal(JSON.stringify(result).includes("leak-"), false);
});

test("safety invariant violation fails closed", async () => {
  const unsafe = {
    ...attestDatabaseBinding("postgresql://u:p@example.com/db"),
    secret_material_exposed: true,
  } as unknown as P88W09C2DBindingAttestation;
  const result = await resolveProductionBindingAttestation(
    expected,
    async () => serving(),
    () => "postgresql://u:p@example.com/db",
    () => unsafe,
  );
  assert.equal(result.code, "safety_invariant_violation");
  assert.equal(result.result, "fail_closed");
});

test("resolver source retains the static authority boundary", async () => {
  const source = await readFile(new URL("./p8-8-w09c2e-r1-binding-resolution.ts", import.meta.url), "utf8");
  const forbidden = [
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
    "scheduler" + ".",
    "worker" + ".",
  ];
  for (const marker of forbidden) assert.equal(source.includes(marker), false, marker);
  assert.equal(source.includes('from "./p8-8-w09c2d-binding-attestation.js"'), true);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const manifest = JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json", import.meta.url), "utf8"));

function validate(data) {
  assert.equal(data.schema, "seo-engine-int-02a-migration-source-map-v1");
  assert.equal(data.status, "DESIGN_ONLY_NOT_APPROVED_FOR_EXECUTION");
  for (const guard of ["executeSql", "deploy", "productionDatabaseAccess"]) assert.equal(data.guards[guard], false);
  for (const guard of ["preserveMain0008Through0011", "requireIndependentInstalledLineageCertification", "requireDisposablePostgresBeforePromotion"]) assert.equal(data.guards[guard], true);
  assert.match(data.mainHead, /^[a-f0-9]{40}$/);
  assert.match(data.pinnedUgpHead, /^[a-f0-9]{40}$/);
  assert.equal(data.entries.length, 4);
  const original = new Set(), candidate = new Set();
  data.entries.forEach((e,i) => {
    assert.match(e.gitBlobSha1, /^[a-f0-9]{40}$/);
    assert.match(e.rawSha256, /^[a-f0-9]{64}$/);
    assert.match(e.original, new RegExp("^" + String(i+8).padStart(4,"0") + "_ugp_.*\\.sql$"));
    assert.match(e.candidate, new RegExp("^" + String(i+12).padStart(4,"0") + "_ugp_.*\\.sql$"));
    assert.equal(e.candidate.slice(5), e.original.slice(5));
    assert.ok(Array.isArray(e.requiredObjects) && e.requiredObjects.length);
    assert.ok(!original.has(e.original) && !candidate.has(e.candidate));
    original.add(e.original); candidate.add(e.candidate);
  });
}

test("source mapping is immutable-evidence-only and fail-closed", () => validate(manifest));
test("rejects admission of execution", () => assert.throws(() => validate({...manifest, guards:{...manifest.guards, executeSql:true}})));
test("rejects duplicate integration identity", () => assert.throws(() => validate({...manifest, entries:manifest.entries.map((e,i) => i===1?{...e,candidate:manifest.entries[0].candidate}:e)})));
test("rejects mangled SQL checksum", () => assert.throws(() => validate({...manifest, entries:manifest.entries.map((e,i) => i===0?{...e,rawSha256:"unknown"}:e)})));

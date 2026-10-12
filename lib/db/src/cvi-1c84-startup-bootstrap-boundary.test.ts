import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("CVI-1C.84: serving entrypoint verifies identity without invoking mutating bootstrap", () => {
  const startup = source("../../../artifacts/api-server/src/index.ts");
  assert.match(startup, /ensureDiamondShelfIdentity/);
  assert.match(startup, /identity\.status\s*!==\s*"ready"/);
  assert.doesNotMatch(startup, /bootstrapRuntimeDatabase|bootstrap:runtime|db:bootstrap/);
});

test("CVI-1C.84: Docker serving command does not run mutating bootstrap", () => {
  const dockerfile = source("../../../Dockerfile");
  assert.match(dockerfile, /CMD\s*\[\s*"node"\s*,\s*"--enable-source-maps"\s*,\s*"artifacts\/api-server\/dist\/index\.mjs"\s*\]/);
  assert.doesNotMatch(dockerfile, /\bbootstrap:runtime\b|\bdb:bootstrap\b/);
});

test("CVI-1C.84: mutating bootstrap is kept behind an explicit CLI entrypoint", () => {
  const cli = source("./bootstrap-runtime.ts");
  assert.match(cli, /bootstrapRuntimeDatabase\s*\(/);
  const dbPackage = JSON.parse(source("../package.json")) as { scripts?: Record<string,string> };
  assert.match(dbPackage.scripts?.["bootstrap:runtime"] ?? "", /bootstrap-runtime\.ts/);
});

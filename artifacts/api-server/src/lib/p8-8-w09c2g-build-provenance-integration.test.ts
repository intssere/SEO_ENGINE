import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("build integration runs provenance generation after bundle cleanup and before verifier", async () => {
  const pkg = JSON.parse(await readFile(path.join(artifactDir, "package.json"), "utf8"));
  const build = pkg.scripts.build;
  assert.match(build, /node \.\/build\.mjs && tsx \.\/src\/lib\/p8-8-w09c2g-build-provenance-cli\.ts && node \.\/verify-build\.mjs/);
});

test("generator resolves provenance identity only through the H5-R1 source identity boundary", async () => {
  const source = await readFile(fileURLToPath(new URL("./p8-8-w09c2g-build-provenance-cli.ts", import.meta.url)), "utf8");
  assert.equal(source.includes("resolveBuildSourceIdentity"), true);
  assert.equal(source.includes("process.env.EXPECTED_"), false);
  for (const forbidden of ["DATABASE_URL","late-sunset-42762033","br-super-frost-b341k9ms","ep-lucky-river-b3sh13is","ep-muddy-mouse-b34bjs0w"]) {
    assert.equal(source.includes(forbidden), false);
  }
  assert.equal(source.includes("dist\", \"build-provenance.json"), true);
  assert.equal(source.includes('flag: "wx"'), true);
});

test("post-build verifier requires exact provenance identity and fingerprint", async () => {
  const verifier = await readFile(path.join(artifactDir, "verify-build.mjs"), "utf8");
  for (const required of [
    "build-provenance.json",
    "EXPECTED_CANONICAL_COMMIT",
    "EXPECTED_CANONICAL_TREE",
    "EXPECTED_SOURCE_BRANCH",
    "execFileSync",
    "rev-parse",
    "symbolic-ref",
    "provenance_fingerprint",
    "source identity or fingerprint mismatch",
  ]) assert.equal(verifier.includes(required), true);
  for (const forbidden of ["DATABASE_URL","late-sunset-42762033","br-super-frost-b341k9ms"]) {
    assert.equal(verifier.includes(forbidden), false);
  }
});

test("integration introduces no production provenance HTTP route or publication command", async () => {
  const generator = await readFile(fileURLToPath(new URL("./p8-8-w09c2g-build-provenance-cli.ts", import.meta.url)), "utf8");
  for (const forbidden of ["express","router.","fetch(","http://","https://","publish","deploy","DATABASE_URL"]) {
    assert.equal(generator.includes(forbidden), false);
  }
});

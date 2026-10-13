import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const entrypoint = fileURLToPath(new URL("../index.ts", import.meta.url));

test("CVI-1C.86: isolated API entrypoint startup outcomes (current policy characterization)", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "cvi-startup-"));
  const output = path.join(directory, "entrypoint.mjs");
  try {
    await build({
      entryPoints: [entrypoint],
      outfile: output,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      logLevel: "silent",
      plugins: [{
        name: "no-io-startup-dependencies",
        setup(plugin) {
          const modules: Record<string, string> = {
            "./app": `export default { listen(port, callback) { console.log("CVI_LISTEN:" + port); callback(null); } };`,
            "./lib/logger": `export const logger = { info(...args) { console.log("CVI_LOG:" + JSON.stringify(args)); }, error() { console.log("CVI_ERROR"); } };`,
            "./lib/p8-8-w09c2e-r4-binding-boundary.js": `export const productionBindingSupplier = null;`,
            "./lib/startup-runtime.js": `export const loadStartupRuntimeConfig = () => ({ databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()), pilotQueueResumeEnabled: false });`,
            "@workspace/db": `export async function ensureDiamondShelfIdentity() { console.log("CVI_IDENTITY_CHECK"); return { status: process.env.CVI_TEST_IDENTITY_STATUS || "ready", reason: "synthetic_fixture", tableCount: 0 }; };`,
          };
          plugin.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(modules, args.path)
              ? { path: args.path, namespace: "cvi-startup-mock" }
              : undefined
          );
          plugin.onLoad({ filter: /.*/, namespace: "cvi-startup-mock" }, (args) => ({
            contents: modules[args.path],
            loader: "js",
          }));
          plugin.onResolve({ filter: /pilot-orchestration/ }, () => ({
            path: "pilot-orchestration",
            namespace: "cvi-startup-mock",
          }));
          plugin.onLoad({ filter: /^pilot-orchestration$/, namespace: "cvi-startup-mock" }, () => ({
            contents: `export async function resumeQueuedPilots() { console.log("CVI_RESUME"); }`,
            loader: "js",
          }));
        },
      }],
    });

    function run(databaseUrl: string | undefined, identityStatus = "ready") {
      const env: Record<string, string> = {
        PATH: process.env.PATH ?? "",
        PORT: "38127",
        NODE_ENV: "test",
        CVI_TEST_IDENTITY_STATUS: identityStatus,
        PILOT_INGESTION_QUEUE_RESUME_ENABLED: "false",
      };
      if (databaseUrl !== undefined) env.DATABASE_URL = databaseUrl;
      const result = spawnSync(process.execPath, [output], {
        encoding: "utf8",
        env,
        timeout: 5000,
      });
      assert.equal(result.error, undefined, String(result.error));
      return result;
    }

    for (const databaseUrl of [undefined, "", " \t "]) {
      const result = run(databaseUrl);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /CVI_LISTEN:38127/);
      assert.match(result.stdout, /DATABASE_URL is not configured/);
      assert.doesNotMatch(result.stdout, /CVI_IDENTITY_CHECK|CVI_RESUME/);
    }

    const ready = run("postgres://synthetic.invalid/test");
    assert.equal(ready.status, 0, ready.stderr);
    assert.match(ready.stdout, /CVI_IDENTITY_CHECK/);
    assert.match(ready.stdout, /CVI_LISTEN:38127/);
    assert.doesNotMatch(ready.stdout, /CVI_RESUME/);

    for (const status of ["blocked", "invalid"]) {
      const result = run("postgres://synthetic.invalid/test", status);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /CVI_IDENTITY_CHECK/);
      assert.doesNotMatch(result.stdout, /CVI_LISTEN:38127|CVI_RESUME/);
      assert.match(result.stderr, /Database identity verification blocked startup/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, "..");
const mocks: Record<string, string> = {
  "./app": 'export default { listen: (_port, cb) => { process.stdout.write("MOCK_APP_LISTEN\\n"); cb?.(); } };',
  "./lib/logger": 'export const logger = { info: () => {}, error: () => {} };',
  "./lib/p8-8-w09c2e-r4-binding-boundary.js": "export const productionBindingSupplier = () => null;",
  "./lib/startup-runtime.js": "export const loadStartupRuntimeConfig = () => ({databaseConfigured:false,pilotQueueResumeEnabled:false});",
  "@workspace/db": 'export const ensureDiamondShelfIdentity = async () => ({status:"blocked",reason:"mock-only"});',
  "./lib/pilot-orchestration": "export const resumeQueuedPilots = async () => {};"
};
const mockPlugin: Plugin = {
  name: "cvi-ops-02-entrypoint-fixture",
  setup(ctx) {
    ctx.onResolve({ filter: /.*/ }, args =>
      Object.prototype.hasOwnProperty.call(mocks, args.path)
        ? ({ path: args.path, namespace: "cvi-fixture" })
        : undefined);
    ctx.onLoad({ filter: /.*/, namespace: "cvi-fixture" }, args =>
      ({ contents: mocks[args.path], loader: "js" }));
  },
};

test("repository production Docker image establishes NODE_ENV=production before startup", () => {
  const dockerfile = readFileSync(join(serverRoot, "..", "..", "..", "Dockerfile"), "utf8");
  const runtime = dockerfile.slice(dockerfile.indexOf(" AS runtime"));
  assert.match(runtime, /ENV NODE_ENV=production/);
  assert.ok(runtime.includes('CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]'));
});

test("actual entrypoint: production DB-absence fails before mock app.listen, local test remains compatible", async () => {
  // Esbuild loads the actual index.ts and startup gate; only side-effectful imports are mocked.
  // The emitted bundle is run in separate OS processes. No socket or DB client is instantiated.
  const built = await build({
    entryPoints: [join(serverRoot, "index.ts")],
    bundle: true, platform: "node", format: "esm", target: "node20",
    write: false, plugins: [mockPlugin], logLevel: "silent",
  });
  assert.equal(built.outputFiles.length, 1);
  const script = built.outputFiles[0].text;
  for (const fixture of [
    { name: "prod-missing", env: {NODE_ENV:"production"}, listen:false },
    { name: "prod-blank", env: {NODE_ENV:"production",DATABASE_URL:"   "}, listen:false },
    { name: "railway-staging", env: {NODE_ENV:"development",RAILWAY_ENVIRONMENT_NAME:"staging"}, listen:false },
    { name: "local-dev", env: {NODE_ENV:"development"}, listen:true },
    { name: "local-test", env: {NODE_ENV:"test"}, listen:true },
    { name: "identity-blocked", env: {NODE_ENV:"production", DATABASE_URL:"mock://nonlive"}, listen:false },
  ] as const) {
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      cwd: serverRoot, encoding: "utf8", timeout: 10000,
      env: { PATH: process.env.PATH, PORT:"49999", NODE_OPTIONS:"", ...fixture.env },
    });
    assert.equal(child.error, undefined, fixture.name + ": " + child.error?.message);
    assert.equal(child.stdout.includes("MOCK_APP_LISTEN"), fixture.listen,
      fixture.name + " stdout=" + child.stdout + " stderr=" + child.stderr);
    if (fixture.listen) assert.equal(child.status, 0, fixture.name + ": " + child.stderr);
    else assert.notEqual(child.status, 0, fixture.name + ": expected startup rejection");
  }
});

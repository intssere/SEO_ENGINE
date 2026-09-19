import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);

test("Railway container uses reproducible builds and a single production process", async () => {
  const dockerfile = await readFile(new URL("Dockerfile", root), "utf8");
  assert.match(dockerfile, /^FROM node:24\.19\.0-bookworm-slim AS build$/m);
  assert.match(dockerfile, /pnpm install --frozen-lockfile/);
  assert.match(dockerfile, /@workspace\/api-server run build:production/);
  assert.match(dockerfile, /@workspace\/seo-engine run build/);
  assert.match(
    dockerfile,
    /CMD \["node", "--enable-source-maps", "artifacts\/api-server\/dist\/index\.mjs"\]/,
  );
  assert.doesNotMatch(dockerfile, /db:(?:push|bootstrap)|drizzle|migrat/i);
});

test("CI enforces the same pinned package manager and frozen lockfile", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/ci.yml", root),
    "utf8",
  );
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", root), "utf8"),
  ) as { packageManager?: string };
  assert.equal(packageJson.packageManager, "pnpm@10.34.5");
  assert.match(workflow, /version: 10\.34\.5/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.doesNotMatch(workflow, /pnpm install --no-frozen-lockfile/);
});

test("startup keeps legacy queue resume behind the explicit default-off gate", async () => {
  const source = await readFile(
    new URL("artifacts/api-server/src/index.ts", root),
    "utf8",
  );
  assert.match(source, /startup\.pilotQueueResumeEnabled/);
  assert.match(
    source,
    /if \(identity\.status !== "ready"\) \{\s*throw new Error\(/s,
  );
  assert.doesNotMatch(
    source,
    /if \(process\.env\.DATABASE_URL\?\.trim\(\)\) \{\s*void import\("\.\/lib\/pilot-orchestration"\)/s,
  );
});

test("disabled AI proposal generation does not require provider credentials at boot", async () => {
  const source = await readFile(
    new URL("artifacts/api-server/src/lib/ai-proposal-runtime.ts", root),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /^import \{ openai \} from "@workspace\/integrations-openai-ai-server";/m,
  );
  assert.match(
    source,
    /generateText: async \(prompt\) => \{\s*const \{ openai \} =\s*await import\(/s,
  );
});

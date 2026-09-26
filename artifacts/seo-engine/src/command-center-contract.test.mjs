import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const dashboard = read("pages/dashboard.tsx");
const model = read("lib/command-center-model.ts");

test("Command Center remains the root dashboard route implementation", () => {
  assert.ok(dashboard.includes("export default function DashboardPage"));
  assert.ok(dashboard.includes("COMMAND CENTER"));
  assert.ok(dashboard.includes("SEO operations overview"));
});

test("Command Center is read-only and cannot start the baseline pilot", () => {
  const source = [dashboard, model].join("\n");
  assert.doesNotMatch(source, /getPilotAuthorization/);
  assert.doesNotMatch(source, /startPilotRun/);
  assert.doesNotMatch(source, /useMutation/);
  assert.doesNotMatch(source, /useDecideApproval|useExecute|useDeploy/);
  assert.doesNotMatch(source, /Run Baseline|Refresh Data/);
});

test("Command Center interactions are GET filters or route navigation", () => {
  assert.ok(dashboard.includes("useGetDashboard"));
  assert.ok(dashboard.includes("updateParam"));
  assert.ok(dashboard.includes('href="/connections"'));
  assert.ok(dashboard.includes('href="/technical-seo"'));
  assert.ok(dashboard.includes('href="/opportunities"'));
  assert.ok(dashboard.includes('href="/deployments"'));
  assert.ok(dashboard.includes('href="/impact"'));
});

test("bounded certification and empty intelligence states stay explicit", () => {
  assert.ok(model.includes('"Bounded coverage only"'));
  assert.ok(model.includes('"No persisted signals"'));
  assert.ok(model.includes('"Data unavailable"'));
  assert.ok(model.includes('"Live data may be stale"'));
  assert.ok(dashboard.includes("Bounded limit"));
  assert.ok(dashboard.includes("AI visibility observations unavailable"));
});

test("P4.5 introduces no direct network, database, or runtime execution primitives", () => {
  const source = [dashboard, model].join("\n");
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /postgres|drizzle|DATABASE_URL|process\.env/);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED/);
});

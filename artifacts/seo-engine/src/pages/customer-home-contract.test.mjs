import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "customer-home.tsx"), "utf8");

test("customer homepage does not import operator dashboard endpoints or show operator-derived site details", () => {
  assert.doesNotMatch(source, /useGetDashboard|api-client-react|data\.siteName|data\.domain/);
  assert.match(source, /membership authorization and verified evidence/);
  assert.match(source, /No metrics are inferred from the operator dashboard/);
});

test("read-only preview has an explicit unverified status and setup path", () => {
  assert.match(source, /Verification pending/);
  assert.match(source, /Customer data is not yet enabled/);
  assert.match(source, /href="\/onboarding"/);
  assert.match(source, /href="\/connections"/);
});

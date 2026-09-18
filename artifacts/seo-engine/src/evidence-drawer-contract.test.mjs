import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const drawer = read("components/evidence-drawer.tsx");
const proposalTable = read("components/proposal-table.tsx");
const opportunities = read("pages/opportunities.tsx");
const model = read("lib/evidence-drawer-model.ts");

test("P4.4 evidence drawer uses the existing accessible Sheet primitive", () => {
  assert.ok(drawer.includes('from "./ui/sheet"'));
  assert.ok(drawer.includes("<Sheet>"));
  assert.ok(drawer.includes("<SheetTrigger asChild>"));
  assert.ok(drawer.includes("<SheetTitle>"));
  assert.ok(drawer.includes("<SheetDescription>"));
  assert.ok(drawer.includes('type="button"'));
});

test("proposal and opportunity evidence surfaces use the shared drawer", () => {
  assert.ok(
    proposalTable.includes('import { ProposalEvidenceDrawer } from "./evidence-drawer";'),
  );
  assert.ok(proposalTable.includes("<ProposalEvidenceDrawer"));
  assert.ok(
    opportunities.includes(
      'import { OpportunityEvidenceDrawer } from "../components/evidence-drawer";',
    ),
  );
  assert.ok(opportunities.includes("<OpportunityEvidenceDrawer"));
});

test("detailed P3 states are explicitly unavailable rather than inferred", () => {
  for (const key of [
    '"freshness"',
    '"support"',
    '"retention_history"',
    '"conflict"',
    '"corroboration"',
  ]) {
    assert.ok(model.includes(key));
  }
  assert.ok(model.includes('"unavailable"'));
  assert.ok(model.includes("not exposed by the current frontend API contract"));
});

test("drawer stays presentation-only with no data-fetching or mutation primitives", () => {
  const source = [drawer, model].join("\n");
  assert.doesNotMatch(source, /useQuery|useMutation|fetch\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /useDecideApproval|useEditApproval|useExecute|useDeploy/);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED/);
});

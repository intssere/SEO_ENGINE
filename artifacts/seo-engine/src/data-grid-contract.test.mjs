import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const operational = read("components/operational-table.tsx");
const grid = read("components/data-grid.tsx");
const workbench = read("components/data-workbench.tsx");

test("OperationalTable delegates rendering to the shared P4.3 DataGrid", () => {
  assert.match(operational, /import \\{ DataGrid, type DataGridColumn \\} from "\\.\\/data-grid"/);
  assert.match(operational, /<DataGrid/);
  assert.doesNotMatch(operational, /<table\\b/);
});

test("DataGrid exposes accessible search, sort state, and pagination controls", () => {
  assert.match(grid, /type="search"/);
  assert.match(grid, /aria-sort=\\{ariaSort\\}/);
  assert.match(grid, /aria-label=\\{`Sort by \\$\\{column\\.header\\}`\\}/);
  assert.match(grid, /aria-label="Rows per page"/);
  assert.match(grid, /aria-label="Table pagination"/);
  assert.match(grid, />Previous</);
  assert.match(grid, />Next</);
});

test("DataGrid consumes the reusable DataWorkbench shell", () => {
  assert.match(grid, /import \\{ DataWorkbench \\} from "\\.\\/data-workbench"/);
  assert.match(grid, /<DataWorkbench/);
  assert.match(workbench, /className="dataWorkbenchToolbar"/);
  assert.match(workbench, /className="dataWorkbenchFooter"/);
});

test("P4.3 grid primitives remain read-only and contain no bulk execution semantics", () => {
  const source = [grid, workbench, read("lib/data-grid-model.ts")].join("\\n");
  assert.doesNotMatch(source, /type=["\']checkbox["\']/i);
  assert.doesNotMatch(source, /selectedRows?/i);
  assert.doesNotMatch(source, /bulk(?:Action|Approve|Execute|Deploy)/i);
  assert.doesNotMatch(source, /execute(?:Action|Mutation|Deployment)/i);
});

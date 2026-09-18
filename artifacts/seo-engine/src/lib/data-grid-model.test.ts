import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDataGridModel,
  compareDataGridValues,
  nextDataGridSort,
  normalizeDataGridPageSize,
} from "./data-grid-model";

type Row = {
  id: string;
  name: string;
  score: number | null;
  status: string;
};

const rows: Row[] = [
  { id: "a", name: "Beta 10", score: 2, status: "ready" },
  { id: "b", name: "alpha 2", score: 2, status: "blocked" },
  { id: "c", name: "Gamma", score: null, status: "ready" },
  { id: "d", name: "Alpha 11", score: 9, status: "pending" },
];

const columns = [
  { id: "name", getValue: (row: Row) => row.name },
  { id: "score", getValue: (row: Row) => row.score },
  { id: "status", getValue: (row: Row) => row.status },
];

test("search is trimmed, case-insensitive, scalar-only, and does not mutate input", () => {
  const snapshot = structuredClone(rows);
  const model = buildDataGridModel(rows, columns, { search: "  READY  " });

  assert.deepEqual(model.rows.map((row) => row.id), ["a", "c"]);
  assert.equal(model.filteredRows, 2);
  assert.equal(model.totalRows, 4);
  assert.deepEqual(rows, snapshot);
});

test("sorting is stable and uses natural string ordering", () => {
  const byName = buildDataGridModel(rows, columns, {
    sort: { columnId: "name", direction: "asc" },
  });
  assert.deepEqual(byName.rows.map((row) => row.id), ["b", "d", "a", "c"]);

  const byScore = buildDataGridModel(rows, columns, {
    sort: { columnId: "score", direction: "asc" },
  });
  assert.deepEqual(byScore.rows.map((row) => row.id), ["a", "b", "d", "c"]);
});

test("missing values sort last in both directions", () => {
  assert.equal(compareDataGridValues(null, 5, "asc"), 1);
  assert.equal(compareDataGridValues(null, 5, "desc"), 1);
  assert.equal(compareDataGridValues(5, null, "desc"), -1);

  const model = buildDataGridModel(rows, columns, {
    sort: { columnId: "score", direction: "desc" },
  });
  assert.deepEqual(model.rows.map((row) => row.id), ["d", "a", "b", "c"]);
});

test("sort interaction cycles none to ascending to descending to none", () => {
  const ascending = nextDataGridSort(null, "score");
  assert.deepEqual(ascending, { columnId: "score", direction: "asc" });

  const descending = nextDataGridSort(ascending, "score");
  assert.deepEqual(descending, { columnId: "score", direction: "desc" });

  assert.equal(nextDataGridSort(descending, "score"), null);
  assert.deepEqual(nextDataGridSort(descending, "name"), {
    columnId: "name",
    direction: "asc",
  });
});

test("page sizes are bounded to the supported enterprise options", () => {
  assert.equal(normalizeDataGridPageSize(10), 10);
  assert.equal(normalizeDataGridPageSize(25), 25);
  assert.equal(normalizeDataGridPageSize(50), 50);
  assert.equal(normalizeDataGridPageSize(100), 100);
  assert.equal(normalizeDataGridPageSize(7), 25);
  assert.equal(normalizeDataGridPageSize(undefined), 25);
});

test("page requests clamp deterministically after filtering", () => {
  const data = Array.from({ length: 31 }, (_, index) => ({
    id: String(index + 1),
    name: index < 6 ? `match-${index}` : `other-${index}`,
  }));
  const queryColumns = [
    { id: "name", getValue: (row: (typeof data)[number]) => row.name },
  ];

  const model = buildDataGridModel(data, queryColumns, {
    search: "match",
    page: 9,
    pageSize: 10,
  });

  assert.equal(model.filteredRows, 6);
  assert.equal(model.pageCount, 1);
  assert.equal(model.page, 1);
  assert.equal(model.rangeStart, 1);
  assert.equal(model.rangeEnd, 6);
});

test("unknown or explicitly unsortable columns fail closed to source order", () => {
  const unsortable = [
    { id: "name", getValue: (row: Row) => row.name, sortable: false },
  ];

  assert.deepEqual(
    buildDataGridModel(rows, unsortable, {
      sort: { columnId: "name", direction: "asc" },
    }).rows.map((row) => row.id),
    ["a", "b", "c", "d"],
  );
  assert.equal(
    buildDataGridModel(rows, columns, {
      sort: { columnId: "missing", direction: "asc" },
    }).sort,
    null,
  );
});

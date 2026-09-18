export const DATA_GRID_PAGE_SIZES = [10, 25, 50, 100] as const;

export type DataGridSortDirection = "asc" | "desc";

export type DataGridSort = {
  columnId: string;
  direction: DataGridSortDirection;
} | null;

export type DataGridModelColumn<T> = {
  id: string;
  getValue: (row: T) => unknown;
  searchable?: boolean;
  sortable?: boolean;
};

export type DataGridQuery = {
  search?: string;
  sort?: DataGridSort;
  page?: number;
  pageSize?: number;
};

export type DataGridModel<T> = {
  rows: T[];
  sourceIndexes: number[];
  totalRows: number;
  filteredRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  search: string;
  sort: DataGridSort;
};

function normalizedSearch(value: string | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function isMissing(value: unknown) {
  return value === null || value === undefined || value === "";
}

function searchableValue(value: unknown) {
  if (isMissing(value)) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value).toLocaleLowerCase();
  }
  if (value instanceof Date && Number.isFinite(value.valueOf())) {
    return value.toISOString().toLocaleLowerCase();
  }
  return "";
}

function comparePresentValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left === right ? 0 : left < right ? -1 : 1;
  }

  if (typeof left === "bigint" && typeof right === "bigint") {
    return left === right ? 0 : left < right ? -1 : 1;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return left === right ? 0 : left ? 1 : -1;
  }

  if (left instanceof Date && right instanceof Date) {
    const leftTime = left.valueOf();
    const rightTime = right.valueOf();
    return leftTime === rightTime ? 0 : leftTime < rightTime ? -1 : 1;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function compareDataGridValues(
  left: unknown,
  right: unknown,
  direction: DataGridSortDirection,
) {
  const leftMissing = isMissing(left);
  const rightMissing = isMissing(right);

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }

  const comparison = comparePresentValues(left, right);
  return direction === "asc" ? comparison : -comparison;
}

export function normalizeDataGridPageSize(value: number | undefined) {
  return DATA_GRID_PAGE_SIZES.includes(value as (typeof DATA_GRID_PAGE_SIZES)[number])
    ? value!
    : 25;
}

export function nextDataGridSort(
  current: DataGridSort,
  columnId: string,
): DataGridSort {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}

export function buildDataGridModel<T>(
  data: readonly T[],
  columns: readonly DataGridModelColumn<T>[],
  query: DataGridQuery = {},
): DataGridModel<T> {
  const totalRows = data.length;
  const search = normalizedSearch(query.search);
  const searchableColumns = columns.filter((column) => column.searchable !== false);

  const filteredEntries = data
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => {
      if (!search) return true;
      return searchableColumns.some((column) =>
        searchableValue(column.getValue(row)).includes(search),
      );
    });

  const requestedSort = query.sort ?? null;
  const sortColumn = requestedSort
    ? columns.find(
        (column) =>
          column.id === requestedSort.columnId && column.sortable !== false,
      )
    : undefined;

  const sortedEntries = sortColumn && requestedSort
    ? [...filteredEntries].sort((left, right) => {
        const comparison = compareDataGridValues(
          sortColumn.getValue(left.row),
          sortColumn.getValue(right.row),
          requestedSort.direction,
        );
        return comparison || left.sourceIndex - right.sourceIndex;
      })
    : filteredEntries;

  const filteredRows = sortedEntries.length;
  const pageSize = normalizeDataGridPageSize(query.pageSize);
  const pageCount = Math.max(1, Math.ceil(filteredRows / pageSize));
  const requestedPage = Number.isFinite(query.page)
    ? Math.trunc(query.page!)
    : 1;
  const page = Math.min(pageCount, Math.max(1, requestedPage));
  const startIndex = (page - 1) * pageSize;
  const pageEntries = sortedEntries.slice(startIndex, startIndex + pageSize);
  const rows = pageEntries.map(({ row }) => row);
  const sourceIndexes = pageEntries.map(({ sourceIndex }) => sourceIndex);

  return {
    rows,
    sourceIndexes,
    totalRows,
    filteredRows,
    page,
    pageSize,
    pageCount,
    rangeStart: filteredRows === 0 ? 0 : startIndex + 1,
    rangeEnd: filteredRows === 0 ? 0 : Math.min(startIndex + pageSize, filteredRows),
    search,
    sort: sortColumn ? requestedSort : null,
  };
}

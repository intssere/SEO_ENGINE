import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DataWorkbench } from "./data-workbench";
import {
  buildDataGridModel,
  DATA_GRID_PAGE_SIZES,
  nextDataGridSort,
  normalizeDataGridPageSize,
  type DataGridModelColumn,
  type DataGridSort,
} from "@/lib/data-grid-model";

export interface DataGridColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T | string;
  getValue?: (row: T) => unknown;
  cell?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  searchable?: boolean;
}

export interface DataGridProps<T> {
  data: readonly T[];
  columns: readonly DataGridColumn<T>[];
  getRowId: (row: T, sourceIndex: number) => string;
  label?: string;
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  searchPlaceholder?: string;
  initialPageSize?: number;
}

function readColumnValue<T>(column: DataGridColumn<T>, row: T) {
  if (column.getValue) return column.getValue(row);
  if (column.accessorKey) {
    return (row as Record<string, unknown>)[String(column.accessorKey)];
  }
  return undefined;
}

function renderCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DataGrid<T>({
  data,
  columns,
  getRowId,
  label = "Operational data",
  emptyMessage = "No data available.",
  filteredEmptyMessage = "No rows match the current search.",
  searchPlaceholder = "Search rows",
  initialPageSize = 25,
}: DataGridProps<T>) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DataGridSort>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    normalizeDataGridPageSize(initialPageSize),
  );

  const modelColumns = useMemo<DataGridModelColumn<T>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        getValue: (row) => readColumnValue(column, row),
        searchable: column.searchable,
        sortable: column.sortable,
      })),
    [columns],
  );

  const model = useMemo(
    () =>
      buildDataGridModel(data, modelColumns, {
        search,
        sort,
        page,
        pageSize,
      }),
    [data, modelColumns, page, pageSize, search, sort],
  );

  useEffect(() => {
    if (page !== model.page) setPage(model.page);
  }, [model.page, page]);

  const hasSearch = search.trim().length > 0;
  const resultMeta = hasSearch
    ? `${model.filteredRows} matching of ${model.totalRows} rows`
    : `${model.totalRows} rows`;

  const controls = (
    <>
      <label className="dataGridSearchLabel" htmlFor={searchId}>
        Search
      </label>
      <input
        id={searchId}
        className="dataGridSearch"
        type="search"
        value={search}
        placeholder={searchPlaceholder}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <label className="dataGridPageSizeLabel">
        Rows
        <select
          className="dataGridPageSize"
          value={pageSize}
          aria-label="Rows per page"
          onChange={(event) => {
            setPageSize(normalizeDataGridPageSize(Number(event.target.value)));
            setPage(1);
          }}
        >
          {DATA_GRID_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  const footer = (
    <>
      <span className="dataGridRange" aria-live="polite">
        {model.filteredRows === 0
          ? "0 rows"
          : `${model.rangeStart}–${model.rangeEnd} of ${model.filteredRows}`}
      </span>
      <div className="dataGridPagination" aria-label="Table pagination">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, model.page - 1))}
          disabled={model.page <= 1}
        >
          Previous
        </button>
        <span>
          Page {model.page} of {model.pageCount}
        </span>
        <button
          type="button"
          onClick={() => setPage(Math.min(model.pageCount, model.page + 1))}
          disabled={model.page >= model.pageCount}
        >
          Next
        </button>
      </div>
    </>
  );

  return (
    <DataWorkbench
      label={`${label} workbench`}
      controls={controls}
      meta={resultMeta}
      footer={footer}
    >
      <div className="tableWrap dataGridWrap">
        <table aria-label={label}>
          <thead>
            <tr>
              {columns.map((column) => {
                const activeSort =
                  model.sort?.columnId === column.id ? model.sort.direction : null;
                const sortable = column.sortable !== false;
                const ariaSort = !sortable
                  ? undefined
                  : activeSort === "asc"
                    ? "ascending"
                    : activeSort === "desc"
                      ? "descending"
                      : "none";

                return (
                  <th key={column.id} aria-sort={ariaSort}>
                    {sortable ? (
                      <button
                        type="button"
                        className="dataGridSortButton"
                        onClick={() => {
                          setSort((current) => nextDataGridSort(current, column.id));
                          setPage(1);
                        }}
                        aria-label={`Sort by ${column.header}`}
                      >
                        <span>{column.header}</span>
                        <span aria-hidden="true" className="dataGridSortIndicator">
                          {activeSort === "asc"
                            ? "↑"
                            : activeSort === "desc"
                              ? "↓"
                              : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {model.rows.length > 0 ? (
              model.rows.map((row, pageIndex) => {
                const sourceIndex = model.sourceIndexes[pageIndex];
                return (
                  <tr key={getRowId(row, sourceIndex)}>
                    {columns.map((column) => {
                      const value = readColumnValue(column, row);
                      return (
                        <td key={column.id}>
                          {column.cell
                            ? column.cell(value, row)
                            : renderCellValue(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="emptyCell">
                  {data.length === 0 ? emptyMessage : filteredEmptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataWorkbench>
  );
}

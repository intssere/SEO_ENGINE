import { type ReactNode } from "react";
import { StatusBadge } from "./status-badge";
import { readinessTone } from "@/lib/status-grammar";
import { DataGrid, type DataGridColumn } from "./data-grid";

export interface Column {
  header: string;
  accessorKey: string;
  cell?: (value: any, row: any) => ReactNode;
  sortable?: boolean;
  searchable?: boolean;
}

interface OperationalTableProps {
  data: any[];
  columns?: Column[];
  emptyMessage?: string;
  label?: string;
  searchPlaceholder?: string;
  rowKey?: (row: any, sourceIndex: number) => string;
}

function defaultOperationalRowKey(row: any, sourceIndex: number) {
  const candidates = [
    "id",
    "action_id",
    "deployment_id",
    "observation_id",
    "evidence_id",
    "url",
    "path",
    "query",
    "title",
  ];

  for (const key of candidates) {
    const value = row?.[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint"
    ) {
      return `${key}:${String(value)}:${sourceIndex}`;
    }
  }

  return `row:${sourceIndex}`;
}

export function OperationalTable({
  data,
  columns,
  emptyMessage = "No data available.",
  label = "Operational data",
  searchPlaceholder = "Search rows",
  rowKey = defaultOperationalRowKey,
}: OperationalTableProps) {
  const cols = columns || (
    data.length > 0
      ? Object.keys(data[0]).map((key) => ({
          header: key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (value) => value.toUpperCase()),
          accessorKey: key,
          cell: (value: any) => {
            if (typeof value === "boolean") return value ? "Yes" : "No";
            if (value === null || value === undefined) return "—";
            if (typeof value === "object") return JSON.stringify(value);
            return String(value);
          },
        }))
      : []
  );

  const gridColumns: DataGridColumn<any>[] = cols.map((column, index) => ({
    id: `${column.accessorKey}:${index}`,
    header: column.header,
    accessorKey: column.accessorKey,
    cell: column.cell
      ? (value, row) => column.cell!(value, row)
      : undefined,
    sortable: column.sortable,
    searchable: column.searchable,
  }));

  return (
    <DataGrid
      data={data}
      columns={gridColumns}
      getRowId={rowKey}
      label={label}
      emptyMessage={emptyMessage}
      searchPlaceholder={searchPlaceholder}
    />
  );
}

export function PageHeader({ 
  eyebrow, 
  title, 
  description,
  readiness 
}: { 
  eyebrow: string; 
  title: string; 
  description: string;
  readiness?: any;
}) {
  const isReady = readiness?.state === "live";
  const reason = readiness?.message as string;

  return (
    <div className="titleRow">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {readiness && (
        <div className="flex items-center gap-2">
          <StatusBadge tone={readinessTone(isReady ? "live" : "setup_required")}>
            {isReady ? "SYSTEM READY" : "SETUP REQUIRED"}
          </StatusBadge>
          {!isReady && reason && (
            <span className="text-sm text-[var(--status-warning-fg)] font-medium px-2 py-1 bg-[var(--status-warning-bg)] rounded">
              {reason}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

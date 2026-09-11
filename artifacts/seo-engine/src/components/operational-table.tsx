import { ReactNode } from "react";
import { Badge } from "../components/layout";

export interface Column {
  header: string;
  accessorKey: string;
  cell?: (value: any, row: any) => ReactNode;
}

interface OperationalTableProps {
  data: any[];
  columns?: Column[];
  emptyMessage?: string;
}

export function OperationalTable({ data, columns, emptyMessage = "No data available." }: OperationalTableProps) {
  // Auto-generate columns from the first row if not provided
  const cols = columns || (data.length > 0 ? Object.keys(data[0]).map(key => ({
    header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    accessorKey: key,
    cell: (val: any) => {
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (val === null || val === undefined) return '-';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }
  })) : []);

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, i) => (
              <tr key={i}>
                {cols.map((col) => (
                  <td key={col.header}>
                    {col.cell ? col.cell(row[col.accessorKey], row) : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols.length || 1} className="emptyCell">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
          <Badge tone={isReady ? "verified" : "approval"}>
            {isReady ? "SYSTEM READY" : "SETUP REQUIRED"}
          </Badge>
          {!isReady && reason && (
            <span className="text-sm text-[#8d5c0d] font-medium px-2 py-1 bg-[#fff3dc] rounded">
              {reason}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

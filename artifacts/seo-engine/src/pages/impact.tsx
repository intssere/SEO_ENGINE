import { useListDeployments } from "@workspace/api-client-react";
import { AlertCircle, Loader2 } from "lucide-react";
import { OperationalTable, PageHeader, type Column } from "../components/operational-table";

const asRecord = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const isNumeric = (value: unknown) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const formatNumber = (value: unknown) => isNumeric(value) ? Number(value).toLocaleString() : "-";
const formatPercent = (value: unknown) => isNumeric(value) ? `${(Number(value) * 100).toFixed(1)}%` : "-";
const formatDate = (value: unknown) => typeof value === "string" && value ? value.slice(0, 10) : "-";

const columns: Column[] = [
  { header: "Page", accessorKey: "url", cell: (value) => typeof value === "string" ? value.replace("https://diamondshelf.us", "") || "/" : "-" },
  { header: "Deployed", accessorKey: "deployed_at", cell: formatDate },
  { header: "State", accessorKey: "measurementState" },
  { header: "Confidence", accessorKey: "confidence" },
  { header: "Pre clicks", accessorKey: "baselineWindow", cell: (value) => formatNumber(asRecord(value).clicks) },
  { header: "Post clicks", accessorKey: "comparisonWindow", cell: (value) => formatNumber(asRecord(value).clicks) },
  { header: "Clicks Δ", accessorKey: "deltas", cell: (value) => formatPercent(asRecord(value).clicksPct) },
  { header: "Impressions Δ", accessorKey: "deltas", cell: (value) => formatPercent(asRecord(value).impressionsPct) },
  { header: "CTR Δ", accessorKey: "deltas", cell: (value) => formatPercent(asRecord(value).ctrPct) },
  { header: "Position Δ", accessorKey: "deltas", cell: (value) => {
    const delta = asRecord(value).averagePosition;
    return isNumeric(delta) ? Number(delta).toFixed(2) : "-";
  } },
  { header: "Recommendation", accessorKey: "recommendation" },
  { header: "Blockers", accessorKey: "eligibilityBlockers", cell: (value) => Array.isArray(value) && value.length ? value.join(", ") : "-" },
];

export default function ImpactPage() {
  const { data, isLoading, isError } = useListDeployments();
  const rows = (data?.rows ?? []) as Array<Record<string, unknown>>;
  const eligible = rows.filter((row) => row.measurementEligible === true).length;
  const ready = rows.filter((row) => row.measurementState === "ready").length;
  const pending = rows.filter((row) => row.recommendation === "measurement_pending").length;

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Organic Outcomes</strong>
          <span className="muted"> Measurement & Attribution</span>
        </div>
      </header>

      <div className="content">
        <PageHeader
          eyebrow="OUTCOMES"
          title="Measurement & Attribution"
          description="Read-only observational pre/post measurement for verified deployments. Recommendations are advisory and do not prove causality or authorize execution."
          readiness={data?.readiness}
        />

        <section className="card mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 text-sm">
            <div><span className="muted">Measurement eligible</span><div className="text-lg font-semibold">{eligible}</div></div>
            <div><span className="muted">Ready after cooldown</span><div className="text-lg font-semibold">{ready}</div></div>
            <div><span className="muted">Pending evidence/window</span><div className="text-lg font-semibold">{pending}</div></div>
          </div>
        </section>

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading measurement evidence...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load measurement data.</p>
            </div>
          ) : (
            <OperationalTable
              data={rows}
              columns={columns}
              emptyMessage="No deployment history is available for measurement yet."
            />
          )}
        </section>
      </div>
    </>
  );
}

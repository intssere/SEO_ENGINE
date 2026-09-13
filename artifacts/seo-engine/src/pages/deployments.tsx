import { useListDeployments } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { OperationalTable, PageHeader, type Column } from "../components/operational-table";

const columns: Column[] = [
  { header: "Provider", accessorKey: "provider" },
  { header: "Status", accessorKey: "status" },
  { header: "Deployed", accessorKey: "deployed_at", cell: (value) => typeof value === "string" ? value.slice(0, 19).replace("T", " ") : "-" },
  { header: "Verification", accessorKey: "verification_status" },
  { header: "Lifecycle", accessorKey: "lifecycle" },
  { header: "Plan control", accessorKey: "planControlRisk" },
  { header: "Effective risk", accessorKey: "effectiveExecutionRisk" },
  { header: "Page", accessorKey: "url", cell: (value) => typeof value === "string" ? value.replace("https://diamondshelf.us", "") || "/" : "-" },
  { header: "Field", accessorKey: "field" },
];

export default function DeploymentsPage() {
  const { data, isLoading, isError } = useListDeployments();

  return (
    <>
      <header className="topbar">
        <div>
          <strong>System Traceability</strong>
          <span className="muted"> Deployments</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="EXECUTED" 
          title="Deployments" 
          description="A verifiable ledger of all changes shipped to production. Measurement diagnostics remain read-only and are summarized separately under Impact."
          readiness={data?.readiness}
        />

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading deployments...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load deployments.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              columns={columns}
              emptyMessage="No completed deployments recorded yet." 
            />
          )}
        </section>
      </div>
    </>
  );
}

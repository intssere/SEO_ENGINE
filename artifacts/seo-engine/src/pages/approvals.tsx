import { useListApprovals } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";

export default function ApprovalsPage() {
  const { data, isLoading, isError } = useListApprovals();

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Guarded Autonomy</strong>
          <span className="muted"> Approvals</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="REQUIRED" 
          title="Approvals" 
          description="High-risk or policy-flagged actions requiring human authorization before deployment."
          readiness={data?.readiness}
        />

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading approvals...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load approvals.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              emptyMessage="No pending approvals. System operating autonomously within safety bounds." 
            />
          )}
        </section>
      </div>
    </>
  );
}

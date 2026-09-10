import { useListOpportunities } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useListOpportunities();

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Decision Queue</strong>
          <span className="muted"> Opportunities</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="QUEUED" 
          title="Opportunities" 
          description="System-identified opportunities awaiting action generation or approval."
          readiness={data?.readiness}
        />

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading opportunities...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load opportunities. Ensure the API server is running.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              emptyMessage="No opportunities currently identified." 
            />
          )}
        </section>
      </div>
    </>
  );
}

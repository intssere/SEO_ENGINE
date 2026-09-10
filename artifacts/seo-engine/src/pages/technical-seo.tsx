import { useListTechnicalFindings } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";

export default function TechnicalSeoPage() {
  const { data, isLoading, isError } = useListTechnicalFindings();

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Site Health</strong>
          <span className="muted"> Technical SEO</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="AUDIT" 
          title="Technical Findings" 
          description="Ongoing technical infrastructure observations and system health assertions."
          readiness={data?.readiness}
        />

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading technical findings...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load technical findings.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              emptyMessage="No technical issues flagged." 
            />
          )}
        </section>
      </div>
    </>
  );
}

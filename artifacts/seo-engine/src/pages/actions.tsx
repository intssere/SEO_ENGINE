import { useListActions } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";

export default function ActionsPage() {
  const { data, isLoading, isError } = useListActions();

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Operational Workflow</strong>
          <span className="muted"> Actions</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="PREPARED" 
          title="Actions" 
          description="Concrete SEO changes generated from opportunities, ready for execution."
          readiness={data?.readiness}
        />

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading actions...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load actions.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              emptyMessage="No actions prepared at this time." 
            />
          )}
        </section>
      </div>
    </>
  );
}

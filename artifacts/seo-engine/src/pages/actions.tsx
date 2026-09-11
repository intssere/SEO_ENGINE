import { useListActions } from "@workspace/api-client-react";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { proposalColumns } from "../components/proposal-table";
import { Badge } from "../components/layout";

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
          eyebrow="DRY-RUN PLANNER"
          title="Proposed changes"
          description="Concrete evidence-backed proposals for review. Nothing is approved, executable, or written to the public site."
          readiness={data?.readiness}
        />

        <section className="card opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">PERSISTED PROPOSALS</p>
              <h2>Action planner</h2>
              <p className="muted">Before/after values, supporting evidence, expected benefit, and deterministic reversion instructions are shown for every proposal.</p>
            </div>
            <Badge tone="verified"><ShieldCheck className="w-3 h-3 mr-1 inline" /> READ-ONLY</Badge>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading dry-run proposals...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load dry-run proposals.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows}
              columns={proposalColumns}
              emptyMessage="No dry-run proposals have been generated from current evidence."
            />
          )}
        </section>
      </div>
    </>
  );
}

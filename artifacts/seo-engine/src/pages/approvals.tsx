import { useListApprovals } from "@workspace/api-client-react";
import { Loader2, AlertCircle, ClipboardCheck } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { proposalColumns } from "../components/proposal-table";
import { Badge } from "../components/layout";

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
          eyebrow="REVIEW QUEUE"
          title="Approval readiness"
          description="Evidence-complete dry-run proposals are ready for human review. This view does not approve, authorize, or execute anything."
          readiness={data?.readiness}
        />

        <section className="card opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">APPROVAL-READY ONLY</p>
              <h2>Review before future authorization</h2>
              <p className="muted">Every proposal remains blocked and dry-run only. Human review can inspect the proposed value, source evidence, risk, and rollback path.</p>
            </div>
            <Badge tone="approval"><ClipboardCheck className="w-3 h-3 mr-1 inline" /> NO AUTO-APPROVAL</Badge>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#77839a]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" />
              <p className="font-medium text-sm">Loading approval-ready proposals...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">Failed to load approval-ready proposals.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows}
              columns={proposalColumns}
              emptyMessage="No evidence-complete proposals are ready for review yet."
            />
          )}
        </section>
      </div>
    </>
  );
}

import { useListOpportunities, type OpportunityRecord } from "@workspace/api-client-react";
import { Loader2, AlertCircle, ShieldCheck, History } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { StatusBadge } from "../components/status-badge";
import { riskTone } from "@/lib/status-grammar";
import { OpportunityEvidenceDrawer } from "../components/evidence-drawer";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const activeColumns = [
  {
    header: "Opportunity",
    accessorKey: "title",
    cell: (value: string, row: OpportunityRecord) => (
      <div className="opportunityIdentity">
        <strong>{value}</strong>
        <span>{label(row.opportunity_type)}{row.query ? ` · ${row.query}` : ""}</span>
        {row.url && <small>{row.url}</small>}
      </div>
    ),
  },
  {
    header: "Priority",
    accessorKey: "score",
    cell: (value: number, row: OpportunityRecord) => (
      <div className="opportunityPriority">
        <strong>{value.toFixed(1)}</strong>
        <span>{(row.confidence * 100).toFixed(0)}% confidence</span>
      </div>
    ),
  },
  {
    header: "Why this",
    accessorKey: "evidence_count",
    cell: (value: number, row: OpportunityRecord) => (
      <div className="opportunityEvidence">
        <strong>{value} traceable refs</strong>
        <span>{row.why_qualifies}</span>
        <OpportunityEvidenceDrawer
          opportunity={row}
          triggerLabel="See evidence"
        />
      </div>
    ),
  },
  {
    header: "Risk",
    accessorKey: "risk_classification",
    cell: (value: string) => <StatusBadge tone={riskTone(value)}>{value.toUpperCase()}</StatusBadge>,
  },
  {
    header: "Plan",
    accessorKey: "recommendation",
    cell: (value: string, row: OpportunityRecord) => (
      <div className="opportunityPlan">
        <strong>NOT APPLIED</strong>
        <span>{value}</span>
      </div>
    ),
  },
];

const historyColumns = [
  { header: "Opportunity", accessorKey: "title", cell: (value: string, row: OpportunityRecord) => <div className="opportunityIdentity"><strong>{value}</strong><span>{label(row.opportunity_type)}</span>{row.url && <small>{row.url}</small>}</div> },
  { header: "Lifecycle", accessorKey: "lifecycle", cell: () => <StatusBadge tone="warning">SUPERSEDED</StatusBadge> },
  { header: "Final score", accessorKey: "score", cell: (value: number) => value.toFixed(1) },
  { header: "Reason", accessorKey: "rationale" },
  { header: "Updated", accessorKey: "updated_at", cell: (value: string) => new Date(value).toLocaleString() },
];

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useListOpportunities();

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Opportunities</strong>
          <span className="muted"> Prioritized improvements</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="PRIORITIZED" 
          title="Opportunities" 
          description="Prioritized improvements backed by current evidence. Open details only when you need them."
          readiness={data?.readiness}
        />

        <section className="card opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">RECOMMENDED</p>
              <h2>What to improve next</h2>
              <p className="muted">Only currently supported opportunities appear here.</p>
            </div>
            <StatusBadge tone="info"><ShieldCheck className="w-3 h-3 mr-1 inline" /> EVIDENCE-BACKED</StatusBadge>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#647087]" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" aria-hidden="true" />
              <p className="font-medium text-sm">Loading opportunities...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive" role="alert">
              <AlertCircle className="w-10 h-10 mb-4" aria-hidden="true" />
              <p className="font-medium">Failed to load opportunities. Ensure the API server is running.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              columns={activeColumns}
              emptyMessage="No opportunities currently meet the evidence and confidence guardrails."
            />
          )}
        </section>

        {!isLoading && !isError && data && (
          <section className="card opportunityHistory">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">AUDIT HISTORY</p>
                <h2><History className="w-4 h-4 inline mr-2" />Invalidated or superseded</h2>
                <p className="muted">Prior candidates remain traceable but are excluded from current opportunity counts and prioritization.</p>
              </div>
              <StatusBadge>{data.history.length} HISTORICAL</StatusBadge>
            </div>
            <OperationalTable data={data.history} columns={historyColumns} emptyMessage="No invalidated opportunity history yet." />
          </section>
        )}
      </div>
    </>
  );
}

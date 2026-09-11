import { useListOpportunities, type OpportunityRecord } from "@workspace/api-client-react";
import { Loader2, AlertCircle, ShieldCheck, History } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { Badge } from "../components/layout";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const riskTone = (risk: string) => risk === "high" ? "approval" : risk === "low" ? "verified" : "experiment";

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
    header: "Evidence",
    accessorKey: "evidence_count",
    cell: (value: number, row: OpportunityRecord) => (
      <div className="opportunityEvidence">
        <strong>{value} traceable refs</strong>
        <span>{row.why_qualifies}</span>
      </div>
    ),
  },
  {
    header: "Risk",
    accessorKey: "risk_classification",
    cell: (value: string) => <Badge tone={riskTone(value)}>{value.toUpperCase()}</Badge>,
  },
  {
    header: "Plan",
    accessorKey: "recommendation",
    cell: (value: string, row: OpportunityRecord) => (
      <div className="opportunityPlan">
        <strong>DRY RUN ONLY</strong>
        <span>{value}</span>
        <small>Execution authorized: {row.execution_authorized ? "yes" : "no"}</small>
      </div>
    ),
  },
];

const historyColumns = [
  { header: "Opportunity", accessorKey: "title", cell: (value: string, row: OpportunityRecord) => <div className="opportunityIdentity"><strong>{value}</strong><span>{label(row.opportunity_type)}</span></div> },
  { header: "Lifecycle", accessorKey: "lifecycle", cell: () => <Badge tone="approval">SUPERSEDED</Badge> },
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
          <strong>Decision Queue</strong>
          <span className="muted"> Opportunities</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="QUEUED" 
          title="Opportunities" 
          description="Evidence-backed candidates that currently satisfy guarded eligibility rules. Recommendations are dry-run only."
          readiness={data?.readiness}
        />

        <section className="card opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">CURRENTLY VALID</p>
              <h2>Active decision queue</h2>
              <p className="muted">Only candidates supported by the latest persisted baseline evidence appear here.</p>
            </div>
            <Badge tone="verified"><ShieldCheck className="w-3 h-3 mr-1 inline" /> READ-ONLY</Badge>
          </div>
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
              <Badge>{data.history.length} HISTORICAL</Badge>
            </div>
            <OperationalTable data={data.history} columns={historyColumns} emptyMessage="No invalidated opportunity history yet." />
          </section>
        )}
      </div>
    </>
  );
}

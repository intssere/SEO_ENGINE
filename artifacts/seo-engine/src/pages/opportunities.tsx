import { useListOpportunities, type OpportunityRecord } from "@workspace/api-client-react";
import { Loader2, AlertCircle, ShieldCheck, History } from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { StatusBadge } from "../components/status-badge";
import { OpportunityEvidenceDrawer } from "../components/evidence-drawer";
import { DecisionCard } from "../components/decision-card";
import { buildOpportunityDecisionCards } from "@/lib/decision-card-model";

const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const historyColumns = [
  {
    header: "Opportunity",
    accessorKey: "title",
    cell: (value: string, row: OpportunityRecord) => (
      <div className="opportunityIdentity">
        <strong>{value}</strong>
        <span>{label(row.opportunity_type)}</span>
        {row.url && <small>{row.url}</small>}
      </div>
    ),
  },
  {
    header: "Lifecycle",
    accessorKey: "lifecycle",
    cell: () => <StatusBadge tone="warning">SUPERSEDED</StatusBadge>,
  },
  {
    header: "Final score",
    accessorKey: "score",
    cell: (value: number) => value.toFixed(1),
  },
  { header: "Reason", accessorKey: "rationale" },
  {
    header: "Updated",
    accessorKey: "updated_at",
    cell: (value: string) => new Date(value).toLocaleString(),
  },
];

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useListOpportunities();
  const cards = data ? buildOpportunityDecisionCards(data.rows) : [];

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
          description="See the problem, impact, risk, recommendation, review state, and measurement state in one place."
          readiness={data?.readiness}
        />

        <section className="opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">RECOMMENDED</p>
              <h2>What to improve next</h2>
              <p className="muted">Evidence and technical details stay available on demand.</p>
            </div>
            <StatusBadge tone="info">
              <ShieldCheck className="w-3 h-3 mr-1 inline" /> EVIDENCE-BACKED
            </StatusBadge>
          </div>

          {isLoading ? (
            <div className="card flex flex-col items-center justify-center p-12 text-[#647087]" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" aria-hidden="true" />
              <p className="font-medium text-sm">Loading opportunities...</p>
            </div>
          ) : isError || !data ? (
            <div className="card flex flex-col items-center justify-center p-12 text-destructive" role="alert">
              <AlertCircle className="w-10 h-10 mb-4" aria-hidden="true" />
              <p className="font-medium">Failed to load opportunities.</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="card p-8 text-center text-[#647087]">
              No opportunities currently meet the evidence and confidence guardrails.
            </div>
          ) : (
            <div className="approvalReviewList">
              {cards.map((card, index) => (
                <DecisionCard
                  key={card.id}
                  model={card}
                  evidence={
                    <OpportunityEvidenceDrawer
                      opportunity={data.rows[index]}
                      triggerLabel="See evidence"
                    />
                  }
                />
              ))}
            </div>
          )}
        </section>

        {!isLoading && !isError && data && (
          <section className="card opportunityHistory">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">AUDIT HISTORY</p>
                <h2><History className="w-4 h-4 inline mr-2" />Invalidated or superseded</h2>
                <p className="muted">Historical candidates remain traceable but stay out of current prioritization.</p>
              </div>
              <StatusBadge>{data.history.length} HISTORICAL</StatusBadge>
            </div>
            <OperationalTable
              data={data.history}
              columns={historyColumns}
              emptyMessage="No invalidated opportunity history yet."
            />
          </section>
        )}
      </div>
    </>
  );
}

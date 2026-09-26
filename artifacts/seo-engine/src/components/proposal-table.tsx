import type { ProposalRecord } from "@workspace/api-client-react";
import { StatusBadge } from "./status-badge";
import { riskTone } from "@/lib/status-grammar";
import type { Column } from "./operational-table";
import { ProposalEvidenceDrawer } from "./evidence-drawer";

function reviewState(row: ProposalRecord) {
  if (row.execution_authorized) return "Authorization recorded";
  if (row.decision === "approved") return "Approved for review flow";
  if (row.decision === "rejected") return "Returned for revision";
  if (row.lifecycle === "approval_ready") return "Ready for review";
  return "Review not ready";
}

export const proposalColumns: Column[] = [
  {
    header: "Problem / impact",
    accessorKey: "title",
    cell: (_value: string, row: ProposalRecord) => (
      <div className="proposalChange">
        <strong>{row.opportunity_type.replaceAll("_", " ")}</strong>
        <span>{row.expected_benefit}</span>
        <small>{row.url || "No affected URL persisted"}</small>
      </div>
    ),
  },
  {
    header: "Current → recommended",
    accessorKey: "after_value",
    cell: (_value: string | null, row: ProposalRecord) => (
      <div className="proposalChange">
        <span><b>Current:</b> {row.before_value || "— observed empty value —"}</span>
        <strong><b>Recommended:</b> {row.after_value || "No proposed value exposed"}</strong>
        <small>{row.before_value !== null || row.after_value !== null ? "Preview available" : "Preview unavailable"}</small>
      </div>
    ),
  },
  {
    header: "Risk",
    accessorKey: "effectiveExecutionRisk",
    cell: (_value: string, row: ProposalRecord) => (
      <div className="proposalChange">
        <StatusBadge tone={riskTone(row.effectiveExecutionRisk)}>
          {row.effectiveExecutionRisk.toUpperCase()}
        </StatusBadge>
        <span>{Math.round(row.confidence * 100)}% confidence</span>
      </div>
    ),
  },
  {
    header: "Why",
    accessorKey: "evidence_count",
    cell: (_value: number, row: ProposalRecord) => (
      <div className="proposalChange">
        <span>{row.rationale}</span>
        <strong>{row.evidence_count} persisted refs</strong>
        <ProposalEvidenceDrawer proposal={row} triggerLabel="See evidence" />
      </div>
    ),
  },
  {
    header: "Review / measurement",
    accessorKey: "lifecycle",
    cell: (_value: ProposalRecord["lifecycle"], row: ProposalRecord) => (
      <div className="proposalChange">
        <strong>{reviewState(row)}</strong>
        <span>{row.execution_authorized ? "Governed execution path still applies." : "Review state does not authorize execution."}</span>
        <small>Measurement unavailable</small>
      </div>
    ),
  },
];

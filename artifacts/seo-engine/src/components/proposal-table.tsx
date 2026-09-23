import type { ProposalRecord } from "@workspace/api-client-react";
import { StatusBadge } from "./status-badge";
import { riskTone } from "@/lib/status-grammar";
import type { Column } from "./operational-table";
import { ProposalEvidenceDrawer } from "./evidence-drawer";
import { buildProposalDecisionCard } from "@/lib/decision-card-model";

export const proposalColumns: Column[] = [
  {
    header: "Problem / impact",
    accessorKey: "title",
    cell: (_value: string, row: ProposalRecord) => {
      const card = buildProposalDecisionCard(row);
      return (
        <div className="proposalChange">
          <strong>{card.problem}</strong>
          <span>{card.impact}</span>
          <small>{card.url || "No affected URL persisted"}</small>
        </div>
      );
    },
  },
  {
    header: "Current → recommended",
    accessorKey: "after_value",
    cell: (_value: string | null, row: ProposalRecord) => {
      const card = buildProposalDecisionCard(row);
      return (
        <div className="proposalChange">
          <span><b>Current:</b> {card.currentState || "— observed empty value —"}</span>
          <strong><b>Recommended:</b> {card.recommendedState}</strong>
          <small>{card.previewAvailable ? "Preview available" : "Preview unavailable"}</small>
        </div>
      );
    },
  },
  {
    header: "Risk",
    accessorKey: "effectiveExecutionRisk",
    cell: (_value: string, row: ProposalRecord) => {
      const card = buildProposalDecisionCard(row);
      return (
        <div className="proposalChange">
          <StatusBadge tone={riskTone(card.risk)}>{card.risk.toUpperCase()}</StatusBadge>
          <span>{Math.round(card.confidence * 100)}% confidence</span>
        </div>
      );
    },
  },
  {
    header: "Why",
    accessorKey: "evidence_count",
    cell: (_value: number, row: ProposalRecord) => {
      const card = buildProposalDecisionCard(row);
      return (
        <div className="proposalChange">
          <span>{card.why}</span>
          <strong>{row.evidence_count} persisted refs</strong>
          <ProposalEvidenceDrawer proposal={row} triggerLabel="See evidence" />
        </div>
      );
    },
  },
  {
    header: "Review / measurement",
    accessorKey: "lifecycle",
    cell: (_value: ProposalRecord["lifecycle"], row: ProposalRecord) => {
      const card = buildProposalDecisionCard(row);
      return (
        <div className="proposalChange">
          <strong>{card.workflowLabel}</strong>
          <span>{card.workflowDetail}</span>
          <small>{card.measurement.label}</small>
        </div>
      );
    },
  },
];

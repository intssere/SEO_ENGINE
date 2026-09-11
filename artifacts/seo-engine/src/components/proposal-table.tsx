import type { ProposalRecord } from "@workspace/api-client-react";
import { Badge } from "./layout";
import type { Column } from "./operational-table";

const titleize = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const riskTone = (risk: string) => risk === "high" ? "approval" : risk === "low" ? "verified" : "experiment";
const lifecycleTone = (stage: ProposalRecord["lifecycle"]) => stage === "approval_ready" ? "approval" : stage === "invalidated" ? "experiment" : "verified";

export const proposalColumns: Column[] = [
  {
    header: "Affected page",
    accessorKey: "title",
    cell: (value: string, row: ProposalRecord) => (
      <div className="opportunityIdentity">
        <strong>{value}</strong>
        <span>{titleize(row.action_type)} · {row.field}</span>
        <small>{row.url || "No affected URL persisted"}</small>
      </div>
    ),
  },
  {
    header: "Before → proposed",
    accessorKey: "after_value",
    cell: (_value: string | null, row: ProposalRecord) => (
      <div className="proposalChange">
        <span><b>Before:</b> {row.before_value || "— observed empty value —"}</span>
        <strong><b>Proposed:</b> {row.after_value || "Blocked pending evidence"}</strong>
      </div>
    ),
  },
  {
    header: "Evidence & benefit",
    accessorKey: "evidence_count",
    cell: (_value: number, row: ProposalRecord) => (
      <div className="proposalChange">
        <strong>{row.evidence_count} persisted refs · {(row.confidence * 100).toFixed(0)}% confidence</strong>
        <span><b>Rationale:</b> {row.rationale}</span>
        <span>{row.expected_benefit}</span>
        <small>{row.evidence_ids.join(", ") || "No evidence IDs"}</small>
      </div>
    ),
  },
  {
    header: "Review state",
    accessorKey: "lifecycle",
    cell: (value: ProposalRecord["lifecycle"], row: ProposalRecord) => (
      <div className="proposalChange">
        <Badge tone={lifecycleTone(value)}>{titleize(value)}</Badge>
        <span>Risk: <b>{row.risk_classification}</b></span>
        <small>{row.bounded_pilot ? "Bounded pilot evidence — not whole-site coverage" : "Coverage status unavailable"}</small>
      </div>
    ),
  },
  {
    header: "Safeguards & rollback",
    accessorKey: "rollback",
    cell: (value: string, row: ProposalRecord) => (
      <div className="proposalChange">
        <strong>{row.dry_run ? "DRY RUN ONLY" : "Review required"}</strong>
        <span>Authorized: {row.execution_authorized ? "yes" : "no"} · Public writes: {row.public_site_writes ? "yes" : "no"}</span>
        <small>{value}</small>
      </div>
    ),
  },
];
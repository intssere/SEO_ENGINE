import { useMemo } from "react";
import "./governance.css";
import { Link } from "wouter";
import { useListActions, useListApprovals, useListOpportunities } from "@workspace/api-client-react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { DataGrid, type DataGridColumn } from "@/components/data-grid";
import { StatusBadge } from "@/components/status-badge";
import { qualityTone, riskTone } from "@/lib/status-grammar";
import { buildGovernanceWorkspaceModel, type GovernanceRow } from "@/lib/governance-workspace-model";

const titleize = (value: string | null) =>
  value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";

function approvalTone(state: GovernanceRow["approvalState"]) {
  if (state === "approved") return "success" as const;
  if (state === "pending") return "warning" as const;
  if (state === "rejected" || state === "revision_requested") return "danger" as const;
  return "neutral" as const;
}

const columns: DataGridColumn<GovernanceRow>[] = [
  {
    id: "opportunity", header: "Opportunity", searchable: true,
    getValue: (row) => [row.opportunityTitle, row.opportunityType, row.opportunityId].join(" "),
    cell: (_value, row) => <div className="governanceIdentity">
      <strong>{row.opportunityTitle}</strong>
      <span>{titleize(row.opportunityType)} · {row.opportunityId}</span>
      <small>Score {row.opportunityScore.toFixed(1)} · {(row.opportunityConfidence * 100).toFixed(0)}% confidence</small>
    </div>,
  },
  {
    id: "proposal", header: "Proposal", searchable: true,
    getValue: (row) => [row.proposalId ?? "", row.proposalFingerprint ?? "", row.field ?? "", row.actionType ?? ""].join(" "),
    cell: (_value, row) => row.kind === "opportunity_only"
      ? <div className="governanceProposal"><StatusBadge>NO PROPOSAL</StatusBadge><small>Opportunity remains visible without inventing proposal state.</small></div>
      : <div className="governanceProposal"><strong>{row.proposalId}</strong><span>{titleize(row.actionType)} · {titleize(row.field)}</span><small className="governanceMono">{row.proposalFingerprint}</small></div>,
  },
  {
    id: "change", header: "Before → proposed", searchable: true,
    getValue: (row) => [row.beforeValue ?? "", row.proposedValue ?? ""].join(" "),
    cell: (_value, row) => <div className="governanceChange">
      <span><b>Before:</b> {row.beforeValue ?? "—"}</span>
      <span><b>Proposed:</b> {row.proposedValue ?? "—"}</span>
      <small>{row.evidenceCount === null ? "No proposal evidence yet" : String(row.evidenceCount) + " evidence refs"}</small>
    </div>,
  },
  {
    id: "approval", header: "Review state", searchable: true,
    getValue: (row) => [row.approvalState, row.lifecycle ?? ""].join(" "),
    cell: (_value, row) => <div className="governanceReview">
      <StatusBadge tone={approvalTone(row.approvalState)}>{titleize(row.approvalState)}</StatusBadge>
      <span>{row.lifecycle ? titleize(row.lifecycle) : "No proposal lifecycle"}</span>
      <small>Display state only · no approval authority</small>
    </div>,
  },
  {
    id: "risk", header: "Risk controls", searchable: true,
    getValue: (row) => [row.opportunityRisk, row.evaluatorRisk ?? "", row.planControlRisk ?? "", row.effectiveExecutionRisk ?? ""].join(" "),
    cell: (_value, row) => <div className="governanceRisk">
      <StatusBadge tone={riskTone(row.effectiveExecutionRisk ?? row.opportunityRisk)}>{titleize(row.effectiveExecutionRisk ?? row.opportunityRisk)}</StatusBadge>
      <span>Evaluator: {titleize(row.evaluatorRisk ?? row.opportunityRisk)}</span>
      <span>Plan control: {titleize(row.planControlRisk)}</span>
    </div>,
  },
  {
    id: "quality", header: "Quality", searchable: true,
    getValue: (row) => [row.qualityStatus ?? "", String(row.qualityApprovalEligible)].join(" "),
    cell: (_value, row) => <div className="governanceQuality">
      <StatusBadge tone={qualityTone(row.qualityStatus)}>{row.qualityStatus ? titleize(row.qualityStatus) : "Not available"}</StatusBadge>
      <small>Approval eligible: {row.qualityApprovalEligible === null ? "—" : row.qualityApprovalEligible ? "yes" : "no"}</small>
    </div>,
  },
  {
    id: "controls", header: "Persisted control flags", searchable: true,
    getValue: (row) => [String(row.executionAuthorized), String(row.publicSiteWrites)].join(" "),
    cell: (_value, row) => <div className="governanceFlags">
      <span>Execution authorized: <b>{row.executionAuthorized ? "yes" : "no"}</b></span>
      <span>Public-site writes: <b>{row.publicSiteWrites ? "yes" : "no"}</b></span>
      <small>Descriptive persisted state · no control exposed here</small>
    </div>,
  },
];

export default function GovernancePage() {
  const opportunities = useListOpportunities();
  const actions = useListActions();
  const approvals = useListApprovals();
  const model = useMemo(() => {
    if (!opportunities.data || !actions.data || !approvals.data) return null;
    return buildGovernanceWorkspaceModel({
      opportunities: opportunities.data.rows,
      proposals: actions.data.rows.map((row) => ({
        ...row,
        proposal_fingerprint: row.proposal_fingerprint ?? null,
      })),
      approvals: approvals.data.rows.map((row) => ({
        ...row,
        proposal_fingerprint: row.proposal_fingerprint ?? null,
      })),
    });
  }, [opportunities.data, actions.data, approvals.data]);

  const loading = opportunities.isLoading || actions.isLoading || approvals.isLoading;
  const error = opportunities.isError || actions.isError || approvals.isError;

  return <>
    <header className="topbar governanceTopbar">
      <div><strong>Governed Execution</strong><span className="muted"> Governance</span></div>
      <div className="governanceTopbarBadges" aria-label="Governance safety state">
        <StatusBadge tone="info">READ-ONLY GOVERNANCE</StatusBadge>
        <StatusBadge tone="warning">NO APPROVAL GRANT</StatusBadge>
        <StatusBadge tone="danger">NO EXECUTION</StatusBadge>
      </div>
    </header>
    <div className="content governanceWorkspace">
      <section className="governanceHero">
        <div>
          <p className="eyebrow">OPPORTUNITY → PROPOSAL → APPROVAL</p>
          <h1>Governance workspace</h1>
          <p className="muted">One read-only view of existing opportunity, proposal, and approval state. Approved review state does not authorize execution, and persisted control flags are not controls on this page.</p>
        </div>
        <div className="governanceHeroState">
          <ShieldCheck aria-hidden="true" />
          <div><strong>Control separation preserved</strong><span>No proposal edit, approval decision, authorization renewal, execution, rollback, or persistence action is available here.</span></div>
        </div>
      </section>
      <nav className="governanceSourceLinks" aria-label="Governance source views">
        <Link href="/opportunities">Open Opportunities</Link>
        <Link href="/actions">Open Actions</Link>
        <Link href="/approvals">Open Approvals</Link>
      </nav>
      {loading ? <div className="governanceLoading" role="status" aria-live="polite"><Loader2 className="animate-spin" aria-hidden="true" /><p>Reconciling read-only governance sources...</p></div>
      : error || !model ? <div className="governanceLoading governanceLoading--error" role="alert"><AlertCircle aria-hidden="true" /><p>Unable to reconcile the governance sources.</p></div>
      : <>
        <section className="governanceSummaryGrid" aria-label="Governance summary">
          <article className="card governanceSummaryCard"><span>Opportunities</span><strong>{model.counts.opportunities}</strong><p>Exact opportunity records in the current source response.</p></article>
          <article className="card governanceSummaryCard"><span>Proposals</span><strong>{model.counts.proposals}</strong><p>Unique proposal IDs reconciled across Actions and Approvals.</p></article>
          <article className="card governanceSummaryCard"><span>Pending review</span><strong>{model.counts.pending}</strong><p>Descriptive approval-ready rows only; no authority is granted here.</p></article>
          <article className="card governanceSummaryCard"><span>Recorded reviews</span><strong>{model.counts.recordedReviews}</strong><p>Approved, rejected, or revision-requested history represented in source data.</p></article>
        </section>
        <section className="card governanceGridPanel">
          <div className="sectionHead">
            <div><p className="eyebrow">UNIFIED CONTROL LINEAGE</p><h2>Opportunity, proposal & review pipeline</h2><p className="muted">Canonical row order is deterministic serialization only—not priority, recommendation, or execution order.</p></div>
            <StatusBadge tone="info">MODEL {model.modelFingerprint}</StatusBadge>
          </div>
          <DataGrid
            data={model.rows}
            columns={columns}
            getRowId={(row) => row.rowId}
            label="Governance pipeline"
            searchPlaceholder="Search opportunity, proposal, review state or risk"
            emptyMessage="No governance records are available."
            filteredEmptyMessage="No governance rows match the current search."
          />
        </section>
        <section className="governanceSafetyNote" aria-label="Governance semantics">
          <ShieldCheck aria-hidden="true" />
          <div><strong>Read-only descriptive state</strong><p>Approval display state is not approval authority. Approved does not authorize execution. execution_authorized and public_site_writes are persisted source fields shown for inspection only.</p></div>
        </section>
      </>}
    </div>
  </>;
}

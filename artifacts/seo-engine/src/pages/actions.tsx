import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildInternalActionConfirmation,
  getListActionsQueryKey,
  getListApprovalsQueryKey,
  useAuthorizeInternalAction,
  useDecideApproval,
  useListActions,
  type ProposalRecord,
} from "@workspace/api-client-react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { proposalColumns } from "../components/proposal-table";
import { Badge } from "../components/layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Textarea } from "../components/ui/textarea";

type PendingOperatorAction = {
  row: ProposalRecord;
  mode: "approve" | "authorize";
} | null;

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function isBoundedInternalCandidate(row: ProposalRecord) {
  const risk = row.risk_classification.toLowerCase();
  const lifecycleStateEligible =
    (row.lifecycle === "approval_ready" &&
      row.plan_status === "pending" &&
      row.decision === null) ||
    (row.lifecycle === "approved_proposal" && row.decision === "approved");

  return (
    lifecycleStateEligible &&
    row.bounded_pilot === true &&
    row.whole_site_coverage === false &&
    !["blocked", "high", "critical"].includes(risk) &&
    row.quality_status === "pass" &&
    row.quality_approval_eligible === true &&
    row.quality_blocking_reasons.length === 0 &&
    row.public_site_writes === false &&
    row.execution_authorized === false &&
    Boolean(row.proposal_fingerprint)
  );
}

export default function ActionsPage() {
  const { data, isLoading, isError, refetch } = useListActions();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingOperatorAction>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [lastAuthorizedActionId, setLastAuthorizedActionId] = useState<string | null>(null);

  const refreshOperatorViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListActionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() }),
      refetch(),
    ]);
  };

  const approval = useDecideApproval({
    mutation: {
      onSuccess: async () => {
        await refreshOperatorViews();
        setPending(null);
        setReviewNote("");
        setOperatorError(null);
      },
      onError: (error: any) => {
        setOperatorError(
          error?.message ||
            "The approval was not accepted. Refresh and verify the proposal state.",
        );
      },
    },
  });

  const authorization = useAuthorizeInternalAction({
    mutation: {
      onSuccess: async (result) => {
        setLastAuthorizedActionId(result.action_id);
        await refreshOperatorViews();
        setPending(null);
        setOperatorError(null);
      },
      onError: (error: any) => {
        setOperatorError(
          error?.message ||
            "Internal authorization failed closed. Refresh and verify the approval, fingerprint, and source state.",
        );
      },
    },
  });

  const operatorRows = (data?.rows || []).filter(isBoundedInternalCandidate);
  const operatorPending = approval.isPending || authorization.isPending;

  const submitOperatorAction = () => {
    if (!pending || operatorPending) return;
    setOperatorError(null);

    if (pending.mode === "approve") {
      approval.mutate({
        id: pending.row.id,
        data: {
          decision: "approved",
          confirmation: `APPROVE:${pending.row.id}`,
          reason: reviewNote.trim() || null,
          requestRevision: false,
        },
      });
      return;
    }

    const fingerprint = pending.row.proposal_fingerprint;
    if (!fingerprint) {
      setOperatorError("Persisted proposal fingerprint is missing.");
      return;
    }

    authorization.mutate({
      id: pending.row.id,
      data: {
        proposalFingerprint: fingerprint,
        confirmation: buildInternalActionConfirmation(pending.row.id, fingerprint),
      },
    });
  };

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
          description="Concrete evidence-backed proposals for review. Public-site and provider writes remain disabled unless separately authorized through the controlled production pilot."
          readiness={data?.readiness}
        />

        <section className="card opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">BOUNDED INTERNAL AUTHORIZATION</p>
              <h2>Internal action gate</h2>
              <p className="muted">
                Only bounded, quality-passed proposals that are not blocked, high, or critical risk can appear here. Approval and internal action authorization are separate explicit steps. Neither step runs Task #53 preflight/execute, requests Shopify write scope, or writes to the public site.
              </p>
            </div>
            <Badge tone="approval">
              <ShieldCheck className="w-3 h-3 mr-1 inline" /> INTERNAL ONLY
            </Badge>
          </div>

          {lastAuthorizedActionId && (
            <p className="guardrailText">
              <CheckCircle2 className="inlineIcon" /> Internal action {lastAuthorizedActionId} created. Provider writes and public-site writes remain disabled.
            </p>
          )}

          {operatorRows.length === 0 ? (
            <p className="muted">
              No bounded proposal currently requires internal approval or authorization.
            </p>
          ) : (
            <div className="approvalReviewList">
              {operatorRows.map((row) => {
                const canApprove = row.lifecycle === "approval_ready" && row.decision === null;
                const canAuthorize =
                  row.lifecycle === "approved_proposal" && row.decision === "approved";
                return (
                  <article className="approvalReviewCard" key={row.id}>
                    <div className="approvalCardHead">
                      <div>
                        <div className="approvalBadges">
                          <Badge tone="verified">QUALITY PASS · {row.quality_score}/100</Badge>
                          <Badge tone={canAuthorize ? "verified" : "approval"}>
                            {titleize(row.lifecycle)}
                          </Badge>
                        </div>
                        <h2>{row.title}</h2>
                        <p className="approvalPath">{row.path || row.url || "No persisted page path"}</p>
                        {row.url && <small>{row.url}</small>}
                      </div>
                    </div>
                    <div className="approvalDetailsGrid">
                      <section>
                        <span className="approvalLabel">Bounded change</span>
                        <p><b>{titleize(row.field)}</b></p>
                        <p>{row.after_value || "— no proposed value —"}</p>
                      </section>
                      <section>
                        <span className="approvalLabel">Safety state</span>
                        <p><b>{titleize(row.risk_classification)} risk</b> · bounded pilot</p>
                        <p className="guardrailText">
                          <ShieldCheck className="inlineIcon" /> Public writes: no · execution authorized: no
                        </p>
                      </section>
                    </div>
                    <div className="approvalActions">
                      {canApprove && (
                        <button
                          type="button"
                          className="reviewButton approve"
                          onClick={() => {
                            setOperatorError(null);
                            setReviewNote("");
                            setPending({ row, mode: "approve" });
                          }}
                        >
                          Approve proposal
                        </button>
                      )}
                      {canAuthorize && (
                        <button
                          type="button"
                          className="reviewButton approve"
                          onClick={() => {
                            setOperatorError(null);
                            setPending({ row, mode: "authorize" });
                          }}
                        >
                          Authorize internal action
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card opportunityQueue">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">PERSISTED PROPOSALS</p>
              <h2>Action planner</h2>
              <p className="muted">Before/after values, supporting evidence, expected benefit, and deterministic reversion instructions are shown for every proposal.</p>
            </div>
            <Badge tone="verified"><ShieldCheck className="w-3 h-3 mr-1 inline" /> READ-ONLY LIST</Badge>
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

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && !operatorPending && setPending(null)}
      >
        <AlertDialogContent className="approvalConfirmDialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.mode === "approve"
                ? "Approve this bounded proposal?"
                : "Authorize this internal action?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.mode === "approve"
                ? "This records the human proposal decision only. It does not create a Shopify write capability or change the public site."
                : "This creates the Task #51 internal executable action only. Provider writes remain disabled, public-site writes remain disabled, and Task #53 preflight/execute is not called."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="approvalDialogBody">
            {pending?.row && (
              <>
                <p><b>Target:</b> {pending.row.url || pending.row.path || "Unavailable"}</p>
                <p><b>Field:</b> {pending.row.field}</p>
                <p><b>Proposed value:</b> {pending.row.after_value || "—"}</p>
                <p><b>Proposal fingerprint:</b> {pending.row.proposal_fingerprint}</p>
              </>
            )}
            {pending?.mode === "approve" && (
              <>
                <label htmlFor="operator-review-note">Review note (optional)</label>
                <Textarea
                  id="operator-review-note"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  maxLength={500}
                  placeholder="Add a concise audit note."
                />
              </>
            )}
            {operatorError && <p className="decisionError">{operatorError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operatorPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={operatorPending}
              onClick={(event) => {
                event.preventDefault();
                submitOperatorAction();
              }}
              className="confirmApprove"
            >
              {operatorPending
                ? "Recording..."
                : pending?.mode === "approve"
                  ? "Confirm non-executable approval"
                  : "Confirm internal action authorization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

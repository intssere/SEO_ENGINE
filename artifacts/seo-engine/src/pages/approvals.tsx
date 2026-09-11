import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDecideApproval,
  useListApprovals,
  useEditApprovalDraft,
  getListApprovalsQueryKey,
  type ProposalRecord,
} from "@workspace/api-client-react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "../components/layout";
import { PageHeader } from "../components/operational-table";
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

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const qualityTone = (status: ProposalRecord["quality_status"]) =>
  status === "pass"
    ? "verified"
    : status === "warning"
      ? "approval"
      : "experiment";
const checkIcon = (status: string) =>
  status === "pass" ? (
    <CheckCircle2 className="inlineIcon" />
  ) : status === "warning" ? (
    <AlertCircle className="inlineIcon" />
  ) : (
    <XCircle className="inlineIcon" />
  );

type PendingDecision = {
  row: ProposalRecord;
  decision: "approved" | "rejected";
} | null;

function ProposalReviewCard({
  row,
  onDecision,
}: {
  row: ProposalRecord;
  onDecision: (decision: PendingDecision) => void;
}) {
  const decided = row.decision !== null;
  const canReview = !decided && row.plan_status === "pending";
  const canApprove =
    canReview &&
    row.lifecycle === "approval_ready" &&
    row.quality_approval_eligible &&
    row.quality_status !== "blocked";

  const [draftText, setDraftText] = useState(row.after_value || "");
  const lastSavedValue = useRef(row.after_value || "");
  const initializedId = useRef<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const editDraft = useEditApprovalDraft({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getListApprovalsQueryKey(), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            rows: old.rows.map((r: ProposalRecord) =>
              r.id === row.id
                ? {
                    ...r,
                    after_value: data.value,
                    human_edited: data.humanEdited,
                    revisions: data.revisions,
                    revision_count: data.revisions.length,
                    draft_revision_token: data.revisionToken,
                    proposal_fingerprint: data.fingerprint,
                    quality_status:
                      data.qualityGate?.status || r.quality_status,
                  }
                : r,
            ),
          };
        });
        queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
        setDraftText(data.value);
        lastSavedValue.current = data.value;
        setDraftError(null);
      },
      onError: (err: any) => {
        setDraftError(
          err.message || "Failed to update draft. The draft may be stale.",
        );
      },
    },
  });

  useEffect(() => {
    if (row.id !== initializedId.current) {
      setDraftText(row.after_value || "");
      lastSavedValue.current = row.after_value || "";
      initializedId.current = row.id;
    } else if (row.after_value !== lastSavedValue.current) {
      if (draftText === lastSavedValue.current) {
        setDraftText(row.after_value || "");
      }
      lastSavedValue.current = row.after_value || "";
    }
  }, [row.id, row.after_value, draftText]);

  const isChanged = draftText !== (row.after_value || "");
  const canSave =
    isChanged && row.draft_revision_token && row.proposal_fingerprint;
  const isChangedFromGenerated = draftText !== (row.generated_value || "");
  const canReset =
    (isChangedFromGenerated || row.human_edited) &&
    row.draft_revision_token &&
    row.proposal_fingerprint;

  const handleSave = () => {
    if (!canSave) return;
    setDraftError(null);
    editDraft.mutate({
      id: row.id,
      data: {
        mode: "save",
        value: draftText,
        revisionToken: row.draft_revision_token!,
        fingerprint: row.proposal_fingerprint!,
        confirmation: `SAVE:${row.id}:${row.proposal_fingerprint}`,
      },
    });
  };

  const handleReset = () => {
    if (!canReset) return;
    setDraftError(null);
    editDraft.mutate({
      id: row.id,
      data: {
        mode: "reset",
        revisionToken: row.draft_revision_token!,
        fingerprint: row.proposal_fingerprint!,
        confirmation: `RESET:${row.id}:${row.proposal_fingerprint}`,
      },
    });
  };

  return (
    <article className="approvalReviewCard">
      <div className="approvalCardHead">
        <div>
          <div className="approvalBadges">
            <Badge tone={qualityTone(row.quality_status)}>
              QUALITY {row.quality_status.toUpperCase()} · {row.quality_score}
              /100
            </Badge>
            <Badge
              tone={
                row.lifecycle === "approval_ready"
                  ? "approval"
                  : row.lifecycle === "approved_proposal"
                    ? "verified"
                    : "neutral"
              }
            >
              {titleize(row.lifecycle)}
            </Badge>
            {row.decision && (
              <Badge
                tone={row.decision === "approved" ? "verified" : "experiment"}
              >
                {row.decision.toUpperCase()}
              </Badge>
            )}
          </div>
          <h2>{row.title}</h2>
          <p className="approvalPath">
            {row.path || row.url || "No persisted page path"}
          </p>
          {row.url && <small>{row.url}</small>}
        </div>
        <div className="approvalScore">
          <strong>{Math.round(row.confidence * 100)}%</strong>
          <span>confidence</span>
        </div>
      </div>

      <div className="approvalDraftGrid">
        <div className="approvalReadonlyColumn">
          <div className="approvalDraftSection">
            <span className="approvalLabel">Observed before</span>
            <p className="approvalReadOnlyText">
              {row.before_value || "— observed empty value —"}
            </p>
          </div>
          <div className="approvalDraftSection">
            <div className="approvalDraftSectionHead">
              <span className="approvalLabel">Generated proposal</span>
              {row.proposal_generation_method && (
                <Badge tone="neutral">
                  {titleize(row.proposal_generation_method)}
                </Badge>
              )}
            </div>
            <p className="approvalReadOnlyText">
              {row.generated_value || row.after_value || "—"}
            </p>
          </div>
        </div>

        <div className="approvalEditColumn">
          <div className="approvalDraftHeader">
            <span className="approvalLabel">Editable Draft</span>
            {row.human_edited && (
              <Badge tone="experiment">
                HUMAN EDITED ({row.revision_count})
              </Badge>
            )}
          </div>
          <Textarea
            className="draftTextarea"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            disabled={!canReview || editDraft.isPending}
            placeholder="Edit the proposed value..."
          />

          <div className="draftMetaPanel">
            <div className="draftMetaRow">
              <div className="draftStats">
                <span className="charCount">{draftText.length} chars</span>
                <span className="metaDivider">·</span>
                <span className="revisionCount">
                  {row.revision_count || 0} revision
                  {(row.revision_count || 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <div className={`draftQuality ${row.quality_status}`}>
                {checkIcon(row.quality_status)}
                <span>
                  {row.quality_status === "pass"
                    ? "Passed"
                    : row.quality_status === "warning"
                      ? "Warnings"
                      : "Blocked"}
                </span>
              </div>
            </div>

            <details className="draftDetails">
              <summary>Status details & provenance</summary>
              <div className="draftDetailsBody">
                {row.quality_blocking_reasons.length > 0 && (
                  <div className="draftDetailSection blockers">
                    <strong>Blocking Issues</strong>
                    <ul>
                      {row.quality_blocking_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="draftDetailSection">
                  <strong>Quality Checks</strong>
                  <div className="compactChecks">
                    {row.quality_checks.map((item) => (
                      <div
                        className={`compactCheck ${item.status}`}
                        key={item.id}
                      >
                        {checkIcon(item.status)}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {row.semantic_provenance &&
                  row.semantic_provenance.length > 0 && (
                    <div className="draftDetailSection">
                      <strong>Semantic Provenance</strong>
                      <ul className="provenanceList">
                        {row.semantic_provenance.map((prov: any, i) => (
                          <li key={i} className="provenanceItem">
                            <span className="provSource">
                              {prov.source || "Knowledge Base"}
                            </span>
                            <span className="provText">
                              {prov.text || JSON.stringify(prov)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="draftDetailSection">
                  <strong>
                    Evidence References ({row.evidence_ids.length})
                  </strong>
                  <p>
                    {row.evidence_ids.join(" · ") || "No persisted references"}
                  </p>
                </div>
              </div>
            </details>
          </div>

          {canReview && (
            <div className="draftFooter">
              {draftError ? (
                <p className="decisionError draftError">
                  <AlertCircle className="inlineIcon" /> {draftError}
                </p>
              ) : (
                <div />
              )}
              <div className="draftActions">
                <button
                  type="button"
                  className="draftButton reset"
                  disabled={!canReset || editDraft.isPending}
                  onClick={handleReset}
                >
                  Reset to generated
                </button>
                <button
                  type="button"
                  className="draftButton save"
                  disabled={!canSave || editDraft.isPending}
                  onClick={handleSave}
                >
                  {editDraft.isPending &&
                  editDraft.variables?.data.mode === "save" ? (
                    <Loader2 className="animate-spin inlineIcon" />
                  ) : null}
                  Save draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="approvalDetailsGrid">
        <section>
          <span className="approvalLabel">Opportunity & rationale</span>
          <p>
            <b>{titleize(row.opportunity_type)}</b> · score{" "}
            {row.score.toFixed(1)}
          </p>
          <p>{row.rationale}</p>
          <p className="approvalBenefit">{row.expected_benefit}</p>
        </section>
        <section>
          <span className="approvalLabel">Risk & reversion</span>
          <p>
            <b>{titleize(row.risk_classification)} risk</b> ·{" "}
            {titleize(row.action_type)}
          </p>
          <p>
            <RotateCcw className="inlineIcon" /> {row.rollback}
          </p>
          <p className="guardrailText">
            <ShieldCheck className="inlineIcon" /> Non-executable review only ·
            public writes disabled
          </p>
        </section>
      </div>

      {decided ? (
        <div className="decisionHistory">
          <strong>
            {row.decision === "approved"
              ? "Approved as a non-executable proposal"
              : "Returned for revision"}
          </strong>
          <span>
            {row.decided_at
              ? new Date(row.decided_at).toLocaleString()
              : "Decision time unavailable"}{" "}
            · {row.decided_by || "same-origin reviewer"}
          </span>
          {row.decision_reason && <p>{row.decision_reason}</p>}
          {row.revision_requested && (
            <small>
              Revision explicitly requested; the next normal evaluation may
              regenerate this proposal.
            </small>
          )}
        </div>
      ) : (
        <div className="approvalActions">
          {!canApprove && (
            <p>
              <AlertCircle className="inlineIcon" /> Approval is blocked until
              every blocking quality check passes.
            </p>
          )}
          <button
            type="button"
            className="reviewButton reject"
            disabled={!canReview}
            onClick={() => onDecision({ row, decision: "rejected" })}
          >
            Reject / return for revision
          </button>
          <button
            type="button"
            className="reviewButton approve"
            disabled={!canApprove}
            onClick={() => onDecision({ row, decision: "approved" })}
          >
            Approve proposal
          </button>
        </div>
      )}
    </article>
  );
}

export default function ApprovalsPage() {
  const { data, isLoading, isError, refetch } = useListApprovals();
  const [pending, setPending] = useState<PendingDecision>(null);
  const [reason, setReason] = useState("");
  const [requestRevision, setRequestRevision] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const decision = useDecideApproval({
    mutation: {
      onSuccess: async () => {
        await refetch();
        setPending(null);
        setReason("");
        setSubmitError(null);
      },
      onError: () =>
        setSubmitError(
          "The decision was not accepted. Refresh the proposal and verify its quality state.",
        ),
    },
  });

  const submit = () => {
    if (
      !pending ||
      (pending.decision === "rejected" && reason.trim().length < 3)
    )
      return;
    decision.mutate({
      id: pending.row.id,
      data: {
        decision: pending.decision,
        confirmation: `${pending.decision === "approved" ? "APPROVE" : "REJECT"}:${pending.row.id}`,
        reason: reason.trim() || null,
        requestRevision: pending.decision === "rejected" && requestRevision,
      },
    });
  };

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
          eyebrow="HUMAN REVIEW"
          title="Proposal quality & decisions"
          description="Review one evidence-grounded proposal at a time. Approval records a human decision only; it cannot create an executable action or write to the public site."
          readiness={data?.readiness}
        />
        <section className="approvalIntro">
          <div>
            <ClipboardCheck />
            <div>
              <strong>No bulk or implicit approval</strong>
              <span>
                Every decision requires proposal-level confirmation and is
                retained as audit history.
              </span>
            </div>
          </div>
          <Badge tone="verified">READ-ONLY DECISIONS</Badge>
        </section>
        {isLoading ? (
          <div className="approvalLoading">
            <Loader2 className="animate-spin" />
            <p>Loading quality-gated proposals...</p>
          </div>
        ) : isError || !data ? (
          <div className="approvalLoading error">
            <AlertCircle />
            <p>Failed to load proposal reviews.</p>
          </div>
        ) : data.rows.length === 0 ? (
          <div className="approvalEmpty">
            <ShieldCheck />
            <h2>No quality-gated proposals yet</h2>
            <p>
              The next normal read-only evaluation can prepare proposals for
              review.
            </p>
          </div>
        ) : (
          <div className="approvalReviewList">
            {data.rows.map((row) => (
              <ProposalReviewCard
                key={row.id}
                row={row}
                onDecision={setPending}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) =>
          !open && !decision.isPending && setPending(null)
        }
      >
        <AlertDialogContent className="approvalConfirmDialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.decision === "approved"
                ? "Approve this proposal?"
                : "Return this proposal for revision?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.decision === "approved"
                ? "This records a non-executable review decision. It does not authorize deployment, Shopify changes, or public-site writes."
                : "The proposal and decision history remain available. Regeneration occurs only after evidence changes or when revision is explicitly requested."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="approvalDialogBody">
            <label htmlFor="decision-reason">
              {pending?.decision === "rejected"
                ? "Reason for rejection (required)"
                : "Review note (optional)"}
            </label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Add a concise audit note."
            />
            {pending?.decision === "rejected" && (
              <label className="revisionChoice">
                <input
                  type="checkbox"
                  checked={requestRevision}
                  onChange={(event) => setRequestRevision(event.target.checked)}
                />
                Explicitly request a revised proposal on the next normal
                evaluation
              </label>
            )}
            {submitError && <p className="decisionError">{submitError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decision.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                decision.isPending ||
                (pending?.decision === "rejected" && reason.trim().length < 3)
              }
              onClick={(event) => {
                event.preventDefault();
                submit();
              }}
              className={
                pending?.decision === "rejected"
                  ? "confirmReject"
                  : "confirmApprove"
              }
            >
              {decision.isPending
                ? "Recording decision..."
                : pending?.decision === "approved"
                  ? "Confirm non-executable approval"
                  : "Confirm rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

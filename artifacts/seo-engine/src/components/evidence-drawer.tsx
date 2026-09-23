import type {
  OpportunityRecord,
  ProposalRecord,
} from "@workspace/api-client-react";
import { Eye, FileSearch } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { ProgressiveDisclosure } from "./progressive-disclosure";
import { qualityTone } from "@/lib/status-grammar";
import {
  buildOpportunityEvidenceDrawerModel,
  buildProposalEvidenceDrawerModel,
  type EvidenceDrawerModel,
} from "@/lib/evidence-drawer-model";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

function referenceTone(
  completeness: EvidenceDrawerModel["references"]["completeness"],
) {
  if (completeness === "complete") return "success" as const;
  if (completeness === "partial") return "warning" as const;
  return "neutral" as const;
}

function coverageTone(kind: EvidenceDrawerModel["coverage"]["kind"]) {
  if (kind === "whole_site") return "success" as const;
  if (kind === "bounded_pilot") return "info" as const;
  return "neutral" as const;
}

function percent(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

export function EvidenceDrawer({
  model,
  triggerLabel = "See evidence",
}: {
  model: EvidenceDrawerModel;
  triggerLabel?: string;
}) {
  const customer = (
    <>
      <section className="evidenceDrawerSection" aria-labelledby={`evidence-summary-${model.subjectId}`}>
        <div className="evidenceDrawerSectionHead">
          <h3 id={`evidence-summary-${model.subjectId}`}>What supports this</h3>
          <StatusBadge tone={referenceTone(model.references.completeness)}>
            {model.references.completeness.toUpperCase()}
          </StatusBadge>
        </div>
        <dl className="evidenceDrawerFacts">
          <div><dt>References</dt><dd>{model.references.declaredCount}</dd></div>
          <div><dt>Confidence</dt><dd>{percent(model.confidence)}</dd></div>
          <div>
            <dt>Enough evidence</dt>
            <dd>
              {model.evidenceSufficient === null
                ? "Unavailable"
                : model.evidenceSufficient ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
        <p>{model.rationale}</p>
        {model.whyQualifies ? <p><strong>Why it qualifies:</strong> {model.whyQualifies}</p> : null}
        {model.expectedBenefit ? <p><strong>Expected benefit:</strong> {model.expectedBenefit}</p> : null}
      </section>
    </>
  );

  const evidence = (
    <section className="evidenceDrawerSection" aria-labelledby={`evidence-refs-${model.subjectId}`}>
      <div className="evidenceDrawerSectionHead">
        <h3 id={`evidence-refs-${model.subjectId}`}>Traceable evidence</h3>
        <StatusBadge tone={coverageTone(model.coverage.kind)}>
          {model.coverage.kind.replaceAll("_", " ").toUpperCase()}
        </StatusBadge>
      </div>
      <p className="evidenceDrawerNote">{model.coverage.label}</p>
      {model.query ? <p><strong>Query:</strong> {model.query}</p> : null}
      {model.references.ids.length > 0 ? (
        <ul className="evidenceReferenceList">
          {model.references.ids.map((id) => <li key={id}><code>{id}</code></li>)}
        </ul>
      ) : (
        <div className="evidenceUnavailable">Detailed evidence IDs are unavailable.</div>
      )}
      {model.references.qualityEvidenceIds.length > 0 ? (
        <div className="evidenceQualityRefs">
          <strong>Quality evidence IDs</strong>
          <ul className="evidenceReferenceList">
            {model.references.qualityEvidenceIds.map((id) => <li key={id}><code>{id}</code></li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );

  const advanced = (
    <>
      <section className="evidenceDrawerSection" aria-labelledby={`evidence-quality-${model.subjectId}`}>
        <div className="evidenceDrawerSectionHead">
          <h3 id={`evidence-quality-${model.subjectId}`}>Quality & provenance</h3>
          <StatusBadge tone={qualityTone(model.quality.status)}>
            {model.quality.status.toUpperCase()}
          </StatusBadge>
        </div>
        {model.executionAuthorized !== null ? (
          <p><strong>Execution authorized:</strong> {model.executionAuthorized ? "yes" : "no"}</p>
        ) : null}
        {model.quality.score !== null ? (
          <p>
            <strong>Quality score:</strong> {model.quality.score}/100 ·
            Approval eligible: {model.quality.approvalEligible ? "yes" : "no"}
          </p>
        ) : (
          <div className="evidenceUnavailable">Proposal quality details are unavailable.</div>
        )}
        {model.quality.blockingReasons.length > 0 ? (
          <div className="evidenceDrawerCallout evidenceDrawerCallout--danger">
            <strong>Blocking reasons</strong>
            <ul>{model.quality.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
        ) : null}
        {model.quality.warnings.length > 0 ? (
          <div className="evidenceDrawerCallout evidenceDrawerCallout--warning">
            <strong>Warnings</strong>
            <ul>{model.quality.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
        ) : null}
        {model.quality.checks.length > 0 ? (
          <ul className="evidenceCheckList">
            {model.quality.checks.map((check) => (
              <li key={check.id}>
                <div className="evidenceDrawerSectionHead">
                  <strong>{check.label}</strong>
                  <StatusBadge tone={qualityTone(check.status)}>
                    {check.status.toUpperCase()} · {check.score}
                  </StatusBadge>
                </div>
                <p>{check.summary}</p>
                {check.evidenceIds.length > 0 ? <small>{check.evidenceIds.join(" · ")}</small> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {model.provenance.length > 0 ? (
          <div className="evidenceProvenance">
            <strong>Semantic provenance</strong>
            <ul>
              {model.provenance.map((entry, index) => (
                <li key={`${entry.source}:${index}`}>
                  <span>{entry.source}</span>
                  <p>{entry.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="evidenceDrawerSection" aria-labelledby={`evidence-detail-${model.subjectId}`}>
        <h3 id={`evidence-detail-${model.subjectId}`}>Unavailable technical dimensions</h3>
        <p className="evidenceDrawerNote">
          These states are not inferred when the current API does not expose them.
        </p>
        <ul className="evidenceDetailList">
          {model.detailStates.map((state) => (
            <li key={state.key}>
              <div><strong>{state.label}</strong><p>{state.reason}</p></div>
              <StatusBadge>UNAVAILABLE</StatusBadge>
            </li>
          ))}
        </ul>
      </section>
    </>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className="evidenceDrawerTrigger">
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          {triggerLabel}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="evidenceDrawerContent sm:max-w-[680px]">
        <SheetHeader className="evidenceDrawerHeader">
          <div className="evidenceDrawerEyebrow">
            <FileSearch className="w-4 h-4" aria-hidden="true" />
            EVIDENCE
          </div>
          <SheetTitle>{model.title}</SheetTitle>
          <SheetDescription>
            {model.subtitle}{model.url ? ` · ${model.url}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="evidenceDrawerBody">
          <ProgressiveDisclosure
            customer={customer}
            evidence={evidence}
            advanced={advanced}
            evidenceLabel="Show traceable evidence"
            advancedLabel="Show technical details"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ProposalEvidenceDrawer({
  proposal,
  triggerLabel,
}: {
  proposal: ProposalRecord;
  triggerLabel?: string;
}) {
  return (
    <EvidenceDrawer
      model={buildProposalEvidenceDrawerModel(proposal)}
      triggerLabel={triggerLabel}
    />
  );
}

export function OpportunityEvidenceDrawer({
  opportunity,
  triggerLabel,
}: {
  opportunity: OpportunityRecord;
  triggerLabel?: string;
}) {
  return (
    <EvidenceDrawer
      model={buildOpportunityEvidenceDrawerModel(opportunity)}
      triggerLabel={triggerLabel}
    />
  );
}

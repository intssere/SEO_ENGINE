import type { ReactNode } from "react";
import { Link } from "wouter";
import { StatusBadge } from "./status-badge";
import { riskTone } from "@/lib/status-grammar";
import type { DecisionCardModel } from "@/lib/decision-card-model";

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function stateText(value: string | null) {
  if (value === null) return "Not exposed in this record";
  if (value === "") return "Observed empty value";
  return value;
}

export function DecisionCard({
  model,
  evidence,
  footer,
}: {
  model: DecisionCardModel;
  evidence?: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = model.id + "-title";
  return (
    <article className="card approvalReviewCard" aria-labelledby={titleId}>
      <header className="approvalCardHead">
        <div>
          <p className="eyebrow">{model.subtitle}</p>
          <h2 id={titleId}>{model.problem}</h2>
          {model.url ? <small>{model.url}</small> : null}
        </div>
        <div className="approvalBadges">
          <StatusBadge tone={riskTone(model.risk)}>
            {titleize(model.risk)} risk
          </StatusBadge>
          <StatusBadge tone="info">
            {Math.round(model.confidence * 100)}% confidence
          </StatusBadge>
        </div>
      </header>

      <div className="approvalDetailsGrid">
        <section>
          <span className="approvalLabel">Impact</span>
          <p>{model.impact}</p>
        </section>
        <section>
          <span className="approvalLabel">Priority</span>
          <p><b>{model.score.toFixed(1)}</b> score</p>
        </section>
      </div>

      <div className="approvalDetailsGrid">
        <section>
          <span className="approvalLabel">Current state</span>
          <p>{stateText(model.currentState)}</p>
        </section>
        <section>
          <span className="approvalLabel">Recommended state</span>
          <p>{model.recommendedState}</p>
        </section>
      </div>

      <div className="approvalDraftSection">
        <span className="approvalLabel">Why</span>
        <p>{model.why}</p>
        {evidence}
      </div>

      <div className="approvalDetailsGrid">
        <section>
          <span className="approvalLabel">Review / apply</span>
          <p><b>{model.workflowLabel}</b></p>
          <p>{model.workflowDetail}</p>
        </section>
        <section>
          <span className="approvalLabel">Measurement</span>
          <p><b>{model.measurement.label}</b></p>
          <p>{model.measurement.detail}</p>
        </section>
      </div>

      <div className="approvalActions">
        {model.previewAvailable ? (
          <StatusBadge tone="info">PREVIEW AVAILABLE</StatusBadge>
        ) : (
          <StatusBadge>PREVIEW AFTER PROPOSAL</StatusBadge>
        )}
        <Link href={model.actionHref} className="customerHubAction">
          {model.actionLabel}
        </Link>
        {footer}
      </div>
    </article>
  );
}

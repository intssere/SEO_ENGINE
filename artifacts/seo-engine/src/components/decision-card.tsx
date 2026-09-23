import type { ReactNode } from "react";
import { Link } from "wouter";
import { StatusBadge } from "./status-badge";
import { riskTone } from "@/lib/status-grammar";
import type { DecisionCardModel } from "@/lib/decision-card-model";

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function DecisionCard({
  model,
  evidence,
}: {
  model: DecisionCardModel;
  evidence?: ReactNode;
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
          <StatusBadge tone="info">{Math.round(model.confidence * 100)}% confidence</StatusBadge>
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
          <p>Not exposed in this record</p>
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
          <p>This card does not execute changes.</p>
        </section>
        <section>
          <span className="approvalLabel">Measurement</span>
          <p><b>Measurement unavailable</b></p>
          <p>No verified outcome is exposed.</p>
        </section>
      </div>

      <div className="approvalActions">
        <StatusBadge>PREVIEW AFTER PROPOSAL</StatusBadge>
        <Link href="/automation" className="customerHubAction">Review workflow</Link>
      </div>
    </article>
  );
}

import type { ReactNode } from "react";
import { Link } from "wouter";
import type { DecisionCardModel } from "@/lib/decision-card-model";

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
        <h2 id={titleId}>{model.problem}</h2>
      </header>

      <div className="approvalDetailsGrid">
        <section>
          <span className="approvalLabel">Impact</span>
          <p>{model.impact}</p>
        </section>
        <section>
          <span className="approvalLabel">Risk</span>
          <p><b>{model.risk}</b></p>
        </section>
      </div>

      <div className="approvalDetailsGrid">
        <section>
          <span className="approvalLabel">Current state</span>
          <p>Not available</p>
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
        </section>
        <section>
          <span className="approvalLabel">Measurement</span>
          <p><b>Not measured</b></p>
        </section>
      </div>

      <div className="approvalActions">
        <span className="approvalLabel">Preview after proposal</span>
        <Link href="/automation" className="customerHubAction">Review workflow</Link>
      </div>
    </article>
  );
}

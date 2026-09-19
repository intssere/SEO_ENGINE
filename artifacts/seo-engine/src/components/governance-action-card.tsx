import { StatusBadge } from "@/components/status-badge";
import { qualityTone, riskTone } from "@/lib/status-grammar";
import type { GovernanceActionCard } from "@/lib/governance-action-card-model";

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function exactValue(value: string | null) {
  if (value === null) return <span className="governanceUnavailableValue">Unavailable (null)</span>;
  if (value === "") return <span className="governanceEmptyValue">Empty string</span>;
  return <span>{value}</span>;
}

export function GovernanceActionCardView({ card }: { card: GovernanceActionCard }) {
  const titleId = card.cardId + "-title";
  return (
    <article className="card governanceActionCard" aria-labelledby={titleId}>
      <header className="governanceActionCardHeader">
        <div>
          <p className="eyebrow">PROPOSAL {card.proposalId}</p>
          <h3 id={titleId}>{card.opportunityTitle}</h3>
          <p className="muted">
            {titleize(card.target.actionType)} · {titleize(card.target.field)}
            {card.target.path ? " · " + card.target.path : ""}
          </p>
        </div>
        <div className="governanceActionCardBadges">
          <StatusBadge tone="info">READ-ONLY</StatusBadge>
          <StatusBadge>{titleize(card.recordedLifecycle)}</StatusBadge>
        </div>
      </header>

      <div className="governanceActionCardGrid">
        <section className="governanceActionBlock" aria-label="Evidence">
          <div className="governanceActionBlockHead">
            <h4>Evidence</h4>
            <StatusBadge tone={qualityTone(card.evidence.qualityStatus)}>
              {titleize(card.evidence.qualityStatus)}
            </StatusBadge>
          </div>
          <dl>
            <div><dt>Declared count</dt><dd>{card.evidence.count}</dd></div>
            <div><dt>Evidence sufficient</dt><dd>{card.evidence.sufficient ? "Yes" : "No"}</dd></div>
            <div><dt>Quality score</dt><dd>{card.evidence.qualityScore}/100</dd></div>
            <div><dt>Approval eligible</dt><dd>{card.evidence.approvalEligible ? "Yes" : "No"}</dd></div>
          </dl>
          <p>Counts and quality facts are exact source fields; no missing evidence detail is synthesized here.</p>
        </section>

        <section className="governanceActionBlock" aria-label="Risk">
          <div className="governanceActionBlockHead">
            <h4>Risk</h4>
            <StatusBadge tone={riskTone(card.risk.effectiveExecution)}>
              {titleize(card.risk.effectiveExecution)} effective
            </StatusBadge>
          </div>
          <dl>
            <div><dt>Opportunity</dt><dd>{titleize(card.risk.opportunity)}</dd></div>
            <div><dt>Evaluator</dt><dd>{titleize(card.risk.evaluator)}</dd></div>
            <div><dt>Plan control</dt><dd>{titleize(card.risk.planControl)}</dd></div>
            <div><dt>Execution authorized</dt><dd>{card.risk.executionAuthorized ? "Yes" : "No"}</dd></div>
            <div><dt>Public-site writes</dt><dd>{card.risk.publicSiteWrites ? "Yes" : "No"}</dd></div>
            <div><dt>Coverage</dt><dd>{card.risk.wholeSiteCoverage ? "Whole site" : card.risk.boundedPilot ? "Bounded pilot" : "Not declared"}</dd></div>
          </dl>
          <p>Risk domains and persisted flags remain separate descriptive facts; this card exposes no authority.</p>
        </section>

        <section className="governanceActionBlock governanceActionPreview" aria-label="Preview">
          <div className="governanceActionBlockHead">
            <h4>Preview</h4>
            <StatusBadge>DESCRIPTIVE</StatusBadge>
          </div>
          <div className="governancePreviewValues">
            <div><strong>Before</strong>{exactValue(card.preview.before)}</div>
            <div><strong>Proposed</strong>{exactValue(card.preview.proposed)}</div>
          </div>
          <p><strong>Rationale:</strong> {card.preview.rationale}</p>
          <p><strong>Expected benefit:</strong> {card.preview.expectedBenefit}</p>
          <p>Preview does not imply recommendation, approval, apply authorization, or execution.</p>
        </section>

        <section className="governanceActionBlock governanceActionUnavailable" aria-label="Verification">
          <div className="governanceActionBlockHead">
            <h4>Verification</h4>
            <StatusBadge>VERIFICATION DETAIL UNAVAILABLE</StatusBadge>
          </div>
          <p><strong>Recorded lifecycle:</strong> {titleize(card.recordedLifecycle)}</p>
          <p>{card.verification.reason}</p>
        </section>

        <section className="governanceActionBlock governanceActionRollback" aria-label="Rollback">
          <div className="governanceActionBlockHead">
            <h4>Rollback</h4>
            <StatusBadge tone="warning">ROLLBACK PLAN ONLY</StatusBadge>
          </div>
          <p className="governanceRollbackPlan">
            {card.rollback.planAvailability === "available"
              ? card.rollback.plan
              : "No rollback plan text is exposed for this proposal."}
          </p>
          <StatusBadge>ROLLBACK STATUS UNAVAILABLE</StatusBadge>
          <p>{card.rollback.reason}</p>
        </section>
      </div>
    </article>
  );
}

import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

const opportunityStyles = `
.chOpportunities{max-width:1170px;padding:4px 0 30px}
.chOpportunities *{box-sizing:border-box}
.chOppHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.chOppHeader h1{font-size:clamp(27px,3vw,36px);line-height:1.2;letter-spacing:-.03em;margin:6px 0}
.chOppHeader p{max-width:670px;font-size:14px;margin:0}
.chOppHeader a{font-size:13px;text-decoration:none}
.chOppStatus{background:#fff;border:1px solid #dee6f2;border-radius:16px;padding:24px;box-shadow:0 2px 8px #182f530d}
.chOppStatus h2{font-size:21px;font-weight:750;margin:8px 0}
.chOppStatus p{font-size:13px;margin:0}
.chOppFlow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
.chOppStep{background:#fff;border:1px solid #e1e7f0;border-radius:14px;padding:20px}
.chOppStep span{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:#edf2ff;color:#335dea;font-weight:800;margin-bottom:12px}
.chOppStep h3{font-size:15px;font-weight:750;margin:0 0 6px}
.chOppStep p{font-size:12px;margin:0}
.chOppEmpty{border:1px dashed #c7d4e7;border-radius:16px;background:#f9fbff;min-height:155px;padding:28px;display:grid;place-items:center;text-align:center}
.chOppEmpty h2{font-size:18px;font-weight:750;margin:0}
.chOppEmpty p{font-size:13px;max-width:500px;margin:6px auto 0}
.chOppControls{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin:24px 0 13px}
.chOppControls h2{font-size:19px;font-weight:750;margin:0}
.chOppFilter{font-size:12px;border:1px solid #d5dfed;padding:8px 12px;border-radius:8px;background:#fff;color:#52627a}
@media(max-width:650px){.chOppFlow{grid-template-columns:minmax(0,1fr)}.chOppStep{padding:17px}.chOppStatus{padding:19px}.chOppEmpty{padding:20px}}
`;

/** Never show example findings as real opportunities or permit unauthorised site changes. */
export default function CustomerOpportunitiesPage() {
  return <div className="customerOnboarding chOpportunities" aria-labelledby="customer-opportunities-title">
    <style>{styles}</style><style>{opportunityStyles}</style>
    <header className="chOppHeader">
      <div><p className="customerEyebrow">OPPORTUNITIES · PREVIEW</p>
        <h1 id="customer-opportunities-title">Your SEO opportunities</h1>
        <p>Evidence-backed recommendations will help you prioritize improvements without changing your website automatically.</p>
      </div>
      <Link href="/site-overview" className="customerBackLink">Back to site overview →</Link>
    </header>
    <section className="chOppStatus" aria-labelledby="opportunity-readiness">
      <p className="customerEyebrow">READINESS STATUS</p>
      <h2 id="opportunity-readiness">No verified opportunities available</h2>
      <p role="status">A verified website connection, completed analysis and supporting evidence are required before opportunities can appear.</p>
      <Link href="/onboarding" className="customerPrimaryButton">Review website setup →</Link>
    </section>
    <section aria-label="How recommendations are reviewed" className="chOppFlow">
      {[
        ["1", "Identify", "Evaluate verified technical, content and search evidence."],
        ["2", "Review", "Inspect the finding, supporting evidence and proposed change."],
        ["3", "Approve", "Website changes require an explicit, separately authorized action."]
      ].map(([number,title,description])=><article className="chOppStep" key={number}>
        <span aria-hidden="true">{number}</span><h3>{title}</h3><p>{description}</p>
      </article>)}
    </section>
    <section aria-labelledby="opportunity-list-title">
      <div className="chOppControls"><h2 id="opportunity-list-title">Opportunity queue</h2>
        <span className="chOppFilter" aria-label="Filter unavailable without verified opportunities">All priorities · No records</span>
      </div>
      <div className="chOppEmpty" role="status"><div><h2>No opportunities to display</h2>
        <p>Recommendations, priority, projected impact and before-and-after comparisons will appear only when grounded in verified site evidence.</p></div>
      </div>
    </section>
    <p className="customerNotice">Read-only preview. No audit job, recommendation, approval, optimization or site modification has been performed.</p>
  </div>;
}

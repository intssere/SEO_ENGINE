import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

const opportunityStyles = `
.chOpportunities{padding:4px 0}
.chOppHeader,.chOppControls{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
.chOppHeader h1{font-size:32px;margin:5px 0}
.chOppHeader p,.chOppStatus p,.chOppStep p{font-size:13px}
.chOppStatus,.chOppStep{background:white;border:1px solid #dee6f2;border-radius:14px;padding:20px}
.chOppStatus h2{font-size:21px}
.chOppFlow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
.chOppStep span{display:block;color:#345bea;font-weight:800;margin-bottom:8px}
.chOppStep h3{font-size:15px}
.chOppEmpty{border:1px dashed #c7d4e7;border-radius:14px;background:#f9fbff;padding:25px;text-align:center}
.chOppEmpty p{font-size:13px}
.chOppControls h2{font-size:19px}
.chOppFilter{font-size:12px;color:#52627a}
@media(max-width:650px){.chOppFlow{grid-template-columns:1fr}}
`;

/** Never show example findings as real opportunities or permit unauthorised site changes. */
export default function CustomerOpportunitiesPage() {
  return <div className="customerOnboarding chOpportunities" aria-labelledby="customer-opportunities-title">
    <style>{styles}</style><style>{opportunityStyles}</style>
    <header className="chOppHeader">
      <div><p className="customerEyebrow">OPPORTUNITIES · PREVIEW</p>
        <h1 id="customer-opportunities-title">Your SEO opportunities</h1>
        <p>Review verified recommendations before approving any changes.</p>
      </div>
      <Link href="/site-overview" className="customerBackLink">Back to site overview →</Link>
    </header>
    <section className="chOppStatus" aria-labelledby="opportunity-readiness">
      <p className="customerEyebrow">READINESS STATUS</p>
      <h2 id="opportunity-readiness">No verified opportunities available</h2>
      <p role="status">Connect and analyze a verified website to see opportunities.</p>
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
        <p>Verified findings and comparisons will appear here.</p></div>
      </div>
    </section>
    <p className="customerNotice">Read-only preview. No SEO actions have been performed.</p>
  </div>;
}

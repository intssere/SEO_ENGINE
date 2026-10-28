import { Link } from "wouter";
import "./customer-onboarding.css";

/** Preview-only status: never infer a job from onboarding input or fabricate progress. */
const checks = [
  "Website ownership and access",
  "Site crawl and indexability",
  "Technical SEO checks",
  "Content and metadata review",
  "Internal linking analysis",
  "Search performance sources",
  "Evidence validation and report",
];

export default function CustomerAnalysisPage() {
  return <div className="customerOnboarding" aria-labelledby="analysis-title">
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">SITE ANALYSIS · PREVIEW</p><h1 id="analysis-title">Site analysis</h1>
      <p>Review the analysis stages. No verified analysis job is currently available in this preview.</p></div>
      <Link href="/onboarding" className="customerBackLink">Back to website setup</Link>
    </header>
    <div className="customerOnboardingGrid">
      <section className="customerOnboardingCard" aria-labelledby="analysis-status">
        <p className="customerEyebrow">CURRENT STATUS</p>
        <h2 id="analysis-status">Not started</h2>
        <p role="status">Awaiting authorized site connection and a verified analysis job.</p>
        <progress value={0} max={100} aria-label="Verified analysis progress" style={{width:"100%",height:14}} />
        <p><strong>0% verified progress</strong> — no execution evidence is available.</p>
        <ol aria-label="Analysis stages" style={{paddingLeft:24}}>
          {checks.map((name,i)=><li key={name} style={{padding:"12px 0",borderBottom:"1px solid #e1e6ef"}}>
            <strong>{i+1}. {name}</strong> <span style={{color:"#64748b"}}>· Not started</span>
          </li>)}
        </ol>
        <p className="customerNotice">This is a read-only process overview, not a live progress simulation. No crawl, provider request, analysis or optimization has been initiated.</p>
        <Link href="/onboarding" className="customerPrimaryButton">Review website setup →</Link>
      </section>
      <aside className="customerOnboardingAside">
        <h3>Evidence before results</h3>
        <p>Progress and findings will be shown only after an authorized job provides independently verified status and observations.</p>
        <ul><li>No simulated activity</li><li>No invented scores or traffic</li><li>No changes to your website</li><li>Explicit approval for future actions</li></ul>
      </aside>
    </div>
  </div>;
}

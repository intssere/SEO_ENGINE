import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

const metrics = ["Organic clicks", "Search impressions", "Indexed pages", "Technical health"];
const sections = ["Technical SEO", "Search visibility", "Content quality", "Site opportunities"];

/** Preview only: no inferred site, fabricated measurements, or network operations. */
export default function CustomerSiteOverviewPage() {
  return <div className="customerOnboarding" aria-labelledby="site-overview-title">
    <style>{styles}</style>
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">SITE OVERVIEW · PREVIEW</p>
        <h1 id="site-overview-title">Your website at a glance</h1>
        <p>Verified SEO performance and technical health appear after a site is connected and evidence is available.</p>
      </div>
      <Link href="/analysis" className="customerBackLink">View analysis stages</Link>
    </header>
    <section className="customerOnboardingCard" aria-labelledby="site-connection-status">
      <h2 id="site-connection-status">No verified website connected</h2>
      <p role="status">No authorized site record or completed analysis is available in this preview.</p>
      <Link href="/onboarding" className="customerPrimaryButton">Review website setup →</Link>
    </section>
    <section aria-label="SEO performance metrics" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:16,marginTop:24}}>
      {metrics.map(label=><article key={label} className="customerOnboardingCard">
        <h2>{label}</h2><p aria-label={label+" unavailable"}>Not available</p>
      </article>)}
    </section>
    <section className="customerOnboardingCard" aria-labelledby="site-trends-title" style={{marginTop:24}}>
      <h2 id="site-trends-title">Search performance trend</h2>
      <p>No verified time-series data is available.</p>
      <div style={{minHeight:120,display:"grid",placeItems:"center",border:"1px dashed #cbd5e1",borderRadius:12}}>Awaiting verified data</div>
    </section>
    <section aria-labelledby="site-workspace-title" style={{marginTop:24}}>
      <h2 id="site-workspace-title">SEO workspace</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:16}}>
        {sections.map(label=><article key={label} className="customerOnboardingCard"><h3>{label}</h3><p>Awaiting verified evidence</p></article>)}
      </div>
    </section>
    <p className="customerNotice" style={{marginTop:24}}>Read-only preview. No crawl, connection, optimization or website write has been initiated.</p>
  </div>;
}

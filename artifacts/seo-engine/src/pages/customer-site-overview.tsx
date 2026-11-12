import { Link } from "wouter";
import onboardingStyles from "./customer-onboarding.css?inline";

const metrics = [
  ["Organic clicks", "Google Search Console"],
  ["Search impressions", "Google Search Console"],
  ["Indexed pages", "Verified index coverage"],
  ["Technical health", "Completed technical audit"],
] as const;
const sections = [
  ["Technical SEO", "Crawlability, indexability and site checks"],
  ["Search visibility", "Search impressions and organic clicks"],
  ["Content quality", "Metadata, content and page signals"],
  ["Site opportunities", "Evidence-backed improvement candidates"],
] as const;


/** Preview only. The empty-state cards never infer a connected site or fabricate measurements. */
export default function CustomerSiteOverviewPage() {
  return <div className="customerOnboarding chOverview" aria-labelledby="site-overview-title">
    <style>{onboardingStyles}</style>
    <header className="chOverviewHeader">
      <div>
        <p className="customerEyebrow">SITE OVERVIEW · PREVIEW</p>
        <h1 id="site-overview-title">Your website at a glance</h1>
        <p>Track SEO performance, technical health and opportunities from verified website data.</p>
      </div>
      <Link href="/analysis" className="customerBackLink">View analysis stages →</Link>
    </header>
    <section className="chOverviewCard chOverviewConnection" aria-labelledby="site-connection-status">
      <div>
        <span className="chOverviewStatus">Setup required</span>
        <h2 id="site-connection-status">Connect a website to view your results</h2>
        <p role="status">No verified website or completed analysis is available in this preview.</p>
      </div>
      <Link href="/onboarding" className="customerPrimaryButton">Review website setup →</Link>
    </section>
    <section className="chOverviewMetrics" aria-label="SEO performance metrics">
      {metrics.map(([label,source])=><article key={label} className="chOverviewCard chOverviewMetric">
        <h2>{label}</h2><strong aria-hidden="true">—</strong>
        <p aria-label={label + " unavailable"}>Not available</p>
        <small>Source: {source}</small>
      </article>)}
    </section>
    <section className="chOverviewCard chOverviewTrend" aria-labelledby="site-trends-title">
      <h2 className="chOverviewSectionTitle" id="site-trends-title">Search performance trend</h2>
      <p>Performance trends appear when verified observations are available.</p>
      <div className="chOverviewEmpty" role="status">◇ &nbsp; Awaiting verified search performance data</div>
    </section>
    <section className="chOverviewWork" aria-labelledby="site-workspace-title">
      <h2 className="chOverviewSectionTitle" id="site-workspace-title">Explore your SEO workspace</h2>
      <div className="chOverviewWorkGrid">
        {sections.map(([label,detail])=><article key={label} className="chOverviewCard chOverviewWorkCard">
          <h3>{label}</h3><p>{detail}</p><small>Awaiting verified evidence</small>
        </article>)}
      </div>
    </section>
    <p className="customerNotice chOverviewNotice">Read-only preview. No crawl, connection, optimization or website write has been initiated.</p>
  </div>;
}

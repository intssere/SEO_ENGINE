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

const overviewStyles = ".chOverview{max-width:1170px;padding:4px 0 28px}.chOverview *{box-sizing:border-box}\n.chOverviewHeader,.chOverviewConnection{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px}\n.chOverviewHeader{margin-bottom:20px}.chOverviewHeader h1{margin:5px 0}.chOverviewHeader p{margin:0}\n.chOverviewCard{background:#fff;border:1px solid #e0e7f1;border-radius:15px;padding:20px;min-width:0}\n.chOverviewConnection{border-left:4px solid #6688f5}.chOverviewConnection h2{font-size:19px}\n.chOverviewConnection .customerPrimaryButton{margin:0}\n.chOverviewStatus{color:#3157aa;font-size:11px;font-weight:750;text-transform:uppercase}\n.chOverviewMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:16px 0}\n.chOverviewMetric strong{display:block;font-size:30px;color:#8390a5;margin:8px 0}\n.chOverviewMetric h2,.chOverviewMetric p{font-size:13px;margin:0}\n.chOverviewSectionTitle{font-size:18px;margin:0 0 12px;font-weight:750}\n.chOverviewEmpty{padding:22px;text-align:center;background:#f9fbff;border:1px dashed #cbd5e1;border-radius:12px}\n.chOverviewWork{margin-top:20px}.chOverviewWorkGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.chOverviewWorkCard{min-height:110px}.chOverviewWorkCard h3{font-size:15px}\n.chOverviewNotice{margin-top:18px}\n@media(max-width:940px){.chOverviewMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:560px){.chOverviewWorkGrid{grid-template-columns:1fr}.chOverviewCard{padding:16px}}\n@media(max-width:340px){.chOverviewMetrics{grid-template-columns:1fr}}";

/** Preview only. The empty-state cards never infer a connected site or fabricate measurements. */
export default function CustomerSiteOverviewPage() {
  return <div className="customerOnboarding chOverview" aria-labelledby="site-overview-title">
    <style>{onboardingStyles}</style><style>{overviewStyles}</style>
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

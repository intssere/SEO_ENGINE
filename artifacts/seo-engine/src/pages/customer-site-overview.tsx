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

const overviewStyles = ".chOverview{max-width:1170px;padding:4px 0 28px;min-width:0}\n.chOverview *{box-sizing:border-box}\n.chOverviewHeader{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin:0 0 20px}\n.chOverviewHeader h1{font-size:clamp(26px,2.8vw,34px);margin:5px 0 7px;line-height:1.18;letter-spacing:-.035em}\n.chOverviewHeader p{margin:0;max-width:690px;font-size:14px}\n.chOverviewHeader .customerBackLink{font-size:13px;padding:8px 0;text-decoration:none}\n.chOverviewCard{background:#fff;border:1px solid #e0e7f1;border-radius:15px;padding:20px 22px;min-width:0;box-shadow:0 2px 8px #182f5310}\n.chOverviewConnection{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;border-left:4px solid #6688f5}\n.chOverviewConnection h2{font-size:19px;margin:6px 0}\n.chOverviewConnection p{margin:3px 0;color:#52627a;font-size:13px}\n.chOverviewConnection .customerPrimaryButton{margin:0;font-size:13px;white-space:normal;text-align:center;text-decoration:none}\n.chOverviewStatus{display:inline-flex;align-items:center;gap:7px;color:#3157aa;font-size:11px;font-weight:750;letter-spacing:.05em;text-transform:uppercase}\n.chOverviewStatus:before{content:\"\";width:7px;height:7px;border-radius:50%;background:#94a9db}\n.chOverviewMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:16px 0}\n.chOverviewMetric{padding:18px 20px;min-height:128px}\n.chOverviewMetric h2{font-size:13px;font-weight:650;color:#50617d;margin:0}\n.chOverviewMetric strong{display:block;font-size:30px;line-height:1.2;color:#8390a5;font-weight:700;margin:9px 0 1px}\n.chOverviewMetric p{font-size:12px;margin:3px 0 0}\n.chOverviewSectionTitle{font-size:18px!important;margin:0 0 12px!important;font-weight:750!important}\n.chOverviewTrend{padding:21px 22px}\n.chOverviewTrend p{font-size:13px;margin:0 0 14px}\n.chOverviewEmpty{min-height:90px;display:flex;align-items:center;justify-content:center;gap:9px;text-align:center;border:1px dashed #cbd5e1;border-radius:12px;background:#f9fbff;color:#667890;font-size:13px;padding:20px}\n.chOverviewWork{margin-top:20px}\n.chOverviewWorkGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.chOverviewWorkCard{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:17px 20px;min-height:118px}\n.chOverviewWorkCard h3{margin:0;font-weight:750;font-size:15px}\n.chOverviewWorkCard p{margin:0;font-size:12px}\n.chOverviewWorkCard small{margin-top:auto;font-size:11px}\n.chOverviewNotice{margin-top:18px!important}\n@media(max-width:940px){.chOverviewMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:560px){.chOverviewHeader{margin-bottom:16px}.chOverviewConnection{align-items:stretch}.chOverviewConnection .customerPrimaryButton{width:100%}.chOverviewMetrics{gap:10px}.chOverviewMetric{padding:15px;min-height:112px}.chOverviewMetric strong{font-size:26px}.chOverviewWorkGrid{grid-template-columns:minmax(0,1fr)}.chOverviewCard{padding:17px}.chOverviewTrend{padding:17px}}\n@media(max-width:340px){.chOverviewMetrics{grid-template-columns:minmax(0,1fr)}}\n";

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

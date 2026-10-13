import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";


export default function CustomerHomePage() {
  const { data, isLoading, isError } = useGetDashboard();
  return <main className="customerHome">
    <header className="customerHomeHero">
      <div>
        <p className="customerHomeEyebrow">YOUR WEBSITE WORKSPACE</p>
        <h1>Website overview</h1>
        <p className="customerHomeLead">Understand what is connected, what evidence is available, and what to do next.</p>
      </div>
      <Link href="/onboarding" className="customerHomePrimary">Website setup</Link>
    </header>
    {isLoading ? <section className="customerHomePanel" role="status">Loading your website data…</section>
    : isError || !data ? <section className="customerHomePanel" role="alert">
        <h2>Website data is unavailable</h2>
        <p>We could not load the current workspace. No metrics or connection status can be confirmed.</p>
        <Link href="/">Open the operational dashboard</Link>
      </section>
    : <>
      <section className="customerHomePanel" aria-labelledby="customer-site-heading">
        <div className="customerHomePanelHeader">
          <div><p className="customerHomeEyebrow">CURRENT WEBSITE</p><h2 id="customer-site-heading">{data.siteName}</h2><p className="customerHomeDomain">{data.domain}</p></div>
          <span className="customerHomeTag">Database-backed workspace</span>
        </div>
        <p className="customerHomeSubtle">Metrics are shown only when they have been collected and verified. A connected workspace does not imply Search Console, analytics, or crawling is active.</p>
      </section>
      <div className="customerHomeGrid">
        <section className="customerHomePanel" aria-labelledby="customer-next-heading">
          <p className="customerHomeEyebrow">NEXT RECOMMENDED STEP</p>
          <h2 id="customer-next-heading">Review data-source readiness</h2>
          <p>Check which integrations are connected before interpreting rankings, crawl coverage, or opportunity counts. No automated analysis is started from this page.</p>
          <Link href="/connections" className="customerHomeTextLink">Review connections →</Link>
        </section>
        <section className="customerHomePanel" aria-labelledby="customer-evidence-heading">
          <p className="customerHomeEyebrow">EVIDENCE & COVERAGE</p>
          <h2 id="customer-evidence-heading">Verify current SEO evidence</h2>
          <p>Check freshness, audit scope, and whether observations support decisions. Missing or incomplete data must not be treated as a healthy site.</p>
          <Link href="/technical-seo" className="customerHomeTextLink">View technical SEO →</Link>
        </section>
        <section className="customerHomePanel" aria-labelledby="customer-opportunities-heading">
          <p className="customerHomeEyebrow">OPPORTUNITIES</p>
          <h2 id="customer-opportunities-heading">Prioritize verified findings</h2>
          <p>Opportunities require persisted evidence. This page does not generate recommendations or authorize website changes.</p>
          <Link href="/opportunities" className="customerHomeTextLink">Explore opportunities →</Link>
        </section>
        <section className="customerHomePanel" aria-labelledby="customer-impact-heading">
          <p className="customerHomeEyebrow">MEASUREMENT</p>
          <h2 id="customer-impact-heading">Track measured outcomes</h2>
          <p>Review performance and attribution only when comparable source data is available.</p>
          <Link href="/performance" className="customerHomeTextLink">View performance →</Link>
        </section>
      </div>
    </>}
    <footer className="customerHomeFooter"><Link href="/">Open existing Command Center</Link></footer>
  </main>;
}

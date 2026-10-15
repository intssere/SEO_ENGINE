import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function CustomerHomePage() {
  const { data, isLoading, isError } = useGetDashboard();
  return <main className="content commandCenter">
    <header className="commandCenterHero"><div>
      <p className="eyebrow">CUSTOMER HOME</p><h1>Website overview</h1>
      <p className="muted">Review your site and verified SEO evidence.</p>
    </div><Link href="/onboarding">Website setup</Link></header>
    {isLoading ? <p role="status">Loading website…</p> :
      isError || !data ? <p role="alert">Website data unavailable.</p> :
      <section className="card"><h2>{data.siteName}</h2><p>{data.domain}</p>
        <p className="muted">Provider data and crawl coverage are not independently verified here.</p>
      </section>}
    <nav className="commandCenterWorkGrid" aria-label="SEO workspaces">
      {[
        ["/connections", "Connections"],
        ["/technical-seo", "Technical SEO"],
        ["/opportunities", "Opportunities"],
        ["/performance", "Performance"],
      ].map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
    </nav>
    <p><Link href="/">Operations Command Center</Link></p>
  </main>;
}

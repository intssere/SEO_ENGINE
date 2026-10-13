import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";

const destinations = [
  ["Connections", "/connections"],
  ["Technical SEO", "/technical-seo"],
  ["Opportunities", "/opportunities"],
  ["Performance", "/performance"],
] as const;

export default function CustomerHomePage() {
  const { data, isLoading, isError } = useGetDashboard();
  return <main className="content commandCenter">
    <header className="commandCenterHero"><div>
      <p className="eyebrow">CUSTOMER HOME · READ ONLY</p>
      <h1>Website overview</h1>
      <p className="muted">Connect your data and review source-backed SEO evidence.</p>
    </div><Link href="/onboarding" className="linkButton">Website setup</Link></header>
    {isLoading ? <p role="status">Loading website evidence…</p> :
    isError || !data ? <div className="card" role="alert">
      <h2>Data unavailable</h2><p>Workspace evidence could not be loaded.</p>
    </div> : <>
      <section className="card"><h2>{data.siteName}</h2><p className="muted">{data.domain}</p>
        <p>Provider connections and crawl coverage require separate verification.</p>
      </section>
      <nav className="commandCenterWorkGrid" aria-label="SEO workspaces">
        {destinations.map(([name, href]) => <Link key={href} href={href} className="card linkButton">{name} →</Link>)}
      </nav>
    </>}
    <p><Link href="/">Operations Command Center</Link></p>
  </main>;
}

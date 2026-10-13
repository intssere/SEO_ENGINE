import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";

const sections = [
  { title: "Data connections", href: "/connections", detail: "Review provider readiness before trusting search metrics." },
  { title: "Technical coverage", href: "/technical-seo", detail: "Inspect crawl evidence and freshness before making decisions." },
  { title: "SEO opportunities", href: "/opportunities", detail: "Prioritize findings backed by persisted evidence." },
  { title: "Measured impact", href: "/performance", detail: "Track outcomes only where comparable observations exist." },
];

export default function CustomerHomePage() {
  const { data, isLoading, isError } = useGetDashboard();
  return <main className="content commandCenter">
    <header className="commandCenterHero">
      <div><p className="eyebrow">CUSTOMER HOME · READ ONLY</p><h1>Website overview</h1>
      <p className="muted">Connect your data, understand SEO evidence and choose your next step.</p></div>
      <Link href="/onboarding" className="linkButton">Website setup</Link>
    </header>
    {isLoading ? <p role="status">Loading website evidence…</p> :
    isError || !data ? <div className="card" role="alert"><h2>Data unavailable</h2>
      <p>Website evidence could not be loaded. No connection or metric is confirmed.</p></div> : <>
      <section className="card" aria-labelledby="customer-site">
        <p className="eyebrow">CURRENT WEBSITE</p><h2 id="customer-site">{data.siteName}</h2>
        <p className="muted">{data.domain}</p>
        <p>Workspace identity is verified independently from Search Console, analytics and crawl coverage.</p>
      </section>
      <div className="commandCenterWorkGrid">
        {sections.map(item => <section className="card" key={item.href}>
          <h2>{item.title}</h2><p className="muted">{item.detail}</p>
          <Link href={item.href} className="linkButton">Open workspace →</Link>
        </section>)}
      </div>
    </>}
    <p><Link href="/">Existing operations Command Center</Link></p>
  </main>;
}

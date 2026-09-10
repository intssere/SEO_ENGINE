const metrics = [
  ["Organic clicks", "42,814", "+14.8%"],
  ["Impressions", "1.84M", "+11.2%"],
  ["Top-10 keywords", "1,286", "+94"],
  ["Organic revenue", "$38,420", "+18.7%"],
  ["AI citation rate", "23.8%", "+4.1 pts"],
  ["SEO health", "91 / 100", "+3"],
];

const opportunities = [
  ["Improve 14 product titles", "+1.8K clicks", "91%", "Low", "Ready"],
  ["Fix internal links to Dior", "+640 clicks", "87%", "Low", "Ready"],
  ["CTR gap: Lattafa collection", "+420 clicks", "84%", "Low", "Ready"],
  ["Merge competing collections", "+310 clicks", "78%", "Medium", "Approval"],
  ["Improve AI citation evidence", "GEO +12%", "72%", "Low", "Experiment"],
];

const activity = [
  ["Verified improvement", "Meta description optimization", "CTR +18.4% after 21 days", "verified"],
  ["Opportunity discovered", "8,420 impressions · Position 8.2", "Estimated +310 clicks/month", "ready"],
  ["Approval required", "Consolidate competing collection pages", "Medium risk", "approval"],
  ["Search intelligence", "Normal operating mode", "No confirmed ranking update", "normal"],
];

const nav = ["Overview", "Opportunities", "Actions", "Approvals · 3", "Performance", "Rankings", "Technical SEO", "Internal Links", "AI Visibility", "Experiments", "Search Intelligence", "Learning", "Deployments", "Impact", "Connections", "Settings"];

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export default function HomePage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">S</span><div><strong>SEO ENGINE</strong><small>AI SEO Command Center</small></div></div>
        <nav>{nav.map((item, index) => <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>)}</nav>
        <div className="sidebarFoot"><span className="statusDot" /> Engine online<br/><small>Guarded autonomy</small></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><strong>Diamond Shelf</strong><span className="muted"> diamondshelf.us</span></div>
          <div className="filters"><button>Last 28 days ▾</button><button>US ▾</button><button>All devices ▾</button><Badge tone="verified">AI Engine Active</Badge><Badge tone="approval">3 approvals</Badge></div>
        </header>

        <div className="content">
          <div className="titleRow"><div><p className="eyebrow">OVERVIEW</p><h1>SEO operations command center</h1><p className="muted">Decisions, actions, verification and measurable impact in one place.</p></div><button className="ask">⌘ K &nbsp; Ask SEO ENGINE</button></div>

          <section className="metricGrid">{metrics.map(([label, value, delta]) => <article className="card metric" key={label}><span>{label}</span><strong>{value}</strong><small className="positive">{delta}</small></article>)}</section>

          <section className="engine card">
            <div className="sectionHead"><div><p className="eyebrow">AI SEO ENGINE · LAST 24 HOURS</p><h2>Engine activity</h2></div><Badge tone="verified">NORMAL OPERATING MODE</Badge></div>
            <div className="engineStats"><div><strong>127</strong><span>Pages analyzed</span></div><div><strong>31</strong><span>Opportunities</span></div><div><strong>14</strong><span>Actions prepared</span></div><div><strong>8</strong><span>Executed</span></div><div><strong>8</strong><span>Verified</span></div><div><strong>0</strong><span>Regressions</span></div></div>
          </section>

          <div className="twoCol">
            <section className="card">
              <div className="sectionHead"><div><p className="eyebrow">DECISION QUEUE</p><h2>Top opportunities</h2></div><button className="linkButton">View all →</button></div>
              <div className="tableWrap"><table><thead><tr><th>Opportunity</th><th>Impact</th><th>Confidence</th><th>Risk</th><th>State</th></tr></thead><tbody>{opportunities.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={cell}>{i === 4 ? <Badge tone={cell === "Approval" ? "approval" : cell === "Experiment" ? "experiment" : "verified"}>{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
            </section>

            <section className="card activity">
              <div className="sectionHead"><div><p className="eyebrow">TRACEABLE AI</p><h2>What changed</h2></div></div>
              {activity.map(([title, detail, result, tone]) => <div className="activityItem" key={title}><span className={`activityDot ${tone}`} /><div><strong>{title}</strong><p>{detail}</p><small>{result}</small></div><span>›</span></div>)}
            </section>
          </div>

          <div className="threeCol">
            <section className="card"><p className="eyebrow">VERIFICATION</p><h2>Changes & proof</h2><div className="bigStat">39 <span>/ 42 verified</span></div><div className="progress"><i style={{width:"93%"}} /></div><p className="muted">2 pending · 1 rolled back · 0 unresolved regressions</p><button className="linkButton">View deployment proof →</button></section>
            <section className="card"><p className="eyebrow">AI VISIBILITY</p><h2>Generative search</h2><div className="splitStats"><div><strong>23.8%</strong><span>Citation rate</span></div><div><strong>31.4%</strong><span>Brand mentions</span></div><div><strong>18.7%</strong><span>Share of voice</span></div></div><p className="muted">Competitor citation gaps are being measured separately from mentions.</p></section>
            <section className="card"><p className="eyebrow">LEARNING ENGINE</p><h2>Evidence becoming signal</h2><div className="learning"><strong>Meta-title optimization</strong><Badge tone="verified">1.14× priority</Badge></div><p>12 experiments · 9 positive · 2 neutral · 1 negative</p><p className="muted">Confidence 88%. Learning adjusts prioritization only; official policy remains authoritative.</p></section>
          </div>

          <section className="impact card"><div><p className="eyebrow">VERIFIED IMPACT · 90 DAYS</p><h2>What SEO ENGINE has accomplished</h2></div><div className="impactStats"><div><strong>+18,420</strong><span>Incremental clicks</span></div><div><strong>+$12,840</strong><span>Attributed revenue</span></div><div><strong>126</strong><span>Verified optimizations</span></div><div><strong>19</strong><span>Successful experiments</span></div><div><strong>7</strong><span>Regressions prevented</span></div></div></section>
        </div>
      </section>
    </main>
  );
}

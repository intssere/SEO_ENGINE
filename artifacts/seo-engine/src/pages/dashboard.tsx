import { useGetDashboard } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";

const nav = [
  "Overview", "Opportunities", "Actions", "Approvals", "Performance", 
  "Rankings", "Technical SEO", "Internal Links", "AI Visibility", 
  "Experiments", "Search Intelligence", "Learning", "Deployments", 
  "Impact", "Connections", "Settings"
];

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function riskTone(risk: string) {
  if (risk === "approval") return "approval";
  if (risk === "blocked") return "experiment";
  return "verified";
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetDashboard();

  if (isLoading) {
    return (
      <main className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brandMark">S</span>
            <div>
              <strong>SEO ENGINE</strong>
              <small>AI SEO Command Center</small>
            </div>
          </div>
          <nav>
            {nav.map((item, index) => (
              <a
                key={item}
                href="#"
                onClick={(event) => event.preventDefault()}
                className={index === 0 ? "active" : ""}
                aria-disabled="true"
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="workspace flex items-center justify-center min-h-screen bg-[#f5f7fb]">
          <div className="flex flex-col items-center gap-4 text-[#77839a]">
            <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6]" />
            <p className="font-medium text-sm">Connecting to SEO Engine...</p>
          </div>
        </section>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brandMark">S</span>
            <div>
              <strong>SEO ENGINE</strong>
              <small>AI SEO Command Center</small>
            </div>
          </div>
        </aside>

        <section className="workspace flex items-center justify-center min-h-screen bg-[#f5f7fb]">
          <div className="flex flex-col items-center gap-4 text-destructive">
            <AlertCircle className="w-10 h-10" />
            <p className="font-medium">Failed to load dashboard data. Ensure the API server is running.</p>
          </div>
        </section>
      </main>
    );
  }

  const verificationPct = data.verification.total > 0 
    ? Math.round((data.verification.verified / data.verification.total) * 100) 
    : 0;
  
  const updatedLabel = data.state === "live" ? `Updated ${data.dataFreshness}` : "Live data unavailable";

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">S</span>
          <div>
            <strong>SEO ENGINE</strong>
            <small>AI SEO Command Center</small>
          </div>
        </div>
        <nav>
          {nav.map((item, index) => (
            <a
              key={item}
              href="#"
              className={index === 0 ? "active" : ""}
              onClick={(event) => event.preventDefault()}
              aria-disabled="true"
            >
              {item}
              {item === "Approvals" && data.approvalsPending > 0 ? ` · ${data.approvalsPending}` : ""}
            </a>
          ))}
        </nav>
        <div className="sidebarFoot">
          <span className={`statusDot ${data.state === "live" ? "" : "offline"}`} /> 
          {data.state === "live" ? "Engine online" : "Data unavailable"}
          <br/>
          <small>Guarded autonomy</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <strong>{data.siteName}</strong>
            <span className="muted"> {data.domain}</span>
          </div>
          <div className="filters">
            <button>Last 28 days ▾</button>
            <button>US ▾</button>
            <button>All devices ▾</button>
            <Badge tone={data.state === "live" ? "verified" : "approval"}>
              {data.state === "live" ? "LIVE DATA" : "DATA UNAVAILABLE"}
            </Badge>
            {data.approvalsPending > 0 && (
              <Badge tone="approval">{data.approvalsPending} approvals</Badge>
            )}
          </div>
        </header>

        <div className="content">
          <div className={`dataBanner ${data.state === "live" ? (data.stale ? "stale" : "live") : "unavailable"}`}>
            <strong>
              {data.state === "live" 
                ? (data.stale ? "Live database connected · data may be stale" : "Live database connected") 
                : "No production metrics are being shown"}
            </strong>
            <span>{data.state === "live" ? updatedLabel : data.reason}</span>
          </div>

          <div className="titleRow">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1>SEO operations command center</h1>
              <p className="muted">Persisted evidence, decisions, actions and verification. Demo fixtures are disabled.</p>
            </div>
            <button className="ask">⌘ K &nbsp; Ask SEO ENGINE</button>
          </div>

          <section className="metricGrid">
            {data.metrics.map((metric) => (
              <article className="card metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small className={data.state === "live" ? "positive" : "muted"}>{metric.delta}</small>
              </article>
            ))}
          </section>

          <section className="engine card">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">AI SEO ENGINE · LAST 24 HOURS</p>
                <h2>Engine activity</h2>
              </div>
              <Badge tone={data.state === "live" ? "verified" : "approval"}>
                {data.state === "live" ? "DATABASE-BACKED" : "NO LIVE DATA"}
              </Badge>
            </div>
            <div className="engineStats">
              <div>
                <strong>{data.engine.pagesAnalyzed}</strong>
                <span>Pages analyzed</span>
              </div>
              <div>
                <strong>{data.engine.opportunities}</strong>
                <span>Opportunities</span>
              </div>
              <div>
                <strong>{data.engine.actionsPrepared}</strong>
                <span>Actions prepared</span>
              </div>
              <div>
                <strong>{data.engine.executed}</strong>
                <span>Executed</span>
              </div>
              <div>
                <strong>{data.engine.verified}</strong>
                <span>Verified</span>
              </div>
              <div>
                <strong>{data.engine.regressions}</strong>
                <span>Regressions</span>
              </div>
            </div>
          </section>

          <div className="twoCol">
            <section className="card">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">DECISION QUEUE</p>
                  <h2>Top opportunities</h2>
                </div>
                <button className="linkButton">View all →</button>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Opportunity</th>
                      <th>Score</th>
                      <th>Evidence</th>
                      <th>Risk</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.opportunities.length > 0 ? (
                      data.opportunities.map((row) => (
                        <tr key={`${row.title}-${row.score}`}>
                          <td>{row.title}</td>
                          <td>{row.score}</td>
                          <td>{row.evidence}</td>
                          <td><Badge tone={riskTone(row.risk)}>{row.risk}</Badge></td>
                          <td>{row.state}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="emptyCell">No persisted opportunities available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card activity">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">TRACEABLE AI</p>
                  <h2>What changed</h2>
                </div>
              </div>
              {data.activity.length > 0 ? (
                data.activity.map((item) => (
                  <div className="activityItem" key={`${item.title}-${item.detail}`}>
                    <span className={`activityDot ${item.tone}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <small>{item.result}</small>
                    </div>
                    <span className="text-[#dce2eb] font-bold">›</span>
                  </div>
                ))
              ) : (
                <p className="muted mt-4">No live activity available.</p>
              )}
            </section>
          </div>

          <div className="threeCol">
            <section className="card">
              <p className="eyebrow">VERIFICATION</p>
              <h2>Changes & proof</h2>
              <div className="bigStat">
                {data.verification.verified} <span>/ {data.verification.total} verified</span>
              </div>
              <div className="progress">
                <i style={{ width: `${verificationPct}%` }} />
              </div>
              <p className="muted">
                {data.verification.pending} pending · {data.verification.rolledBack} rolled back · {data.verification.regressions} regressions
              </p>
              <button className="linkButton mt-3">View deployment proof →</button>
            </section>
            
            <section className="card">
              <p className="eyebrow">AI VISIBILITY</p>
              <h2>Generative search</h2>
              <div className="splitStats">
                <div>
                  <strong>{data.aiVisibility.citationRate}</strong>
                  <span>Citation rate</span>
                </div>
                <div>
                  <strong>{data.aiVisibility.brandMentionRate}</strong>
                  <span>Brand mentions</span>
                </div>
                <div>
                  <strong>{data.aiVisibility.citationShare}</strong>
                  <span>Citation share</span>
                </div>
              </div>
              <p className="muted">Computed only from persisted AI-response and citation observations.</p>
            </section>
            
            <section className="card">
              <p className="eyebrow">LEARNING ENGINE</p>
              <h2>Evidence becoming signal</h2>
              <div className="learning">
                <strong>{data.learning.signalCount} persisted signals</strong>
                <Badge tone="verified">{data.learning.averageConfidence} avg confidence</Badge>
              </div>
              <p className="muted mt-4">Learning adjusts prioritization only; official policy and safety remain authoritative.</p>
            </section>
          </div>

          <section className="impact card">
            <div>
              <p className="eyebrow">VERIFIED IMPACT</p>
              <h2>Persisted operational outcomes</h2>
            </div>
            <div className="impactStats">
              <div>
                <strong>{data.impact.verifiedOptimizations}</strong>
                <span>Verified optimizations</span>
              </div>
              <div>
                <strong>{data.impact.completedExperiments}</strong>
                <span>Completed experiments</span>
              </div>
              <div>
                <strong>{data.impact.rollbacks}</strong>
                <span>Completed rollbacks</span>
              </div>
              <div>
                <strong>{data.impact.regressionsDetected}</strong>
                <span>Regressions detected</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

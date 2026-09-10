import { useGetDashboard, GetDashboardDays, GetDashboardDevice } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import { Badge, riskTone, useAskModal } from "../components/layout";

export default function DashboardPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);

  const daysParam = Number(searchParams.get("days"));
  const days = Object.values(GetDashboardDays).includes(daysParam as any)
    ? (daysParam as GetDashboardDays)
    : GetDashboardDays.NUMBER_28;

  const deviceParam = searchParams.get("device");
  const device = Object.values(GetDashboardDevice).includes(deviceParam as any)
    ? (deviceParam as GetDashboardDevice)
    : GetDashboardDevice.all;

  const country = searchParams.get("country") || "";

  const { data, isLoading, isError } = useGetDashboard({
    days,
    device,
    ...(country ? { country } : {})
  });

  const openAskModal = useAskModal();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchString);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setLocation("?" + params.toString(), { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-66px)] bg-[#f5f7fb]">
        <div className="flex flex-col items-center gap-4 text-[#77839a]">
          <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6]" />
          <p className="font-medium text-sm">Connecting to SEO Engine...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-66px)] bg-[#f5f7fb]">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-10 h-10" />
          <p className="font-medium">Failed to load dashboard data. Ensure the API server is running.</p>
        </div>
      </div>
    );
  }

  const verificationPct = data.verification.total > 0 
    ? Math.round((data.verification.verified / data.verification.total) * 100) 
    : 0;
  
  const updatedLabel = data.state === "live" ? `Updated ${data.dataFreshness}` : "Live data unavailable";

  return (
    <>
      <header className="topbar">
        <div>
          <strong>{data.siteName}</strong>
          <span className="muted"> {data.domain}</span>
        </div>
        <div className="filters">
          <select
            className="border border-[#dce2eb] rounded-md px-2 py-1 text-sm bg-white text-[#536078]"
            value={days}
            onChange={(e) => updateParam("days", e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="28">Last 28 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <select
            className="border border-[#dce2eb] rounded-md px-2 py-1 text-sm bg-white text-[#536078]"
            value={country}
            onChange={(e) => updateParam("country", e.target.value)}
          >
            <option value="">All</option>
            <option value="US">US</option>
            <option value="GB">GB</option>
            <option value="CA">Canada</option>
          </select>
          <select
            className="border border-[#dce2eb] rounded-md px-2 py-1 text-sm bg-white text-[#536078]"
            value={device}
            onChange={(e) => updateParam("device", e.target.value)}
          >
            <option value="all">All devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
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
          <button className="ask" onClick={() => openAskModal(true)}>
            ⌘ K &nbsp; Ask SEO ENGINE
          </button>
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
              <Link href="/opportunities" className="linkButton">View all →</Link>
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
            <Link href="/deployments" className="linkButton mt-3">View deployment proof →</Link>
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
    </>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDashboard, GetDashboardDays, GetDashboardDevice, getPilotAuthorization, startPilotRun, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Loader2, AlertCircle, RefreshCw, Play } from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import { Badge, riskTone, useAskModal } from "../components/layout";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isStartingPilot, setIsStartingPilot] = useState(false);
  const [pilotActionError, setPilotActionError] = useState<string | null>(null);
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

  const dashboardParams = {
    days,
    device,
    ...(country ? { country } : {})
  };
  const { data, isLoading, isError } = useGetDashboard(dashboardParams, {
    query: {
      queryKey: getGetDashboardQueryKey(dashboardParams),
      refetchInterval: (query) => ["queued", "running"].includes(query.state.data?.pilot.status ?? "") ? 2000 : 30000,
    },
  });

  const openAskModal = useAskModal();
  const startBaseline = async () => {
    setIsStartingPilot(true);
    setPilotActionError(null);
    try {
      const capability = await getPilotAuthorization();
      await startPilotRun({ headers: { "x-pilot-authorization": capability.authorization } });
      await queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(dashboardParams) });
    } catch {
      setPilotActionError("The read-only baseline could not start. Check connection readiness and try again.");
    } finally {
      setIsStartingPilot(false);
    }
  };

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
            <option value="USA">US</option>
            <option value="GBR">GB</option>
            <option value="CAN">Canada</option>
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

        <section className="pilotStatus card">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">READ-ONLY PILOT</p>
              <h2>Ingestion and baseline readiness</h2>
            </div>
            <div className="pilotActions">
              <Badge tone={data.pilot.readiness === "ready" ? "verified" : ["failed", "partial"].includes(data.pilot.status) ? "approval" : "ready"}>
                {data.pilot.status.replaceAll("_", " ").toUpperCase()}
              </Badge>
              <button
                className="pilotRunButton"
                type="button"
                onClick={startBaseline}
                disabled={isStartingPilot || ["queued", "running"].includes(data.pilot.status)}
              >
                {isStartingPilot || ["queued", "running"].includes(data.pilot.status)
                  ? <Loader2 className="pilotButtonIcon animate-spin" />
                  : data.pilot.status === "not_started"
                    ? <Play className="pilotButtonIcon" />
                    : <RefreshCw className="pilotButtonIcon" />}
                {isStartingPilot
                  ? "Starting…"
                  : data.pilot.status === "queued"
                    ? "Queued"
                    : data.pilot.status === "running"
                      ? "Running…"
                      : data.pilot.status === "not_started"
                        ? "Run Baseline"
                        : "Refresh Data"}
              </button>
            </div>
          </div>
          <div className="pilotGrid">
            <div>
              <strong>{data.pilot.counts.catalogProducts || "—"}</strong>
              <span>Shopify catalog total</span>
              <small>{data.pilot.counts.productsObserved} observed{data.pilot.counts.shopifyComplete ? " · complete" : " · bounded/incomplete"}</small>
            </div>
            <div>
              <strong>{data.pilot.counts.gscDetailedRows}</strong>
              <span>Detailed GSC rows</span>
              <small>
                {data.pilot.diagnostics.gscAggregate.status === "available"
                  ? `Aggregate available · ${data.pilot.certification.gscAggregate.reconciliation.status.replaceAll("_", " ")}`
                  : `Aggregate failed · ${(data.pilot.diagnostics.gscAggregate.category ?? "not evaluated").replaceAll("_", " ")}`}
              </small>
            </div>
            <div>
              <strong>{data.pilot.counts.ga4Rows}</strong>
              <span>GA4 rows</span>
              <small>
                {data.pilot.diagnostics.ga4.status === "failed"
                  ? `Failed · ${(data.pilot.diagnostics.ga4.category ?? "unknown").replaceAll("_", " ")}${data.pilot.diagnostics.ga4.httpStatus ? ` (${data.pilot.diagnostics.ga4.httpStatus})` : ""}`
                  : data.pilot.diagnostics.ga4.status === "empty"
                    ? "Successful query · no rows"
                    : "Available"}
              </small>
            </div>
            <div><strong>{data.pilot.counts.pages}</strong><span>Pages crawled</span></div>
          </div>
          <p className="muted mt-4">
            Phase: {data.pilot.phase.replaceAll("_", " ")} · Readiness: {data.pilot.readiness.replaceAll("_", " ")}
            {data.pilot.freshness ? ` · Fresh ${data.pilot.freshness}` : ""}
          </p>
          {data.pilot.blockers.length > 0 && (
            <p className="pilotBlockers">Blocked: {data.pilot.blockers.map((item) => item.replaceAll("_", " ")).join(", ")}</p>
          )}
          <div className="certificationPanel">
            <div className="certificationHead">
              <div>
                <p className="eyebrow">PRODUCTION BASELINE CERTIFICATION</p>
                <h3>{data.pilot.certification.status === "pilot_ready" ? "PILOT_READY" : data.pilot.certification.status.replaceAll("_", " ").toUpperCase()}</h3>
              </div>
              <Badge tone={data.pilot.certification.status === "pilot_ready" ? "verified" : "approval"}>
                {data.pilot.certification.wholeSiteCertified ? "WHOLE SITE CERTIFIED" : "BOUNDED PILOT ONLY"}
              </Badge>
            </div>
            <div className="certificationGrid">
              <div>
                <strong>{data.pilot.certification.crawlCoverage.percent.toFixed(1)}%</strong>
                <span>Crawl coverage</span>
                <small>{data.pilot.certification.crawlCoverage.fetched} fetched of {data.pilot.certification.crawlCoverage.discovered} discovered · cap {data.pilot.certification.crawlCoverage.boundedLimit}</small>
              </div>
              <div>
                <strong>{data.pilot.certification.technicalFindings.withValidEvidence}/{data.pilot.certification.technicalFindings.total}</strong>
                <span>Findings with valid source evidence</span>
                <small>{data.pilot.certification.technicalFindings.valid ? "Evidence integrity passed" : "Evidence integrity incomplete"}</small>
              </div>
              <div>
                <strong>{data.pilot.certification.gscAggregate.metrics ? `${(data.pilot.certification.gscAggregate.metrics.ctr * 100).toFixed(1)}%` : "—"}</strong>
                <span>Property-level GSC CTR</span>
                <small>{data.pilot.certification.gscAggregate.status === "available" ? "Not derived from detailed rows" : "Aggregate unavailable"}</small>
              </div>
            </div>
            <p className="certificationNote">Whole-site certification is withheld because this validation crawl is intentionally bounded to 30 pages.</p>
          </div>
          {pilotActionError && <p className="pilotBlockers" role="alert">{pilotActionError}</p>}
        </section>

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
              <strong>{data.engine.activeCandidatesRefreshed}</strong>
              <span>Candidates refreshed</span>
            </div>
            <div>
              <strong>{data.engine.dryRunPlansPrepared}</strong>
              <span>Blocked dry-run plans</span>
            </div>
            <div>
              <strong>{data.engine.executableActionsPrepared}</strong>
              <span>Executable actions</span>
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
                      <tr key={`${row.title}-${row.page}`}>
                        <td>
                          <div className="opportunityIdentity">
                            <strong>{row.title}</strong>
                            <small>{row.page}</small>
                          </div>
                        </td>
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

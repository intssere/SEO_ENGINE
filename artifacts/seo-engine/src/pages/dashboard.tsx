import {
  useGetDashboard,
  GetDashboardDays,
  GetDashboardDevice,
} from "@workspace/api-client-react";
import {
  Activity,
  AlertCircle,
  Database,
  Gauge,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { StatusBadge } from "../components/status-badge";
import { riskTone } from "@/lib/status-grammar";
import { buildCommandCenterModel } from "@/lib/command-center-model";

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
  const dashboardParams = {
    days,
    device,
    ...(country ? { country } : {}),
  };

  const { data, isLoading, isError } = useGetDashboard(dashboardParams, {
    query: {
      refetchInterval: (query) =>
        ["queued", "running"].includes(query.state.data?.pilot.status ?? "")
          ? 2000
          : 30000,
    },
  });

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchString);
    if (value) params.set(key, value);
    else params.delete(key);
    setLocation("?" + params.toString(), { replace: true });
  };

  if (isLoading) {
    return (
      <div className="commandCenterLoading">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p>Loading Command Center snapshot…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="commandCenterLoading commandCenterLoading--error">
        <AlertCircle className="w-9 h-9" />
        <p>Command Center data could not be loaded.</p>
      </div>
    );
  }

  const model = buildCommandCenterModel(data);
  const dataBannerClass =
    model.dataState.tone === "success"
      ? "live"
      : model.dataState.tone === "warning"
        ? "stale"
        : "unavailable";

  return (
    <>
      <header className="topbar">
        <div>
          <strong>{data.siteName}</strong>
          <span className="muted"> {data.domain}</span>
        </div>
        <div className="filters commandCenterFilters">
          <label>
            <span className="sr-only">Reporting window</span>
            <select
              value={days}
              aria-label="Reporting window"
              onChange={(event) => updateParam("days", event.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="28">Last 28 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Country</span>
            <select
              value={country}
              aria-label="Country"
              onChange={(event) => updateParam("country", event.target.value)}
            >
              <option value="">All countries</option>
              <option value="USA">US</option>
              <option value="GBR">GB</option>
              <option value="CAN">Canada</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Device</span>
            <select
              value={device}
              aria-label="Device"
              onChange={(event) => updateParam("device", event.target.value)}
            >
              <option value="all">All devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </label>
        </div>
      </header>

      <main className="content commandCenter">
        <div className="commandCenterHero">
          <div>
            <p className="eyebrow">COMMAND CENTER</p>
            <h1>SEO operations overview</h1>
            <p className="muted">
              Read-only operational truth from the current dashboard snapshot.
              Provider execution, approvals, deployments and writes happen in
              their governed workspaces—not here.
            </p>
          </div>
          <div className="commandCenterHeroBadges">
            <StatusBadge tone={model.dataState.tone}>
              {model.dataState.label.toUpperCase()}
            </StatusBadge>
            <StatusBadge tone={model.coverageState.tone}>
              {model.coverageState.label.toUpperCase()}
            </StatusBadge>
          </div>
        </div>

        <div className={`dataBanner ${dataBannerClass}`}>
          <strong>{model.dataState.label}</strong>
          <span>{model.dataState.detail}</span>
        </div>

        <section
          className="commandCenterStatusGrid"
          aria-label="Command Center operational states"
        >
          {model.cards.map((card) => (
            <article className="card commandCenterStatusCard" key={card.id}>
              <div className="commandCenterStatusHead">
                <span>{card.label}</span>
                <StatusBadge tone={card.tone}>
                  {card.tone.toUpperCase()}
                </StatusBadge>
              </div>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
              <Link href={card.href} className="linkButton">
                {card.linkLabel} →
              </Link>
            </article>
          ))}
        </section>

        <section className="commandCenterSnapshotGrid">
          <article className="card commandCenterMetrics">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">PERFORMANCE SNAPSHOT</p>
                <h2>Current KPI view</h2>
              </div>
              <StatusBadge tone={model.dataState.tone}>
                {data.state === "live" ? "SNAPSHOT" : "UNAVAILABLE"}
              </StatusBadge>
            </div>
            <div className="commandCenterMetricGrid">
              {data.metrics.map((metric) => (
                <div className="commandCenterMetric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.delta}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="card commandCenterCoverage">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">BASELINE TRUTH</p>
                <h2>Coverage & certification</h2>
              </div>
              <StatusBadge tone={model.coverageState.tone}>
                {data.pilot.certification.status.replaceAll("_", " ").toUpperCase()}
              </StatusBadge>
            </div>

            <div className="commandCenterCoverageFacts">
              <div>
                <strong>
                  {data.pilot.certification.crawlCoverage.percent.toFixed(1)}%
                </strong>
                <span>Crawl coverage</span>
                <small>
                  {data.pilot.certification.crawlCoverage.fetched} of{" "}
                  {data.pilot.certification.crawlCoverage.discovered} discovered
                </small>
              </div>
              <div>
                <strong>
                  {data.pilot.certification.technicalFindings.withValidEvidence}/
                  {data.pilot.certification.technicalFindings.total}
                </strong>
                <span>Evidence-valid findings</span>
                <small>
                  {data.pilot.certification.technicalFindings.valid
                    ? "Source evidence integrity passed"
                    : "Evidence integrity incomplete"}
                </small>
              </div>
              <div>
                <strong>{data.pilot.counts.pages}</strong>
                <span>Pages in current baseline</span>
                <small>
                  Bounded limit{" "}
                  {data.pilot.certification.crawlCoverage.boundedLimit}
                </small>
              </div>
              <div>
                <strong>
                  {data.pilot.certification.gscAggregate.metrics
                    ? `${(
                        data.pilot.certification.gscAggregate.metrics.ctr * 100
                      ).toFixed(1)}%`
                    : "—"}
                </strong>
                <span>Property-level GSC CTR</span>
                <small>
                  {data.pilot.certification.gscAggregate.status === "available"
                    ? "Aggregate metric"
                    : "Aggregate unavailable"}
                </small>
              </div>
            </div>

            <div className="commandCenterCoverageNote">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>{model.coverageState.detail}</span>
            </div>

            {data.pilot.blockers.length > 0 ? (
              <div className="commandCenterBlockers">
                <strong>Current blockers</strong>
                <span>
                  {data.pilot.blockers
                    .map((item) => item.replaceAll("_", " "))
                    .join(" · ")}
                </span>
              </div>
            ) : null}

            <div className="commandCenterLinks">
              <Link href="/connections" className="linkButton">
                Review connections →
              </Link>
              <Link href="/technical-seo" className="linkButton">
                Review technical evidence →
              </Link>
            </div>
          </article>
        </section>

        <section className="card commandCenterEngine">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">OPERATIONS · LAST 24 HOURS</p>
              <h2>Engine workload</h2>
              <p className="muted">
                Descriptive counts only. No execution is initiated from Command
                Center.
              </p>
            </div>
            <StatusBadge tone={model.dataState.tone}>
              {data.state === "live" ? "DATABASE-BACKED" : "NO LIVE DATA"}
            </StatusBadge>
          </div>
          <div className="commandCenterEngineGrid">
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

        <section className="commandCenterWorkGrid">
          <article className="card">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">DECISION QUEUE</p>
                <h2>Top opportunities</h2>
              </div>
              <Link href="/opportunities" className="linkButton">
                View all →
              </Link>
            </div>

            {data.opportunities.length > 0 ? (
              <div className="commandCenterOpportunityList">
                {data.opportunities.map((row) => (
                  <div
                    className="commandCenterOpportunity"
                    key={`${row.title}-${row.page}`}
                  >
                    <div>
                      <strong>{row.title}</strong>
                      <small>{row.page}</small>
                    </div>
                    <div className="commandCenterOpportunityMeta">
                      <span>Score {row.score}</span>
                      <span>{row.evidence}</span>
                      <StatusBadge tone={riskTone(row.risk)}>
                        {row.risk.toUpperCase()}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="commandCenterEmpty">
                No active persisted opportunities are available.
              </p>
            )}
          </article>

          <article className="card">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">OPERATIONS LOG</p>
                <h2>What changed</h2>
              </div>
              <Activity className="w-4 h-4 commandCenterSectionIcon" aria-hidden="true" />
            </div>

            {data.activity.length > 0 ? (
              <div className="commandCenterActivityList">
                {data.activity.map((item) => (
                  <div
                    className="commandCenterActivity"
                    key={`${item.title}-${item.detail}`}
                  >
                    <span className={`activityDot ${item.tone}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <small>{item.result}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="commandCenterEmpty">No operational events available.</p>
            )}
          </article>
        </section>

        <section className="commandCenterOutcomeGrid">
          <article className="card commandCenterOutcomeCard">
            <div className="commandCenterOutcomeIcon">
              <ShieldCheck aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">VERIFICATION</p>
              <h2>Changes & proof</h2>
              <strong className="commandCenterOutcomeValue">
                {data.verification.verified}/{data.verification.total}
              </strong>
              <span className="muted"> verified</span>
              <div
                className="progress"
                role="progressbar"
                aria-label="Verification completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={model.verificationPercent}
              >
                <i style={{ width: `${model.verificationPercent}%` }} />
              </div>
              <p className="muted">
                {data.verification.pending} pending ·{" "}
                {data.verification.rolledBack} rolled back ·{" "}
                {data.verification.regressions} regressions
              </p>
              <Link href="/deployments" className="linkButton">
                View deployment proof →
              </Link>
            </div>
          </article>

          <article className="card commandCenterOutcomeCard">
            <div className="commandCenterOutcomeIcon">
              <Gauge aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">MEASUREMENT</p>
              <h2>Persisted impact</h2>
              <strong className="commandCenterOutcomeValue">
                {data.impact.verifiedOptimizations}
              </strong>
              <span className="muted"> verified optimizations</span>
              <p className="muted">
                {data.impact.completedExperiments} experiments ·{" "}
                {data.impact.rollbacks} rollbacks ·{" "}
                {data.impact.regressionsDetected} regressions
              </p>
              <Link href="/impact" className="linkButton">
                Open impact workspace →
              </Link>
            </div>
          </article>

          <article className="card commandCenterOutcomeCard">
            <div className="commandCenterOutcomeIcon">
              <Database aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">AI & LEARNING</p>
              <h2>Persisted signals</h2>
              <strong className="commandCenterOutcomeValue">
                {data.learning.signalCount}
              </strong>
              <span className="muted"> learning signals</span>
              <p className="muted">
                {model.hasAiVisibility
                  ? `AI visibility: ${data.aiVisibility.citationRate} citation rate`
                  : "AI visibility observations unavailable"}
                {" · "}
                {model.hasLearningSignals
                  ? `${data.learning.averageConfidence} average confidence`
                  : "learning confidence unavailable"}
              </p>
              <Link
                href={model.hasAiVisibility ? "/ai-visibility" : "/learning"}
                className="linkButton"
              >
                {model.hasAiVisibility
                  ? "Review AI visibility →"
                  : "Review learning status →"}
              </Link>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}

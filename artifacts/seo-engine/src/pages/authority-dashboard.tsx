import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Link2, Loader2, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "../components/operational-table";
import { StatusBadge } from "../components/status-badge";

type TrendMetric = {
  current: number;
  previous: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "unavailable";
};

type AuthorityProjection = {
  targetDomain: string;
  generatedFromObservedAt: string;
  provider: {
    providerKey: string;
    providerDataset: string;
    authorityMetricKey: string | null;
    authorityMetricMin: number | null;
    authorityMetricMax: number | null;
    authorityCrossProviderComparable: false;
  };
  summary: {
    backlinkCount: number;
    activeBacklinkCount: number;
    normalizedLostBacklinkCount: number;
    providerReportedLostBacklinkCount: number;
    providerReportedNewBacklinkCount: number;
    referringDomainCount: number;
    activeReferringDomainCount: number;
    linkedPageCount: number;
    anchorCount: number;
  };
  trend: {
    backlinks: TrendMetric;
    referringDomains: TrendMetric;
    activeBacklinks: TrendMetric;
    providerReportedNewBacklinks: TrendMetric;
    providerReportedLostBacklinks: TrendMetric;
  };
  referringDomains: Array<{
    domain: string;
    backlinkCount: number;
    activeBacklinkCount: number;
    providerReportedLostBacklinkCount: number;
    providerReportedNewBacklinkCount: number;
    providerAuthority: number | null;
    providerAuthorityMetricKey: string | null;
    lastSeenAt: string | null;
  }>;
  linkedPages: Array<{
    targetUrl: string;
    backlinkCount: number;
    referringDomainCount: number;
    providerReportedLostBacklinkCount: number;
    providerReportedNewBacklinkCount: number;
  }>;
  anchors: Array<{
    anchorText: string;
    backlinkCount: number;
    referringDomainCount: number;
    share: number;
  }>;
  competitorGaps: Array<{
    referringDomain: string;
    classification: string;
    competitorPresenceCount: number;
    competitorCoverageRatio: number;
    providerAuthority: number | null;
    competitorDomains: string[];
  }>;
  limitations: string[];
};

type AuthorityDashboardResponse = {
  state: "available" | "partial" | "unavailable";
  reason: string | null;
  readiness: {
    evidence: "available" | "unavailable";
    trend: "available" | "unavailable";
    competitorGap: "available" | "unavailable";
    observedAt: string | null;
    providerKey: string | null;
    providerDataset: string | null;
  };
  projection: AuthorityProjection | null;
};

async function loadAuthorityDashboard(): Promise<AuthorityDashboardResponse> {
  const response = await fetch("/api/authority/dashboard", {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("authority_dashboard_request_failed");
  return response.json();
}

const number = (value: number) => value.toLocaleString();
const percent = (value: number) => (value * 100).toFixed(1) + "%";

function Trend({ metric }: { metric: TrendMetric }) {
  if (metric.previous === null || metric.delta === null) {
    return <span className="muted">No prior snapshot</span>;
  }
  const Icon = metric.direction === "down" ? TrendingDown : TrendingUp;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      {metric.direction !== "flat" && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      {metric.delta > 0 ? "+" : ""}{metric.delta.toLocaleString()}
    </span>
  );
}

function EmptyState({ reason }: { reason: string | null }) {
  return (
    <section className="card p-10 text-center">
      <Link2 className="w-10 h-10 mx-auto mb-4 text-[#647087]" aria-hidden="true" />
      <h2 className="text-lg font-semibold">Authority evidence is not available yet</h2>
      <p className="muted mt-2 max-w-2xl mx-auto">
        {reason ?? "No normalized backlink evidence snapshot is available."}
      </p>
      <div className="mt-5">
        <StatusBadge tone="neutral">NO SYNTHETIC FALLBACK</StatusBadge>
      </div>
    </section>
  );
}

export default function AuthorityDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/authority/dashboard"],
    queryFn: loadAuthorityDashboard,
    retry: 1,
  });

  const projection = data?.projection ?? null;

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Authority</strong>
          <span className="muted"> Backlink intelligence</span>
        </div>
        {data && (
          <StatusBadge tone={data.state === "available" ? "success" : data.state === "partial" ? "warning" : "neutral"}>
            {data.state.toUpperCase()}
          </StatusBadge>
        )}
      </header>

      <div className="content">
        <PageHeader
          eyebrow="AUTHORITY & LINKS"
          title="Authority dashboard"
          description="Provider-backed backlink evidence with transparent lineage, trend availability, and competitor-gap coverage."
          readiness={data?.readiness}
        />

        {isLoading ? (
          <div className="card flex flex-col items-center justify-center p-12 text-[#647087]" role="status">
            <Loader2 className="w-8 h-8 animate-spin mb-4" aria-hidden="true" />
            <p className="font-medium text-sm">Loading authority evidence...</p>
          </div>
        ) : isError || !data ? (
          <div className="card flex flex-col items-center justify-center p-12 text-destructive" role="alert">
            <AlertCircle className="w-10 h-10 mb-4" aria-hidden="true" />
            <p className="font-medium">Failed to load authority dashboard.</p>
          </div>
        ) : !projection ? (
          <EmptyState reason={data.reason} />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="card p-5">
                <span className="muted text-sm">Backlinks</span>
                <strong className="block text-2xl mt-1">{number(projection.summary.backlinkCount)}</strong>
                <Trend metric={projection.trend.backlinks} />
              </article>
              <article className="card p-5">
                <span className="muted text-sm">Referring domains</span>
                <strong className="block text-2xl mt-1">{number(projection.summary.referringDomainCount)}</strong>
                <Trend metric={projection.trend.referringDomains} />
              </article>
              <article className="card p-5">
                <span className="muted text-sm">Provider-reported new</span>
                <strong className="block text-2xl mt-1">{number(projection.summary.providerReportedNewBacklinkCount)}</strong>
                <Trend metric={projection.trend.providerReportedNewBacklinks} />
              </article>
              <article className="card p-5">
                <span className="muted text-sm">Provider-reported lost</span>
                <strong className="block text-2xl mt-1">{number(projection.summary.providerReportedLostBacklinkCount)}</strong>
                <Trend metric={projection.trend.providerReportedLostBacklinks} />
              </article>
            </section>

            <section className="card p-5 mt-5">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">REFERRING DOMAINS</p>
                  <h2>Who links to {projection.targetDomain}</h2>
                  <p className="muted">Authority values are provider-native and are not cross-provider comparable.</p>
                </div>
                <StatusBadge tone="info">{projection.provider.providerKey.toUpperCase()}</StatusBadge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left">
                    <th className="py-2">Domain</th><th>Backlinks</th><th>Active</th><th>New</th><th>Lost</th><th>Authority</th><th>Last seen</th>
                  </tr></thead>
                  <tbody>
                    {projection.referringDomains.map((row) => (
                      <tr key={row.domain} className="border-t border-[#e6eaf0]">
                        <td className="py-3 font-medium">{row.domain}</td>
                        <td>{number(row.backlinkCount)}</td>
                        <td>{number(row.activeBacklinkCount)}</td>
                        <td>{number(row.providerReportedNewBacklinkCount)}</td>
                        <td>{number(row.providerReportedLostBacklinkCount)}</td>
                        <td>{row.providerAuthority ?? "—"}</td>
                        <td>{row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2 mt-5">
              <article className="card p-5">
                <div className="sectionHead"><div><p className="eyebrow">TOP LINKED PAGES</p><h2>Pages earning links</h2></div></div>
                <div className="space-y-3">
                  {projection.linkedPages.slice(0, 10).map((row) => (
                    <div key={row.targetUrl} className="border-t first:border-t-0 border-[#e6eaf0] pt-3 first:pt-0">
                      <strong className="block break-all">{row.targetUrl}</strong>
                      <span className="muted text-sm">{row.backlinkCount} backlinks · {row.referringDomainCount} domains</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card p-5">
                <div className="sectionHead"><div><p className="eyebrow">ANCHORS</p><h2>Anchor distribution</h2></div></div>
                <div className="space-y-3">
                  {projection.anchors.slice(0, 10).map((row) => (
                    <div key={row.anchorText} className="flex items-center justify-between gap-4 border-t first:border-t-0 border-[#e6eaf0] pt-3 first:pt-0">
                      <div><strong>{row.anchorText}</strong><div className="muted text-sm">{row.referringDomainCount} domains</div></div>
                      <div className="text-right"><strong>{number(row.backlinkCount)}</strong><div className="muted text-sm">{percent(row.share)}</div></div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="card p-5 mt-5">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">COMPETITOR GAP</p>
                  <h2>Observed referring-domain gaps</h2>
                  <p className="muted">Descriptive evidence only. Opportunity scoring starts in UGP-9.3.</p>
                </div>
                <StatusBadge tone={data.readiness.competitorGap === "available" ? "success" : "neutral"}>
                  {data.readiness.competitorGap.toUpperCase()}
                </StatusBadge>
              </div>
              {projection.competitorGaps.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left"><th className="py-2">Referring domain</th><th>Class</th><th>Coverage</th><th>Competitors</th><th>Authority</th></tr></thead>
                    <tbody>
                      {projection.competitorGaps.map((row) => (
                        <tr key={row.referringDomain} className="border-t border-[#e6eaf0]">
                          <td className="py-3 font-medium">{row.referringDomain}</td>
                          <td>{row.classification.replaceAll("_", " ")}</td>
                          <td>{percent(row.competitorCoverageRatio)}</td>
                          <td>{row.competitorDomains.join(", ")}</td>
                          <td>{row.providerAuthority ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No competitor-gap evidence bundle is available for this snapshot.</p>
              )}
            </section>

            <section className="card p-5 mt-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 mt-0.5" aria-hidden="true" />
                <div>
                  <strong>Interpretation guardrails</strong>
                  <p className="muted mt-1">
                    Provider authority is descriptive, provider-reported lost links are not equivalent to exact normalized loss timestamps, and this dashboard does not authorize acquisition, outreach, scheduling, or site changes.
                  </p>
                  {projection.limitations.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm">
                      {projection.limitations.map((item) => <li key={item}>{item.replaceAll("_", " ")}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

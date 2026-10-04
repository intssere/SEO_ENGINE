import { useQuery } from "@tanstack/react-query";
import { OperationalTable, PageHeader } from "../components/operational-table";
import { StatusBadge } from "../components/status-badge";

async function loadAuthorityDashboard() {
  const response = await fetch("/api/authority/dashboard", {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("authority_dashboard_request_failed");
  return response.json();
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
        <div><strong>Authority</strong><span className="muted"> Backlink intelligence</span></div>
        {data && <StatusBadge>{String(data.state).toUpperCase()}</StatusBadge>}
      </header>

      <div className="content">
        <PageHeader
          eyebrow="AUTHORITY & LINKS"
          title="Authority dashboard"
          description="Provider-backed backlink evidence. Provider authority is not cross-provider comparable."
          readiness={data?.readiness}
        />

        {isLoading ? (
          <section className="card p-8" role="status">Loading authority evidence…</section>
        ) : isError || !data ? (
          <section className="card p-8" role="alert">Failed to load authority dashboard.</section>
        ) : !projection ? (
          <section className="card p-8">
            <h2>Authority evidence is not available yet</h2>
            <p className="muted">{data.reason}</p>
            <StatusBadge>NO SYNTHETIC FALLBACK</StatusBadge>
          </section>
        ) : (
          <>
            <section className="card p-5">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">SUMMARY</p>
                  <h2>{projection.targetDomain}</h2>
                  <p className="muted">
                    {projection.summary.backlinkCount} backlinks · {projection.summary.referringDomainCount} referring domains · {projection.summary.providerReportedNewBacklinkCount} provider-reported new · {projection.summary.providerReportedLostBacklinkCount} provider-reported lost
                  </p>
                </div>
                <StatusBadge>{projection.provider.providerKey.toUpperCase()}</StatusBadge>
              </div>
            </section>

            <section className="card mt-5">
              <div className="sectionHead p-5 pb-0"><div><p className="eyebrow">REFERRING DOMAINS</p><h2>Link sources</h2></div></div>
              <OperationalTable data={projection.referringDomains} label="Referring domains" rowKey={(row) => row.domain} />
            </section>

            <section className="card mt-5">
              <div className="sectionHead p-5 pb-0"><div><p className="eyebrow">TOP LINKED PAGES</p><h2>Pages earning links</h2></div></div>
              <OperationalTable data={projection.linkedPages} label="Top linked pages" rowKey={(row) => row.targetUrl} />
            </section>

            <section className="card mt-5">
              <div className="sectionHead p-5 pb-0"><div><p className="eyebrow">ANCHORS</p><h2>Anchor distribution</h2></div></div>
              <OperationalTable data={projection.anchors} label="Anchor distribution" rowKey={(row) => row.anchorText} />
            </section>

            <section className="card mt-5">
              <div className="sectionHead p-5 pb-0"><div><p className="eyebrow">COMPETITOR GAP</p><h2>Observed referring-domain gaps</h2><p className="muted">Descriptive only; opportunity scoring starts in UGP-9.3.</p></div></div>
              <OperationalTable data={projection.competitorGaps} label="Competitor gaps" rowKey={(row) => row.referringDomain} />
            </section>

            <section className="card p-5 mt-5">
              <strong>Interpretation guardrails</strong>
              <p className="muted mt-1">Provider-reported lost links are not equivalent to exact normalized loss timestamps. This dashboard does not authorize acquisition, outreach, scheduling, or site changes.</p>
            </section>
          </>
        )}
      </div>
    </>
  );
}

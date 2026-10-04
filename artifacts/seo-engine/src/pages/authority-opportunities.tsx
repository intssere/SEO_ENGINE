import { useQuery } from "@tanstack/react-query";
import { OperationalTable } from "../components/operational-table";

const load=async()=>{
  const response=await fetch("/api/authority/opportunities");
  if(!response.ok) throw Error();
  return response.json();
};

export default function AuthorityOpportunitiesPage(){
  const query=useQuery({
    queryKey:["/api/authority/opportunities"],
    queryFn:load,
  });
  const discovery=query.data?.discovery;
  return <div className="content">
    <div className="titleRow"><div>
      <p className="eyebrow">AUTHORITY & LINKS</p>
      <h1>Authority opportunities</h1>
      <p className="muted">Evidence-backed discovery only. Qualification, scoring, and outreach are separate controls.</p>
    </div></div>
    {query.isLoading?<section className="card p-8" role="status">Loading authority opportunities…</section>
    :query.isError||!query.data?<section className="card p-8" role="alert">Authority opportunities could not be loaded.</section>
    :!discovery?<section className="card p-8"><h2>Authority opportunity evidence is not available yet</h2><p className="muted">{query.data.reason}</p><strong>NO SYNTHETIC FALLBACK</strong></section>
    :<section className="card">
      <div className="p-5"><h2>{discovery.targetDomain}</h2><p className="muted">{discovery.summary.total} evidence-backed discoveries. No prospect qualification or outreach is authorized here.</p></div>
      <OperationalTable
        label="Authority opportunities"
        data={discovery.opportunities.map((row:any)=>({
          kind:row.kind,
          sourceDomain:row.sourceDomain,
          targetUrl:row.targetUrl,
          competitorDomains:row.competitorDomains.join(", "),
          observedAt:row.observedAt,
          rationale:row.rationaleCode,
        }))}
      />
    </section>}
  </div>;
}

import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";
import { OperationalTable } from "../components/operational-table";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({
    queryKey:["/api/authority/opportunities"],
    queryFn:async()=>{
      const r=await fetch("/api/authority/opportunities");
      if(!r.ok) throw Error();
      return r.json();
    },
  });
  const d=q.data?.discovery;
  return <div className="content">
    <h1>Authority opportunities</h1>
    <p className="muted">Evidence-backed only. No scoring, qualification, or outreach.</p>
    {q.isLoading?<section className="card" role="status">Loading…</section>
    :q.isError||!q.data?<section className="card" role="alert">Unavailable.</section>
    :!d?<section className="card"><h2>No authority opportunity evidence</h2><p>{q.data.reason}</p><strong>NO SYNTHETIC FALLBACK</strong></section>
    :<section className="card"><h2>{d.targetDomain}</h2><p>{d.summary.total} discoveries</p><OperationalTable data={d.opportunities}/></section>}
  </div>;
}

export default function AuthorityPage(){
  return <CustomerDomainHub
    eyebrow="AUTHORITY & LINKS"
    title="Authority"
    description="Find backlink gaps and authority-building opportunities."
    cards={[
      {title:"Backlink gaps",description:"Inspect referring-domain gaps and shared coverage evidence.",href:"/authority/backlinks",actionLabel:"Review backlink gaps",status:"preview"},
      {title:"Competitor authority",description:"Compare competitor visibility, authority signals, and topic gaps.",href:"/authority/competitors",actionLabel:"Open competitor research",status:"preview"},
      {title:"Outreach",description:"Manage earned-link, mention, broken-link, and editorial outreach.",actionLabel:"Outreach workflow is being added",status:"coming_soon"},
      {title:"Authority opportunities",description:"Review evidence-backed authority opportunities.",href:"/authority/opportunities",actionLabel:"Review opportunities",status:"available"},
    ]}
  />;
}

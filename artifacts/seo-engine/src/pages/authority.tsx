import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CustomerDomainHub } from "../components/customer-domain-hub";
import { OperationalTable } from "../components/operational-table";

const load=async()=>{
  const r=await fetch("/api/authority/opportunities");
  if(!r.ok) throw Error();
  return r.json();
};

export default function AuthorityPage(){
  const [location]=useLocation();
  const opportunities=location==="/authority/opportunities";
  const query=useQuery({
    queryKey:["/api/authority/opportunities"],
    queryFn:load,
    enabled:opportunities,
  });

  if(opportunities){
    const discovery=query.data?.discovery;
    return <div className="content">
      <h1>Authority opportunities</h1>
      <p className="muted">Evidence-backed discovery only. Qualification, scoring, and outreach are separate controls.</p>
      {query.isLoading?<section className="card" role="status">Loading authority opportunities…</section>
      :query.isError||!query.data?<section className="card" role="alert">Authority opportunities could not be loaded.</section>
      :!discovery?<section className="card"><h2>Authority opportunity evidence is not available yet</h2><p>{query.data.reason}</p><strong>NO SYNTHETIC FALLBACK</strong></section>
      :<section className="card"><h2>{discovery.targetDomain}</h2><p>{discovery.summary.total} evidence-backed discoveries. No prospect qualification or outreach is authorized here.</p><OperationalTable data={discovery.opportunities}/></section>}
    </div>;
  }

  return <CustomerDomainHub
    eyebrow="AUTHORITY & LINKS"
    title="Authority"
    description="Find backlink gaps and authority-building opportunities."
    cards={[
      {title:"Backlink gaps",description:"Inspect referring-domain gaps and shared coverage evidence.",href:"/authority/backlinks",actionLabel:"Review backlink gaps",status:"preview"},
      {title:"Competitor authority",description:"Compare competitor visibility, authority signals, and topic gaps.",href:"/authority/competitors",actionLabel:"Open competitor research",status:"preview"},
      {title:"Outreach",description:"Manage earned-link, mention, broken-link, and editorial outreach.",actionLabel:"Outreach workflow is being added",status:"coming_soon"},
      {title:"Authority opportunities",description:"Review evidence-backed link, mention, recovery, resource, partner, and promotion opportunities.",href:"/authority/opportunities",actionLabel:"Review authority opportunities",status:"available"},
    ]}
  />;
}

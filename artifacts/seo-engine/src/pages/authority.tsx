import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({
    queryKey:["/api/authority/opportunities"],
    queryFn:()=>fetch("/api/authority/opportunities").then(r=>r.ok?r.json():Promise.reject()),
  });
  if(q.isLoading)return <div className="content card" role="status">Loading…</div>;
  const d=q.data?.discovery;
  if(!d)return <div className="content card" role="alert"><h1>Authority opportunities</h1><p>{q.data?.reason||"Unavailable."}</p><strong>NO SYNTHETIC FALLBACK</strong></div>;
  return <div className="content"><h1>Authority opportunities</h1><p>{d.summary.total} evidence-backed discoveries. No scoring, qualification, or outreach.</p><div className="card">{d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind} · {x.rationaleCode}</p>)}</div></div>;
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

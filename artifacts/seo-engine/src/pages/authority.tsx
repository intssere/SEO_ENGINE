import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({
    queryKey:["/api/authority/opportunities"],
    queryFn:()=>fetch("/api/authority/opportunities").then(r=>{
      if(!r.ok)throw Error();
      return r.json();
    }),
  });
  const d=q.data?.discovery;
  if(q.isLoading)return <div className="content card" role="status">Loading…</div>;
  if(q.isError||!q.data)return <div className="content card" role="alert">Unavailable.</div>;
  if(!d)return <div className="content card"><h1>Authority opportunities</h1><p>{q.data.reason}</p><strong>NO SYNTHETIC FALLBACK</strong></div>;
  return <div className="content"><h1>Authority opportunities</h1><p>{d.summary.total} evidence-backed discoveries. No scoring, qualification, or outreach.</p><div className="card">{d.opportunities.map((x:any)=><p key={x.opportunityId}><strong>{x.sourceDomain}</strong> · {x.kind} · {x.rationaleCode}</p>)}</div></div>;
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

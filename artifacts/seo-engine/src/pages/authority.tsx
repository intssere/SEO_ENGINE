import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";

const U="/api/authority/opportunities";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({queryKey:[U],queryFn:()=>fetch(U).then(r=>r.json())});
  const d=q.data?.discovery;
  return <div className="content">
    <h1>Authority opportunities</h1>
    {!q.data?<p role="status">Loading authority evidence…</p>
    :!d?<p>{q.data.reason} <strong>NO SYNTHETIC FALLBACK</strong></p>
    :<><p>{d.summary.total} evidence-backed discoveries. No scoring, qualification, or outreach.</p><ul>{d.opportunities.map((x:any)=><li key={x.opportunityId}>{x.sourceDomain} · {x.kind}</li>)}</ul></>}
  </div>;
}

export default function AuthorityPage(){
  return <CustomerDomainHub
    eyebrow="AUTHORITY & LINKS"
    title="Authority"
    description="Backlink and authority opportunities."
    cards={[
      {title:"Backlink gaps",description:"Review referring-domain gaps.",href:"/authority/backlinks",actionLabel:"Review gaps",status:"preview"},
      {title:"Competitor authority",description:"Compare authority and topic gaps.",href:"/authority/competitors",actionLabel:"Compare competitors",status:"preview"},
      {title:"Outreach",description:"Earned-link outreach workspace.",actionLabel:"Coming soon",status:"coming_soon"},
      {title:"Authority opportunities",description:"Review evidence-backed discoveries.",href:"/authority/opportunities",actionLabel:"Review opportunities",status:"available"},
    ]}
  />;
}

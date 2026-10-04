import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";

const U="/api/authority/opportunities";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({queryKey:[U],queryFn:()=>fetch(U).then(r=>r.json())});
  const d=q.data?.discovery;
  return <div className="content">
    <h1>Authority opportunities</h1>
    {!q.data?<p>Loading…</p>:!d?<p>{q.data.reason} <b>NO SYNTHETIC FALLBACK</b></p>:<><p>{d.summary.total} evidence-backed discoveries. No scoring or outreach.</p>{d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind}</p>)}</>}
  </div>;
}

export default function AuthorityPage(){
  return <CustomerDomainHub eyebrow="AUTHORITY" title="Authority" description="Link opportunities." cards={[
    {title:"Backlink gaps",description:"Domain gaps.",href:"/authority/backlinks",actionLabel:"Review",status:"preview"},
    {title:"Competitor authority",description:"Authority gaps.",href:"/authority/competitors",actionLabel:"Compare",status:"preview"},
    {title:"Outreach",description:"Earned links.",actionLabel:"Coming soon",status:"coming_soon"},
    {title:"Authority opportunities",description:"Evidence-backed.",href:"/authority/opportunities",actionLabel:"Review",status:"available"},
  ]}/>;
}

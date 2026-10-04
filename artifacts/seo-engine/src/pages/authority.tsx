import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({queryKey:["/api/authority/opportunities"],queryFn:()=>fetch("/api/authority/opportunities").then(r=>r.json())});
  const d=q.data?.discovery;
  return <div className="content">
    <h1>Authority opportunities</h1>
    {!q.data?<p>Loading…</p>:!d?<p>{q.data.reason} <b>NO SYNTHETIC FALLBACK</b></p>:<><p>{d.summary.total} evidence-backed discoveries; no scoring or outreach.</p>{d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind}</p>)}</>}
  </div>;
}

export default function AuthorityPage(){
  return <CustomerDomainHub eyebrow="AUTHORITY & LINKS" title="Authority" description="Backlink opportunities." cards={[
    {title:"Backlink gaps",description:"Referring-domain gaps.",href:"/authority/backlinks",actionLabel:"Review gaps",status:"preview"},
    {title:"Competitor authority",description:"Authority and topic gaps.",href:"/authority/competitors",actionLabel:"Compare",status:"preview"},
    {title:"Outreach",description:"Earned-link outreach.",actionLabel:"Coming soon",status:"coming_soon"},
    {title:"Authority opportunities",description:"Evidence-backed discoveries.",href:"/authority/opportunities",actionLabel:"Review",status:"available"},
  ]}/>;
}

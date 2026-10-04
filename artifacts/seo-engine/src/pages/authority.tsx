import { useQuery } from "@tanstack/react-query";
import { CustomerDomainHub } from "../components/customer-domain-hub";

const U="/api/authority/opportunities";

export function AuthorityOpportunitiesPage(){
  const q=useQuery({queryKey:[U],queryFn:()=>fetch(U).then(r=>r.json())});
  const d=q.data?.discovery;
  return <div className="content"><h1>Authority opportunities</h1>
    {d?d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind}</p>)
    :<p>{q.data?q.data.reason:"…"} {q.data&&<b>NO SYNTHETIC FALLBACK</b>}</p>}
  </div>;
}

export default function AuthorityPage(){
  return <CustomerDomainHub eyebrow="LINKS" title="Authority" description="Links." cards={[
    {title:"Backlink gaps",description:"",href:"/authority/backlinks",status:"preview"},
    {title:"Competitors",description:"",href:"/authority/competitors",status:"preview"},
    {title:"Outreach",description:".",status:"coming_soon"},
    {title:"Opportunities",description:"Evidence.",href:"/authority/opportunities",status:"available"},
  ]}/>;
}

import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const p=location.pathname.endsWith("prospects")?"qualification":location.pathname.endsWith("opportunities")?"opportunities":"dashboard";
  const u="/api/authority/"+p;
  const q=useQuery({queryKey:[u],queryFn:()=>fetch(u).then(r=>r.json())});
  const d=p==="qualification"?q.data?.qualification:p==="opportunities"?q.data?.discovery:q.data?.projection;
  return <div className="content">{!d?<p>{q.data?q.data.reason:"…"} {q.data&&<b>NO SYNTHETIC FALLBACK</b>}</p>:p==="qualification"?d.prospects.map((x:any)=><p key={x.prospectId}>{x.sourceDomain} · {x.status} · {x.score}</p>):p==="opportunities"?d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind}</p>):<><p>{d.targetDomain} · {d.summary.backlinkCount} · {d.summary.referringDomainCount}</p>{d.referringDomains.map((x:any)=><p key={x.domain}>{x.domain} · {x.backlinkCount}</p>)}</>}</div>;
}

import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const opportunity=location.pathname.endsWith("opportunities");
  const u="/api/authority/"+(opportunity?"opportunities":"dashboard");
  const q=useQuery({queryKey:[u],queryFn:()=>fetch(u).then(r=>r.json())});
  const d=opportunity?q.data?.discovery:q.data?.projection;
  return <div className="content"><h1>Authority</h1>{!d?<p>{q.data?q.data.reason:"…"} {q.data&&<b>NO SYNTHETIC FALLBACK</b>}</p>:opportunity?d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind}</p>):<><p>{d.targetDomain} · {d.summary.backlinkCount} · {d.summary.referringDomainCount}</p>{d.referringDomains.map((x:any)=><p key={x.domain}>{x.domain} · {x.backlinkCount}</p>)}</>}</div>;
}

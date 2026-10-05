import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const x=location.pathname.endsWith("prospects"),o=location.pathname.endsWith("opportunities"),p=x?"qualification":o?"opportunities":"dashboard",q=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}),d=x?q.data?.qualification:o?q.data?.discovery:q.data?.projection;
  return <div className="content">{!d?<p>{q.data?q.data.reason:"…"} {q.data&&"NO SYNTHETIC FALLBACK"}</p>:x?d.prospects.map((v:any)=><p key={v.prospectId}>{v.sourceDomain} · {v.status} · {v.score}</p>):o?d.opportunities.map((v:any)=><p key={v.opportunityId}>{v.sourceDomain} · {v.kind}</p>):<><p>{d.targetDomain} · {d.summary.backlinkCount} · {d.summary.referringDomainCount}</p>{d.referringDomains.map((v:any)=><p key={v.domain}>{v.domain} · {v.backlinkCount}</p>)}</>}</div>;
}

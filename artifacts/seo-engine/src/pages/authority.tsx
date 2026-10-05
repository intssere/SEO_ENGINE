import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const c=location.pathname[11],p=c==="p"?"qualification":c==="o"?"opportunities":"dashboard",q=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}),d=p[0]==="q"?q.data?.qualification:p[0]==="o"?q.data?.discovery:q.data?.projection;
  if(!d)return <p>{q.data?.reason||"…"} {q.data&&"NO SYNTHETIC FALLBACK"}</p>;
  const r=p[0]==="q"?d.prospects:p[0]==="o"?d.opportunities:d.referringDomains;
  return <>{r.map((v:any)=><p key={v.prospectId||v.opportunityId||v.domain}>{v.sourceDomain||v.domain}/{v.status||v.kind||v.backlinkCount}{v.score==null?"":"/"+v.score}</p>)}</>;
}

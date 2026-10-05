import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const c=location.pathname[11],p=c==="p"?"qualification":c==="o"?"opportunities":"dashboard",q=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}),d=q.data?.qualification||q.data?.discovery||q.data?.projection,r=d&&(d.prospects||d.opportunities||d.referringDomains);
  return <>{r?r.map((v:any)=><p key={v.prospectId||v.opportunityId||v.domain}>{v.sourceDomain||v.domain}/{v.status||v.kind||v.backlinkCount}{v.score==null?"":"/"+v.score}</p>):<p>{q.data?.reason||"…"} {q.data&&"NO SYNTHETIC FALLBACK"}</p>}</>;
}

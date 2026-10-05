import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const c=location.pathname[11],p=c=="p"?"qualification":c=="o"?"opportunities":"dashboard",q=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}),a=q.data,d=a&&(a.qualification||a.discovery||a.projection),r=d&&(d.prospects||d.opportunities||d.referringDomains);
  return <>{r?r.map((v:any,i)=><p key={i}>{v.domain||v.sourceDomain}/{v.status||v.kind||v.backlinkCount}{v.score!=null&&"/"+v.score}</p>):<p>{a?.reason||"…"} {a&&"NO SYNTHETIC FALLBACK"}</p>}</>;
}

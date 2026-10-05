import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const c=location.pathname[11],p=c=="p"?"qualification":c=="o"?"opportunities":"dashboard",a=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}).data,r=a?.qualification?.prospects||a?.discovery?.opportunities||a?.projection?.referringDomains;
  return r?.map((v:any,i:number)=><p key={i}>{v.domain||v.sourceDomain}/{v.status||v.kind||v.backlinkCount}{v.status&&"/"+v.score}</p>)||<p>{a?.reason||"…"}{a&&" NO SYNTHETIC FALLBACK"}</p>;
}

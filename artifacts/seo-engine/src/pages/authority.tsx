import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const c=location.pathname[11],p=c=="p"?"outreach":c=="o"?"opportunities":"dashboard",a=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}).data,r=a?.workspace?.items||a?.discovery?.opportunities||a?.projection?.referringDomains;
  return r?.map((v:any,i:number)=><p key={i}>{v.domain||v.sourceDomain}/{v.state||v.kind||v.backlinkCount}{v.qualificationScore&&"/"+v.qualificationScore}</p>)||<p>{a?.reason||"…"}{a&&" NO SYNTHETIC FALLBACK"}</p>;
}

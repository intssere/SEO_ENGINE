import { useQuery } from "@tanstack/react-query";

export default function AuthorityPage(){
  const a=location.pathname.split("/").pop(),p=a==="prospects"?"qualification":a==="opportunities"?"opportunities":"dashboard",q=useQuery({queryKey:[p],queryFn:()=>fetch("/api/authority/"+p).then(r=>r.json())}),d=p==="qualification"?q.data?.qualification:p==="opportunities"?q.data?.discovery:q.data?.projection;
  if(!d)return <div className="content"><p>{q.data?q.data.reason:"…"} {q.data&&"NO SYNTHETIC FALLBACK"}</p></div>;
  const r=p==="qualification"?d.prospects:p==="opportunities"?d.opportunities:d.referringDomains;
  return <div className="content">{r.map((v:any)=><p key={v.prospectId||v.opportunityId||v.domain}>{v.sourceDomain||v.domain} · {v.status||v.kind||v.backlinkCount}{v.score==null?"":" · "+v.score}</p>)}</div>;
}

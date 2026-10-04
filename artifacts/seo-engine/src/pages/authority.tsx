import { useQuery } from "@tanstack/react-query";

const A="/api/authority/";

export function AuthorityDataPage(){
  const opportunity=location.pathname.endsWith("opportunities");
  const u=A+(opportunity?"opportunities":"dashboard");
  const q=useQuery({queryKey:[u],queryFn:()=>fetch(u).then(r=>r.json())});
  const d=opportunity?q.data?.discovery:q.data?.projection;
  if(!d)return <div className="content"><h1>Authority</h1><p>{q.data?q.data.reason:"…"} {q.data&&<b>NO SYNTHETIC FALLBACK</b>}</p></div>;
  if(opportunity)return <div className="content"><h1>Authority opportunities</h1>{d.opportunities.map((x:any)=><p key={x.opportunityId}>{x.sourceDomain} · {x.kind}</p>)}</div>;
  const sets=[["Domains",d.referringDomains,"domain"],["Pages",d.linkedPages,"targetUrl"],["Anchors",d.anchors,"anchorText"],["Gaps",d.competitorGaps,"referringDomain"]];
  return <div className="content"><h1>Backlinks</h1><p>{d.targetDomain} · {d.summary.backlinkCount} backlinks · {d.summary.referringDomainCount} domains</p>{sets.map(([t,rows,k]:any)=><section key={t}><h2>{t}</h2>{rows.map((x:any)=><p key={x[k]}>{x[k]} · {x.backlinkCount??x.classification}</p>)}</section>)}</div>;
}

export default function AuthorityPage(){
  return <div className="content"><h1>Authority</h1><p><a href="/authority/backlinks">Backlinks</a> · <a href="/authority/competitors">Competitors</a> · <a href="/authority/opportunities">Opportunities</a></p></div>;
}

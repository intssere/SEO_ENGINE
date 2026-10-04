import { useQuery } from "@tanstack/react-query";
import { OperationalTable } from "../components/operational-table";

const load=async()=>{
  const r=await fetch("/api/authority/dashboard");
  if(!r.ok) throw Error();
  return r.json();
};

export default function AuthorityPage(){
  const q=useQuery({queryKey:["/api/authority/dashboard"],queryFn:load});
  const p=q.data?.projection;
  if(q.isLoading)return <div className="content card">Loading authority evidence…</div>;
  if(q.isError||!q.data)return <div className="content card" role="alert">Authority dashboard unavailable.</div>;
  if(!p)return <div className="content"><h1>Authority dashboard</h1><section className="card"><h2>Authority evidence is not available yet</h2><p>{q.data.reason}</p><strong>NO SYNTHETIC FALLBACK</strong></section></div>;
  const sets=[
    ["Referring domains",p.referringDomains],
    ["Top linked pages",p.linkedPages],
    ["Anchor distribution",p.anchors],
    ["Competitor gaps",p.competitorGaps],
  ];
  return <div className="content">
    <h1>Authority dashboard</h1>
    <section className="card"><h2>{p.targetDomain}</h2><p>{p.summary.backlinkCount} backlinks · {p.summary.referringDomainCount} referring domains · {p.summary.providerReportedNewBacklinkCount} provider-reported new · {p.summary.providerReportedLostBacklinkCount} provider-reported lost</p></section>
    {sets.map(([title,rows])=><section className="card mt-5" key={title as string}><h2>{title as string}</h2><OperationalTable data={rows as any[]}/></section>)}
    <section className="card mt-5"><strong>Evidence guardrails</strong><p>Provider authority is provider-native. Reported lost links are not exact normalized loss timestamps. Competitor gaps are descriptive only. No acquisition, outreach, scheduling, or site changes are authorized here.</p></section>
  </div>;
}

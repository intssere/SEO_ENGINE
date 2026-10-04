import { useQuery } from "@tanstack/react-query";
import { OperationalTable } from "../components/operational-table";

const getAuthority=async()=>{
  const r=await fetch("/api/authority/dashboard",{credentials:"same-origin"});
  if(!r.ok) throw Error("authority_dashboard_request_failed");
  return r.json();
};

export default function AuthorityPage(){
  const {data,isLoading,isError}=useQuery({
    queryKey:["/api/authority/dashboard"],
    queryFn:getAuthority,
    retry:1,
  });
  const p=data?.projection;
  return <div className="content">
    <div className="titleRow"><div>
      <p className="eyebrow">AUTHORITY & LINKS</p>
      <h1>Authority dashboard</h1>
      <p className="muted">Provider-backed backlink evidence. Authority is provider-native and not cross-provider comparable.</p>
    </div></div>
    {isLoading?<section className="card p-8">Loading authority evidence…</section>
    :isError||!data?<section className="card p-8" role="alert">Failed to load authority dashboard.</section>
    :!p?<section className="card p-8"><h2>Authority evidence is not available yet</h2><p className="muted">{data.reason}</p><strong>NO SYNTHETIC FALLBACK</strong></section>
    :<>
      <section className="card p-5"><h2>{p.targetDomain}</h2><p className="muted">{p.summary.backlinkCount} backlinks · {p.summary.referringDomainCount} referring domains · {p.summary.providerReportedNewBacklinkCount} provider-reported new · {p.summary.providerReportedLostBacklinkCount} provider-reported lost</p></section>
      {[
        ["Referring domains",p.referringDomains,"domain"],
        ["Top linked pages",p.linkedPages,"targetUrl"],
        ["Anchor distribution",p.anchors,"anchorText"],
        ["Competitor gaps",p.competitorGaps,"referringDomain"],
      ].map(([title,rows,key])=><section className="card mt-5" key={title as string}>
        <div className="p-5 pb-0"><h2>{title as string}</h2>{title==="Competitor gaps"&&<p className="muted">Descriptive only; opportunity scoring starts in UGP-9.3.</p>}</div>
        <OperationalTable data={rows as any[]} label={title as string} rowKey={(row)=>String(row[key as string])}/>
      </section>)}
      <section className="card p-5 mt-5"><strong>Interpretation guardrails</strong><p className="muted">Provider-reported lost links are not exact normalized loss timestamps. This dashboard authorizes no acquisition, outreach, scheduling, or site changes.</p></section>
    </>}
  </div>;
}

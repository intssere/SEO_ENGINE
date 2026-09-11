import { DashboardShell } from "./dashboard-shell";
import { SeoCommand } from "./seo-command";
import { loadOperationalList } from "../../lib/operational-data";

export async function OperationalListPage({ kind, eyebrow, title, description }: { kind: "opportunities" | "actions" | "approvals" | "deployments" | "findings"; eyebrow: string; title: string; description: string }) {
  const data = await loadOperationalList(kind);
  return <DashboardShell dataState={data.readiness.state}>
    <header className="topbar"><div><strong>Diamond Shelf</strong><span className="muted"> diamondshelf.us</span></div><SeoCommand /></header>
    <div className="content">
      {data.readiness.state !== "live" ? <div className={`dataBanner ${data.readiness.state === "setup_required" ? "stale" : "unavailable"}`}><strong>{data.readiness.state === "setup_required" ? "Setup required" : "Data unavailable"}</strong><span>{data.readiness.message}</span></div> : null}
      <div className="titleRow"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div></div>
      <section className="card">
        <div className="tableWrap"><table><thead><tr>{columnLabels(kind).map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>
          {data.rows.length ? data.rows.map((row, index) => <tr key={String(row.id ?? index)}>{cells(kind, row).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td className="emptyCell" colSpan={columnLabels(kind).length}>No persisted {kind} available.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  </DashboardShell>;
}

function columnLabels(kind: string): string[] {
  if (kind === "opportunities") return ["Opportunity", "Score", "State", "Evidence", "Page", "Why"];
  if (kind === "actions") return ["Action", "State", "Risk", "Page", "Rationale"];
  if (kind === "approvals") return ["Plan", "State", "Decision", "Risk", "Rationale"];
  if (kind === "deployments") return ["Deployment", "Provider", "State", "Verification", "Risk", "Rationale"];
  return ["Finding", "Category", "Severity", "State", "Page", "Description"];
}

function cells(kind: string, row: Record<string, unknown>): React.ReactNode[] {
  const shorten = (value: unknown, max = 160) => { const text = String(value ?? "—"); return text.length > max ? `${text.slice(0, max)}…` : text; };
  if (kind === "opportunities") return [shorten(row.title), Number(row.score ?? 0).toFixed(1), shorten(row.status), `${row.evidence_count ?? 0} refs`, shorten(row.url), shorten(row.rationale)];
  if (kind === "actions") return [shorten(row.title), shorten(row.status), shorten(row.risk_level), shorten(row.url), shorten(row.rationale)];
  if (kind === "approvals") return [shorten(row.id, 12), shorten(row.status), shorten(row.decision), shorten(row.risk_level), shorten(row.rationale)];
  if (kind === "deployments") return [shorten(row.id, 12), shorten(row.provider), shorten(row.status), shorten(row.verification_status), shorten(row.risk_level), shorten(row.rationale)];
  return [shorten(row.title), shorten(row.category), shorten(row.severity), shorten(row.status), shorten(row.url), shorten(row.description)];
}

import {
  GetDashboardDays,
  GetDashboardDevice,
  useGetDashboard,
  useListTechnicalFindings,
} from "@workspace/api-client-react";
import { AlertCircle, Database, Loader2, Search, ShieldCheck } from "lucide-react";
import { DataGrid, type DataGridColumn } from "../components/data-grid";
import { StatusBadge } from "../components/status-badge";
import {
  buildAuditWorkspaceModel,
  type AuditFindingRow,
} from "@/lib/audit-workspace-model";

const findingColumns: DataGridColumn<AuditFindingRow>[] = [
  {
    id: "title",
    header: "Finding",
    accessorKey: "title",
    searchable: true,
    cell: (_value, row) => (
      <div className="auditFindingIdentity">
        <strong>{row.title}</strong>
        <small>{row.description}</small>
      </div>
    ),
  },
  {
    id: "category",
    header: "Category",
    accessorKey: "category",
    searchable: true,
  },
  {
    id: "severity",
    header: "Severity",
    accessorKey: "severity",
    cell: (_value, row) => (
      <StatusBadge tone={row.severityTone}>
        {row.severity.toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    searchable: true,
  },
  {
    id: "url",
    header: "URL",
    accessorKey: "url",
    searchable: true,
    cell: (_value, row) => (
      <span className="auditUrlValue">{row.url ?? "Unavailable"}</span>
    ),
  },
];

const explorerColumns: DataGridColumn<Record<string, never>>[] = [
  { id: "canonicalUrl", header: "Canonical URL" },
  { id: "pathname", header: "Pathname" },
  { id: "sourceSitemaps", header: "Sitemap sources" },
  { id: "lastmod", header: "Lastmod" },
  { id: "recrawlStatus", header: "Recrawl status" },
  { id: "recrawlPriority", header: "Priority" },
  { id: "recrawlReasons", header: "Reasons" },
];

function percentage(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export default function TechnicalSeoPage() {
  const findings = useListTechnicalFindings();
  const dashboard = useGetDashboard({
    days: GetDashboardDays.NUMBER_28,
    device: GetDashboardDevice.all,
  });

  if (findings.isLoading) {
    return (
      <div className="auditWorkspaceLoading">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p>Loading audit workspace…</p>
      </div>
    );
  }

  const model = buildAuditWorkspaceModel({
    readiness: findings.data?.readiness,
    findingRows: (findings.data?.rows ?? []) as Record<string, unknown>[],
    certification: dashboard.data?.pilot.certification ?? null,
  });

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Audit</strong>
          <span className="muted"> Full-Site Audit / Crawl Explorer</span>
        </div>
        <div className="auditTopbarBadges">
          <StatusBadge tone={model.readiness.tone}>
            {model.readiness.label.toUpperCase()}
          </StatusBadge>
          <StatusBadge tone={model.coverage.tone}>
            {model.coverage.label.toUpperCase()}
          </StatusBadge>
        </div>
      </header>

      <div className="content auditWorkspace">
        <section className="auditHero">
          <div>
            <p className="eyebrow">FULL-SITE AUDIT</p>
            <h1>Technical SEO & crawl explorer</h1>
            <p className="muted">
              Read-only technical findings plus the current crawl-certification
              truth. Full-site URL inventory, crawl history and recrawl plans
              remain unavailable until their P2 read models are safely bound to
              a frontend GET endpoint.
            </p>
          </div>
          <div className="auditHeroState">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>No crawl execution from this workspace</strong>
              <span>
                No full-site crawl, sitemap fetch, retry, persistence or
                scheduler action is exposed here.
              </span>
            </div>
          </div>
        </section>

        {findings.isError ? (
          <div className="auditAlert auditAlert--danger" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>Technical findings could not be loaded.</span>
          </div>
        ) : null}

        {dashboard.isError ? (
          <div className="auditAlert auditAlert--neutral">
            <Database aria-hidden="true" />
            <span>
              Crawl certification snapshot is unavailable; no coverage value is
              inferred.
            </span>
          </div>
        ) : null}

        <section className="auditSummaryGrid" aria-label="Audit summary">
          <article className="card auditSummaryCard">
            <span>Findings readiness</span>
            <strong>{model.readiness.label}</strong>
            <p>{model.readiness.message}</p>
            <StatusBadge tone={model.readiness.tone}>
              {model.readiness.state.toUpperCase()}
            </StatusBadge>
          </article>

          <article className="card auditSummaryCard">
            <span>Crawl coverage</span>
            <strong>{percentage(model.coverage.percent)}</strong>
            <p>{model.coverage.detail}</p>
            <StatusBadge tone={model.coverage.tone}>
              {model.coverage.state.replaceAll("_", " ").toUpperCase()}
            </StatusBadge>
          </article>

          <article className="card auditSummaryCard">
            <span>Persisted findings</span>
            <strong>{model.findings.total}</strong>
            <p>{model.findings.completenessNote}</p>
            <StatusBadge tone={model.findings.total > 0 ? "info" : "neutral"}>
              CURRENT GET VIEW
            </StatusBadge>
          </article>

          <article className="card auditSummaryCard">
            <span>URL Explorer</span>
            <strong>{model.urlExplorer.label}</strong>
            <p>{model.urlExplorer.reason}</p>
            <StatusBadge>UNAVAILABLE</StatusBadge>
          </article>
        </section>

        <section className="card auditCoveragePanel">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">CRAWL CERTIFICATION</p>
              <h2>Current coverage truth</h2>
            </div>
            <StatusBadge tone={model.coverage.tone}>
              {model.coverage.label.toUpperCase()}
            </StatusBadge>
          </div>

          <div className="auditCoverageFacts">
            <div>
              <strong>{model.coverage.fetched ?? "—"}</strong>
              <span>Fetched</span>
            </div>
            <div>
              <strong>{model.coverage.discovered ?? "—"}</strong>
              <span>Discovered</span>
            </div>
            <div>
              <strong>{model.coverage.boundedLimit ?? "—"}</strong>
              <span>Bounded limit</span>
            </div>
            <div>
              <strong>{percentage(model.coverage.percent)}</strong>
              <span>Coverage</span>
            </div>
          </div>
          <p className="auditCoverageNote">
            Technical findings and bounded crawl counts do not establish a
            complete URL inventory. Whole-site status requires explicit
            certification.
          </p>
        </section>

        <section className="card auditFindingsPanel">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">TECHNICAL FINDINGS</p>
              <h2>Persisted issues</h2>
            </div>
            <div className="auditSeveritySummary" aria-label="Finding severities">
              <StatusBadge tone="danger">
                {model.findings.bySeverity.critical + model.findings.bySeverity.high} HIGH+
              </StatusBadge>
              <StatusBadge tone="warning">
                {model.findings.bySeverity.medium} MEDIUM
              </StatusBadge>
              <StatusBadge tone="info">
                {model.findings.bySeverity.low + model.findings.bySeverity.info} LOW/INFO
              </StatusBadge>
            </div>
          </div>

          <DataGrid
            data={model.findings.rows}
            columns={findingColumns}
            getRowId={(row) => row.rowId}
            label="Technical findings"
            searchPlaceholder="Search finding, category, status or URL"
            emptyMessage="No persisted technical findings are currently exposed."
          />
        </section>

        <section className="card auditExplorerPanel">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">P2.7 URL EXPLORER</p>
              <h2>Full-site URL inventory</h2>
              <p className="muted">
                The UI contract is ready, but the read model is not bound to a
                frontend GET endpoint.
              </p>
            </div>
            <StatusBadge>READ MODEL NOT BOUND</StatusBadge>
          </div>

          <div className="auditExplorerNotice">
            <Search aria-hidden="true" />
            <div>
              <strong>No URL inventory rows are synthesized</strong>
              <p>{model.urlExplorer.reason}</p>
            </div>
          </div>

          <DataGrid
            data={model.urlExplorer.rows}
            columns={explorerColumns}
            getRowId={(_row, sourceIndex) => `unavailable:${sourceIndex}`}
            label="Full-site URL Explorer"
            emptyMessage="URL Explorer data is unavailable until a safe read binding is implemented."
            searchPlaceholder="URL Explorer read model not bound"
          />

          <div className="auditContractGrid">
            <div>
              <strong>Retained P2.7 columns</strong>
              <div className="auditContractChips">
                {model.urlExplorer.retainedColumns.map((column) => (
                  <code key={column}>{column}</code>
                ))}
              </div>
            </div>
            <div>
              <strong>Explicitly unavailable per-URL dimensions</strong>
              <div className="auditContractChips auditContractChips--unavailable">
                {model.urlExplorer.unavailableDimensions.map((dimension) => (
                  <code key={dimension}>{dimension}</code>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="auditCapabilityGrid">
          <article className="card auditCapabilityCard">
            <span>Crawl history</span>
            <strong>{model.history.label}</strong>
            <p>{model.history.reason}</p>
            <StatusBadge>UNAVAILABLE</StatusBadge>
          </article>
          <article className="card auditCapabilityCard">
            <span>Incremental recrawl</span>
            <strong>{model.recrawl.label}</strong>
            <p>{model.recrawl.reason}</p>
            <StatusBadge>UNAVAILABLE</StatusBadge>
          </article>
          <article className="card auditCapabilityCard auditCapabilityCard--closed">
            <span>Execution boundary</span>
            <strong>All execution gates closed</strong>
            <p>
              Network crawl, sitemap fetch, Production evidence reads,
              persistence, scheduler, worker and public writes remain disabled.
            </p>
            <StatusBadge tone="success">READ-ONLY UI</StatusBadge>
          </article>
        </section>
      </div>
    </>
  );
}

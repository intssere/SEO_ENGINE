import "./reports.css";

import {
  Download,
  FileJson,
  FileText,
  Link2,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { StatusBadge } from "@/components/status-badge";
import {
  P11_7_SYNTHETIC_EXECUTIVE_REPORT_FIXTURE,
  buildExecutivePrintText,
  buildExecutiveReport,
  normalizeExecutiveReportShareState,
  parseExecutiveReportShareState,
  serializeExecutiveReportCsv,
  serializeExecutiveReportJson,
  serializeExecutiveReportShareState,
  type ExecutiveReportSectionKey,
  type ExecutiveReportShareState,
  type ExecutiveReportView,
} from "@/lib/executive-report-model";

const report = buildExecutiveReport(
  P11_7_SYNTHETIC_EXECUTIVE_REPORT_FIXTURE,
);

const SECTION_OPTIONS: {
  key: ExecutiveReportSectionKey;
  label: string;
}[] = [
  { key: "summary", label: "Executive summary" },
  { key: "kpis", label: "KPIs" },
  { key: "highlights", label: "Highlights" },
  { key: "guardrails", label: "Guardrails" },
];

const toneLabel = {
  neutral: "CONTEXT",
  info: "INFO",
  success: "READY",
  warning: "REVIEW",
  danger: "ATTENTION",
} as const;

function defaultShareState(): ExecutiveReportShareState {
  return normalizeExecutiveReportShareState({
    view: "executive",
    sections: ["summary", "kpis", "highlights", "guardrails"],
  });
}

function localFilename(extension: "csv" | "json") {
  return `seo-engine-${report.domain.replaceAll(".", "-")}-synthetic-report.${extension}`;
}

function downloadLocal(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReportsPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [preview, setPreview] = useState<"csv" | "json" | "print" | null>(null);
  const [exportStatus, setExportStatus] = useState("");

  const parsed = useMemo(() => {
    try {
      return {
        state: parseExecutiveReportShareState(search),
        invalid: false,
      };
    } catch {
      return {
        state: defaultShareState(),
        invalid: true,
      };
    }
  }, [search]);

  const state = parsed.state;

  const updateState = (next: ExecutiveReportShareState) => {
    const normalized = normalizeExecutiveReportShareState(next);
    const query = serializeExecutiveReportShareState(normalized);
    setLocation("?" + query, { replace: true });
  };

  const setView = (view: ExecutiveReportView) => {
    updateState({ ...state, view });
  };

  const toggleSection = (section: ExecutiveReportSectionKey) => {
    const selected = state.sections.includes(section)
      ? state.sections.filter((item) => item !== section)
      : [...state.sections, section];
    updateState({
      ...state,
      sections: selected.length > 0 ? selected : ["summary"],
    });
  };

  const csv = serializeExecutiveReportCsv(report);
  const json = serializeExecutiveReportJson(report);
  const printText = buildExecutivePrintText(report, state);
  const shareQuery = serializeExecutiveReportShareState(state);
  const localSharePath = "/reports?" + shareQuery;

  const handleCsvDownload = () => {
    downloadLocal(localFilename("csv"), csv, "text/csv;charset=utf-8");
    setExportStatus("Synthetic CSV generated locally. Nothing was delivered externally.");
  };

  const handleJsonDownload = () => {
    downloadLocal(
      localFilename("json"),
      json,
      "application/json;charset=utf-8",
    );
    setExportStatus("Synthetic JSON generated locally. Nothing was delivered externally.");
  };

  return (
    <>
      <header className="topbar reportsTopbar">
        <div>
          <strong>Measure</strong>
          <span className="muted"> Executive Reports</span>
        </div>
        <div className="reportsTopbarBadges" aria-label="Reporting safety state">
          <StatusBadge tone="info">SYNTHETIC READ-ONLY</StatusBadge>
          <StatusBadge tone="warning">LOCAL EXPORT ONLY</StatusBadge>
          <StatusBadge tone="danger">NO PUBLIC SHARE</StatusBadge>
        </div>
      </header>

      <div className="content reportsWorkspace">
        <section className="reportsHero" aria-labelledby="reports-title">
          <div>
            <p className="eyebrow">P11.7 REPORTING / EXPORT / SHARE STATE</p>
            <h1 id="reports-title">Executive Reports</h1>
            <p className="muted">
              Deterministic executive presentation of supplied engineering
              evidence. CSV, JSON, print and share-state features operate only
              on this synthetic report fixture and do not deliver data to an
              external service.
            </p>
          </div>
          <div className="reportsHeroState">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>{report.headline}</strong>
              <span>
                Report {report.reportId} · fingerprint {report.reportFingerprint}
              </span>
            </div>
          </div>
        </section>

        {parsed.invalid ? (
          <div className="reportsNotice reportsNotice--warning" role="alert">
            Unsupported report URL state was ignored. The safe default executive
            view is shown instead.
          </div>
        ) : null}

        <section className="card reportsControls" aria-labelledby="reports-controls-heading">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">VIEW CONFIGURATION</p>
              <h2 id="reports-controls-heading">Local report state</h2>
              <p>
                These controls change only the local route/query state. Report
                evidence is never embedded in the URL.
              </p>
            </div>
          </div>

          <div className="reportsControlGrid">
            <label>
              <span>Audience view</span>
              <select
                value={state.view}
                onChange={(event) =>
                  setView(event.target.value as ExecutiveReportView)
                }
              >
                <option value="executive">Executive</option>
                <option value="operations">Operations detail</option>
              </select>
            </label>

            <fieldset>
              <legend>Included sections</legend>
              <div className="reportsSectionChecks">
                {SECTION_OPTIONS.map((option) => (
                  <label key={option.key}>
                    <input
                      type="checkbox"
                      checked={state.sections.includes(option.key)}
                      onChange={() => toggleSection(option.key)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="reportsShareState">
            <Link2 aria-hidden="true" />
            <div>
              <strong>Internal share-state path</strong>
              <code>{localSharePath}</code>
              <small>
                View configuration only · no evidence payload · no public link
                publishing.
              </small>
            </div>
            <a className="linkButton" href={localSharePath}>
              Open this local state
            </a>
          </div>
        </section>

        {state.sections.includes("summary") ? (
          <section
            className="reportsSummaryGrid"
            aria-label="Executive report summary"
          >
            {report.summary.map((item) => (
              <article className="card reportsSummaryCard" key={item.key}>
                <div className="reportsSummaryHead">
                  <span>{item.label}</span>
                  <StatusBadge tone={item.tone}>
                    {toneLabel[item.tone]}
                  </StatusBadge>
                </div>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
                <small>{item.source}</small>
              </article>
            ))}
          </section>
        ) : null}

        {state.sections.includes("kpis") ? (
          <section className="card reportsPanel" aria-labelledby="reports-kpis-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">SELECTED SYNTHETIC METRICS</p>
                <h2 id="reports-kpis-heading">Executive KPIs</h2>
                <p>
                  Supplied display values only. Deltas are not independently
                  recomputed by P11.7.
                </p>
              </div>
            </div>
            <div className="reportsKpiGrid">
              {report.metrics.map((metric) => (
                <article key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>
                    {metric.delta ?? "No delta"} · {metric.source}
                  </small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {state.sections.includes("highlights") ? (
          <section
            className="card reportsPanel"
            aria-labelledby="reports-highlights-heading"
          >
            <div className="sectionHead">
              <div>
                <p className="eyebrow">DECISIONS & FOLLOW-UP</p>
                <h2 id="reports-highlights-heading">Executive highlights</h2>
                <p>
                  These are presentation summaries, not actions, approvals or
                  execution instructions.
                </p>
              </div>
            </div>
            <div className="reportsHighlights">
              {report.highlights.map((highlight) => (
                <article key={highlight.id}>
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>{highlight.title}</strong>
                    <p>{highlight.detail}</p>
                    <small>
                      {highlight.state.replaceAll("_", " ")} · {highlight.source}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card reportsPanel reportsExportPanel" aria-labelledby="reports-export-heading">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">LOCAL OUTPUTS</p>
              <h2 id="reports-export-heading">Export & print</h2>
              <p>
                Downloads are generated in-browser from the synthetic fixture.
                No server report job or external delivery is attached.
              </p>
            </div>
          </div>

          <div className="reportsExportActions">
            <button type="button" onClick={handleCsvDownload}>
              <Download aria-hidden="true" />
              Download synthetic CSV
            </button>
            <button type="button" onClick={handleJsonDownload}>
              <FileJson aria-hidden="true" />
              Download synthetic JSON
            </button>
            <button type="button" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Print local view
            </button>
          </div>

          <div className="reportsPreviewActions" aria-label="Local format previews">
            <button type="button" onClick={() => setPreview("csv")}>
              Preview CSV
            </button>
            <button type="button" onClick={() => setPreview("json")}>
              Preview JSON
            </button>
            <button type="button" onClick={() => setPreview("print")}>
              Preview print text
            </button>
            {preview ? (
              <button type="button" onClick={() => setPreview(null)}>
                Close preview
              </button>
            ) : null}
          </div>

          <p className="reportsExportStatus" role="status" aria-live="polite">
            {exportStatus || "No local export generated in this session."}
          </p>

          {preview ? (
            <pre className="reportsPreview" tabIndex={0}>
              {preview === "csv" ? csv : preview === "json" ? json : printText}
            </pre>
          ) : null}
        </section>

        {state.sections.includes("guardrails") ? (
          <section className="reportsBottomGrid">
            <article className="card reportsPanel" aria-labelledby="reports-guardrails-heading">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">INTERPRETATION GUARDRAILS</p>
                  <h2 id="reports-guardrails-heading">What this report does not authorize</h2>
                </div>
              </div>
              <ul>
                {report.guardrails.map((guardrail) => (
                  <li key={guardrail}>{guardrail}</li>
                ))}
              </ul>
            </article>

            <article className="card reportsPanel" aria-labelledby="reports-lineage-heading">
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">EVIDENCE LINEAGE</p>
                  <h2 id="reports-lineage-heading">
                    {state.view === "operations"
                      ? "Source fingerprints & diagnostics"
                      : "Source fingerprints"}
                  </h2>
                </div>
              </div>
              <dl className="reportsLineage">
                {report.evidenceLineage.map((item) => (
                  <div key={item.source}>
                    <dt>{item.source}</dt>
                    <dd title={item.fingerprint}>
                      {item.fingerprint.slice(0, 14)}…
                    </dd>
                  </div>
                ))}
              </dl>
              {state.view === "operations" ? (
                <ul className="reportsDiagnostics">
                  {report.diagnostics.map((diagnostic) => (
                    <li key={diagnostic}>{diagnostic}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  Switch to Operations detail to show explicit diagnostics.
                </p>
              )}
            </article>
          </section>
        ) : null}
      </div>
    </>
  );
}
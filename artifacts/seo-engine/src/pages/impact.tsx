import "./impact.css";
import {
  Activity,
  ArrowRight,
  Beaker,
  CalendarRange,
  Database,
  GitBranch,
  ShieldCheck,
  Target,
} from "lucide-react";
import { DataGrid, type DataGridColumn } from "@/components/data-grid";
import { StatusBadge } from "@/components/status-badge";
import {
  P10_7_SYNTHETIC_IMPACT_FIXTURE,
  buildImpactWorkspaceModel,
  type ImpactCalibrationRow,
  type ImpactOutcomeRow,
} from "@/lib/impact-workspace-model";

const model = buildImpactWorkspaceModel(P10_7_SYNTHETIC_IMPACT_FIXTURE);

function label(value: string | null) {
  return value === null ? "Unavailable" : value.replaceAll("_", " ");
}

function shortFingerprint(value: string) {
  return value.slice(0, 12) + "…";
}

function formatUtc(value: string) {
  return new Date(value).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
}

function comparisonTone(row: ImpactOutcomeRow) {
  return row.trackingState === "comparison_available" ? "info" as const : "neutral" as const;
}

function signalTone(row: ImpactCalibrationRow) {
  return row.kind === "unavailable" ? "neutral" as const : "info" as const;
}

const outcomeColumns: DataGridColumn<ImpactOutcomeRow>[] = [
  {
    id: "metric",
    header: "Metric / expectation",
    getValue: (row) => [row.metricKey, row.expectationId].join(" "),
    searchable: true,
    cell: (_value, row) => (
      <div className="impactCell">
        <strong>{row.metricKey}</strong>
        <small>{row.expectationId} · {row.unit}</small>
      </div>
    ),
  },
  {
    id: "direction",
    header: "Declared direction",
    accessorKey: "metricDirection",
    searchable: true,
    cell: (_value, row) => (
      <StatusBadge tone="info">{label(row.metricDirection).toUpperCase()}</StatusBadge>
    ),
  },
  {
    id: "expected",
    header: "Expected",
    accessorKey: "expectedValue",
    cell: (_value, row) => row.expectedValue ?? "Unavailable",
  },
  {
    id: "actual",
    header: "Actual",
    accessorKey: "actualValue",
    cell: (_value, row) => (
      <div className="impactCell">
        <strong>{row.actualValue ?? "Unavailable"}</strong>
        <small>{formatUtc(row.observedAt)}</small>
      </div>
    ),
  },
  {
    id: "difference",
    header: "Signed difference",
    accessorKey: "signedDifference",
    cell: (_value, row) => row.signedDifference ?? "Unavailable",
  },
  {
    id: "relation",
    header: "Arithmetic relation",
    accessorKey: "relation",
    searchable: true,
    cell: (_value, row) => (
      <div className="impactCell">
        <StatusBadge tone={comparisonTone(row)}>
          {label(row.relation).toUpperCase()}
        </StatusBadge>
        <small>Arithmetic only · not success/failure</small>
      </div>
    ),
  },
  {
    id: "state",
    header: "Tracking state",
    accessorKey: "trackingState",
    searchable: true,
    cell: (_value, row) => label(row.trackingState),
  },
];

const calibrationColumns: DataGridColumn<ImpactCalibrationRow>[] = [
  {
    id: "calibration",
    header: "Calibration definition",
    getValue: (row) => [row.calibrationKey, row.role].join(" "),
    searchable: true,
    cell: (_value, row) => (
      <div className="impactCell">
        <strong>{row.calibrationKey}</strong>
        <small>{label(row.role)} · {row.metricKey}</small>
      </div>
    ),
  },
  {
    id: "actual",
    header: "Bound actual",
    accessorKey: "actualId",
    searchable: true,
    cell: (_value, row) => (
      <div className="impactCell">
        <strong>{row.actualId}</strong>
        <small>{shortFingerprint(row.actualFingerprint)}</small>
      </div>
    ),
  },
  {
    id: "direction",
    header: "Metric direction",
    accessorKey: "metricDirection",
    cell: (_value, row) => label(row.metricDirection),
  },
  {
    id: "relation",
    header: "P10.5 relation",
    accessorKey: "relation",
    cell: (_value, row) => label(row.relation),
  },
  {
    id: "signal",
    header: "P10.6 directional signal",
    accessorKey: "kind",
    searchable: true,
    cell: (_value, row) => (
      <div className="impactCell">
        <StatusBadge tone={signalTone(row)}>
          {label(row.kind).toUpperCase()}
        </StatusBadge>
        <small>Not reward, quality, rank, or causal impact</small>
      </div>
    ),
  },
];

export default function ImpactPage() {
  const treatment = model.treatment;
  const association = treatment.association;

  return (
    <>
      <header className="topbar impactTopbar">
        <div>
          <strong>Measure</strong>
          <span className="muted"> Impact workspace v2</span>
        </div>
        <div className="impactTopbarBadges" aria-label="Impact workspace safety state">
          <StatusBadge tone="info">SYNTHETIC READ-ONLY</StatusBadge>
          <StatusBadge tone="warning">NO CAUSAL VERDICT</StatusBadge>
          <StatusBadge tone="danger">NO EXECUTION</StatusBadge>
        </div>
      </header>

      <div className="content impactWorkspace">
        <section className="impactHero" aria-labelledby="impact-title">
          <div>
            <p className="eyebrow">P10 MEASUREMENT & LEARNING EVIDENCE</p>
            <h1 id="impact-title">Impact workspace v2</h1>
            <p className="muted">
              Deterministic presentation of supplied P10.1–P10.6 lineage,
              before/after windows, experiment structure, expected-vs-actual
              arithmetic, and directional calibration. These layers remain
              descriptive and do not establish causal impact.
            </p>
          </div>
          <div className="impactHeroState">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Evidence layers stay separate</strong>
              <span>
                No live provider/outcome loader, Production database read/write,
                site mutation, model update, ranking change, policy update, or
                execution control is attached to this workspace.
              </span>
            </div>
          </div>
        </section>

        <section className="impactLineageStrip" aria-label="P10 certified artifact lineage">
          {model.layers.map((layer, index) => (
            <div className="impactLineageItem" key={layer.layer}>
              <div>
                <span>{layer.layer}</span>
                <strong>{layer.label}</strong>
                <small title={layer.reportFingerprint}>
                  {shortFingerprint(layer.reportFingerprint)}
                </small>
              </div>
              {index < model.layers.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
            </div>
          ))}
        </section>

        <section className="impactSummaryGrid" aria-label="Impact evidence availability summary">
          <article className="card impactSummaryCard">
            <GitBranch aria-hidden="true" />
            <span>Lineage layers</span>
            <strong>{model.summary.lineageLayers}</strong>
            <small>Exact P10.1 → P10.6 projection chain</small>
          </article>
          <article className="card impactSummaryCard">
            <CalendarRange aria-hidden="true" />
            <span>Outcome observations</span>
            <strong>{model.summary.outcomes}</strong>
            <small>{model.summary.comparisonsAvailable} comparison-available · {model.summary.comparisonsUnavailable} unavailable</small>
          </article>
          <article className="card impactSummaryCard">
            <Beaker aria-hidden="true" />
            <span>Holdout definitions</span>
            <strong>{model.summary.holdouts}</strong>
            <small>{label(model.experiment.assignmentBasis)} basis · provenance only</small>
          </article>
          <article className="card impactSummaryCard">
            <Activity aria-hidden="true" />
            <span>Directional signals</span>
            <strong>{model.summary.calibrationSignals}</strong>
            <small>{model.summary.calibrationAvailable} available · {model.summary.calibrationUnavailable} unavailable</small>
          </article>
          <article className="card impactSummaryCard">
            <Target aria-hidden="true" />
            <span>Structural context</span>
            <strong>{model.summary.structuralFlags + model.summary.treatmentConfounders}</strong>
            <small>{model.summary.structuralFlags} structural flags · {model.summary.treatmentConfounders} treatment confounders</small>
          </article>
          <article className="card impactSummaryCard">
            <Database aria-hidden="true" />
            <span>Live loading</span>
            <strong>Disabled</strong>
            <small>Synthetic presentation fixture only</small>
          </article>
        </section>

        <section className="impactContextGrid">
          <article className="card impactContextCard" aria-labelledby="impact-action-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">P10.1 + P10.2 DIRECT LINEAGE</p>
                <h2 id="impact-action-heading">Action, recommendation & association</h2>
              </div>
            </div>
            <dl className="impactFacts">
              <div><dt>Action</dt><dd>{treatment.actionId}</dd></div>
              <div><dt>Recommendation</dt><dd>{treatment.recommendationId}</dd></div>
              <div><dt>Recommendation fingerprint</dt><dd title={treatment.recommendationFingerprint}>{shortFingerprint(treatment.recommendationFingerprint)}</dd></div>
              <div><dt>Retained-live anchor</dt><dd>{formatUtc(treatment.anchorAt)}</dd></div>
              <div><dt>Page</dt><dd>{association.pageId}</dd></div>
              <div><dt>URL</dt><dd>{association.url}</dd></div>
              <div><dt>Query</dt><dd>{association.query}</dd></div>
              <div><dt>Category</dt><dd>{association.category}</dd></div>
            </dl>
            <p className="impactContextNote">
              Exact association is lineage only. Shared page/query/category facts do not prove the action caused later metric movement.
            </p>
          </article>

          <article className="card impactContextCard" aria-labelledby="impact-window-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">P10.3 + P10.4 ANALYSIS FRAME</p>
                <h2 id="impact-window-heading">Windows, holdout & structural context</h2>
              </div>
            </div>
            <div className="impactWindowGrid">
              <div>
                <span>Before window</span>
                <strong>{formatUtc(model.windows.before.start)}</strong>
                <small>through {formatUtc(model.windows.before.end)}</small>
              </div>
              <div>
                <span>After window</span>
                <strong>{formatUtc(model.windows.after.start)}</strong>
                <small>through {formatUtc(model.windows.after.end)}</small>
              </div>
            </div>
            <dl className="impactFacts impactFactsCompact">
              <div><dt>Assignment basis</dt><dd>{label(model.experiment.assignmentBasis)}</dd></div>
              <div><dt>Holdouts</dt><dd>{model.experiment.holdoutCount}</dd></div>
              <div><dt>Structural flags</dt><dd>{model.summary.structuralFlags}</dd></div>
              <div><dt>Treatment confounders</dt><dd>{model.summary.treatmentConfounders}</dd></div>
            </dl>
            <p className="impactContextNote">
              Window membership, holdout presence, and structural/confounder flags are descriptive only and do not perform causal adjustment.
            </p>
          </article>
        </section>

        <section className="card impactPanel" aria-labelledby="impact-outcome-heading">
          <div className="sectionHead impactPanelHead">
            <div>
              <p className="eyebrow">P10.5 EXPECTED VS ACTUAL</p>
              <h2 id="impact-outcome-heading">Outcome arithmetic</h2>
              <p>
                Exact supplied values and signed differences. Above/equal/below is numeric order only—not good/bad, success/failure, uplift, or causal effect.
              </p>
            </div>
            <StatusBadge tone="info">MODEL {model.modelFingerprint}</StatusBadge>
          </div>
          <DataGrid
            data={model.outcomes}
            columns={outcomeColumns}
            getRowId={(row) => row.actualFingerprint}
            label="Expected versus actual outcome evidence"
            searchPlaceholder="Search metric, expectation, state or relation"
            initialPageSize={10}
            emptyMessage="No supplied P10.5 outcome rows are available."
          />
        </section>

        <section className="card impactPanel" aria-labelledby="impact-calibration-heading">
          <div className="sectionHead impactPanelHead">
            <div>
              <p className="eyebrow">P10.6 DIRECTIONAL CALIBRATION</p>
              <h2 id="impact-calibration-heading">Recommendation calibration signals</h2>
              <p>
                Per-actual directional evidence only. A signal is not recommendation quality, reward/penalty, model feedback, ranking weight, or execution advice.
              </p>
            </div>
          </div>
          <DataGrid
            data={model.calibrations}
            columns={calibrationColumns}
            getRowId={(row) => row.signalFingerprint}
            label="Directional calibration signals"
            searchPlaceholder="Search calibration key, role, actual or signal"
            initialPageSize={10}
            emptyMessage="No supplied P10.6 calibration signals are available."
          />
        </section>

        <section className="impactBottomGrid">
          <article className="card impactGuardrailPanel" aria-labelledby="impact-guardrail-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">INTERPRETATION GUARDRAILS</p>
                <h2 id="impact-guardrail-heading">What this workspace does not claim</h2>
              </div>
            </div>
            <ul>
              {model.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
            </ul>
          </article>

          <article className="card impactDiagnosticsPanel" aria-labelledby="impact-diagnostic-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">DIAGNOSTICS</p>
                <h2 id="impact-diagnostic-heading">Explicit limitations</h2>
              </div>
            </div>
            <ul>
              {model.diagnostics.map((diagnostic) => <li key={diagnostic}>{diagnostic}</li>)}
            </ul>
            <p>
              Synthetic fixture only. No API client, provider call, Production database read/write, scheduler, worker, recommendation mutation, model update, policy update, site write, execution, deployment, or publication is enabled here.
            </p>
          </article>
        </section>
      </div>
    </>
  );
}

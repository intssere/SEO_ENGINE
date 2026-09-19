import "./ai-visibility.css";
import {
  Bot,
  Database,
  Eye,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DataGrid, type DataGridColumn } from "../components/data-grid";
import { StatusBadge } from "../components/status-badge";
import {
  P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE,
  buildAiVisibilityUiModel,
  formatArithmeticDirection,
  formatVisibilityScore,
  mentionTone,
  scoreTone,
  type UiAiOpportunityRow,
  type UiAnswerObservationRow,
  type UiCitationComparisonRow,
  type UiVisibilityScoreRow,
} from "@/lib/ai-visibility-ui-model";

const model = buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);

function label(value: string) {
  return value.replaceAll("_", " ");
}

const answerColumns: DataGridColumn<UiAnswerObservationRow>[] = [
  {
    id: "provider",
    header: "Provider / model",
    getValue: (row) => row.providerKey + " " + row.modelKey,
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilityCell">
        <strong>{row.providerKey}</strong>
        <small>{row.modelKey}</small>
      </div>
    ),
  },
  {
    id: "prompt",
    header: "Prompt",
    accessorKey: "promptKey",
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilityCell">
        <strong>{row.promptKey}</strong>
        <small>{row.promptSetKey}</small>
      </div>
    ),
  },
  {
    id: "brand",
    header: "Tracked brand",
    accessorKey: "trackedBrand",
    searchable: true,
  },
  {
    id: "mention",
    header: "Brand mention evidence",
    accessorKey: "brandMentionState",
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilityCell">
        <StatusBadge tone={mentionTone(row.brandMentionState)}>
          {label(row.brandMentionState).toUpperCase()}
        </StatusBadge>
        <small>{row.brandMentionEvidenceCount} explicit evidence refs</small>
      </div>
    ),
  },
  {
    id: "citations",
    header: "Citations",
    accessorKey: "citationCount",
  },
  {
    id: "observedAt",
    header: "Observed",
    accessorKey: "observedAt",
    cell: (_value, row) =>
      new Date(row.observedAt).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
  },
];

const comparisonColumns: DataGridColumn<UiCitationComparisonRow>[] = [
  {
    id: "pair",
    header: "Brand pair",
    getValue: (row) => row.trackedBrand + " " + row.competitorBrand,
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilityCell">
        <strong>{row.trackedBrand}</strong>
        <small>vs {row.competitorBrand} · {row.groupKey}</small>
      </div>
    ),
  },
  {
    id: "sharedMentions",
    header: "Shared mention prompts",
    accessorKey: "sharedMentionPrompts",
  },
  {
    id: "trackedMentions",
    header: "Tracked-only mentions",
    accessorKey: "trackedOnlyMentionPrompts",
  },
  {
    id: "competitorMentions",
    header: "Competitor-only mentions",
    accessorKey: "competitorOnlyMentionPrompts",
  },
  {
    id: "sharedDomains",
    header: "Shared citation domains",
    accessorKey: "sharedCitationDomains",
  },
  {
    id: "trackedDomains",
    header: "Tracked-only domains",
    accessorKey: "trackedOnlyCitationDomains",
  },
  {
    id: "competitorDomains",
    header: "Competitor-only domains",
    accessorKey: "competitorOnlyCitationDomains",
  },
];

const scoreColumns: DataGridColumn<UiVisibilityScoreRow>[] = [
  {
    id: "scope",
    header: "Provider / model",
    getValue: (row) => row.providerKey + " " + row.modelKey,
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilityCell">
        <strong>{row.providerKey}</strong>
        <small>{row.modelKey} · {row.promptSetKey}</small>
      </div>
    ),
  },
  {
    id: "brand",
    header: "Brand",
    accessorKey: "brandKey",
    searchable: true,
  },
  {
    id: "score",
    header: "P7.5 score",
    accessorKey: "score100",
    cell: (_value, row) => (
      <StatusBadge tone={scoreTone(row)}>
        {formatVisibilityScore(row.score100)}
      </StatusBadge>
    ),
  },
  {
    id: "previous",
    header: "Previous",
    accessorKey: "previousScore100",
    cell: (_value, row) => formatVisibilityScore(row.previousScore100),
  },
  {
    id: "direction",
    header: "History delta",
    getValue: (row) => row.delta100,
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilityCell">
        <strong>{formatArithmeticDirection(row)}</strong>
        <small>Arithmetic only · no improvement/regression label</small>
      </div>
    ),
  },
  {
    id: "coverage",
    header: "Component coverage",
    accessorKey: "componentCoverage",
  },
  {
    id: "history",
    header: "History points",
    accessorKey: "historyPoints",
  },
];

const opportunityColumns: DataGridColumn<UiAiOpportunityRow>[] = [
  {
    id: "kind",
    header: "P6.1 AI kind",
    accessorKey: "kind",
    searchable: true,
    cell: (_value, row) => (
      <StatusBadge tone="info">{row.kind.toUpperCase()}</StatusBadge>
    ),
  },
  {
    id: "subject",
    header: "Subject",
    accessorKey: "subjectKey",
    searchable: true,
    cell: (_value, row) => (
      <div className="aiVisibilitySubject">
        <strong>{row.subjectKey}</strong>
        <small title={row.opportunityFingerprint}>
          {row.opportunityFingerprint.slice(0, 12)}…
        </small>
      </div>
    ),
  },
  {
    id: "request",
    header: "Integration request",
    getValue: (row) => row.explicitRequest,
    cell: () => <StatusBadge tone="success">EXPLICIT</StatusBadge>,
  },
  {
    id: "score",
    header: "P6.2 score",
    accessorKey: "p6Score",
    cell: () => "Not scored",
  },
  {
    id: "citationDomains",
    header: "Citation domains",
    accessorKey: "citationDomainCount",
  },
  {
    id: "recommendation",
    header: "Recommendation",
    getValue: (row) => row.recommendationGenerated,
    cell: () => "Not generated",
  },
  {
    id: "execution",
    header: "Execution",
    getValue: (row) => row.executionAuthorized,
    cell: () => <StatusBadge>NOT AUTHORIZED</StatusBadge>,
  },
];

export default function AiVisibilityPage() {
  return (
    <>
      <header className="topbar">
        <div>
          <strong>Discover</strong>
          <span className="muted"> AI Visibility</span>
        </div>
        <div className="aiVisibilityTopbarBadges">
          <StatusBadge tone="info">SYNTHETIC READ-ONLY</StatusBadge>
          <StatusBadge>DEFAULT-OFF</StatusBadge>
          <StatusBadge>LIVE DISABLED</StatusBadge>
        </div>
      </header>

      <div className="content aiVisibilityWorkspace">
        <section className="aiVisibilityHero" aria-labelledby="ai-visibility-title">
          <div>
            <p className="eyebrow">AI / GEO EVIDENCE WORKSPACE</p>
            <h1 id="ai-visibility-title">AI Visibility workspace</h1>
            <p className="muted">
              Deterministic P7.1–P7.6-shaped synthetic evidence for crawler access,
              prompt coverage, supplied answers/citations, descriptive comparisons,
              evidence-bound scores and explicit P6.1 AI opportunity projections.
            </p>
          </div>
          <div className="aiVisibilityHeroState">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>No live AI/provider collection from this workspace</strong>
              <span>
                Provider calls, credentials, persistence, database access, P6 execution,
                site mutation, schedulers/workers and publication remain disabled.
              </span>
            </div>
          </div>
        </section>

        <section className="aiVisibilityScopeStrip" aria-label="AI Visibility scope and lineage">
          <div>
            <span>Site</span>
            <strong>{model.siteLabel}</strong>
          </div>
          <div>
            <span>Prompt set</span>
            <strong>{model.promptTopics.activePromptSetLabel}</strong>
          </div>
          <div>
            <span>Reference time</span>
            <strong>{new Date(model.referenceTime).toLocaleString("en-US", { timeZone: "UTC" })} UTC</strong>
          </div>
          <div>
            <span>Lineage</span>
            <strong>P7.1 → P7.6 certified shapes</strong>
          </div>
          <div>
            <span>Report fingerprint</span>
            <strong title={model.reportFingerprint}>{model.reportFingerprintShort}</strong>
          </div>
        </section>

        <section className="aiVisibilitySummaryGrid" aria-label="AI Visibility summary">
          <article className="card aiVisibilitySummaryCard">
            <Bot aria-hidden="true" />
            <span>Crawler accessibility</span>
            <strong>{model.summary.crawlerAccessible} / {model.summary.crawlerTotal}</strong>
            <small>Accessible supplied probes · not indexing or consent</small>
          </article>
          <article className="card aiVisibilitySummaryCard">
            <Layers3 aria-hidden="true" />
            <span>Prompt/topic catalog</span>
            <strong>{model.summary.prompts} prompts</strong>
            <small>{model.summary.topics} topics · {model.summary.promptSets} sets · no demand inference</small>
          </article>
          <article className="card aiVisibilitySummaryCard">
            <MessageSquareText aria-hidden="true" />
            <span>Answer observations</span>
            <strong>{model.summary.answerObservations}</strong>
            <small>Exact supplied evidence · {model.summary.citedAnswers} with citations</small>
          </article>
          <article className="card aiVisibilitySummaryCard">
            <Eye aria-hidden="true" />
            <span>Score profiles</span>
            <strong>{model.summary.scoredProfiles}</strong>
            <small>{model.summary.unscorableProfiles} unscorable · null stays distinct from zero</small>
          </article>
          <article className="card aiVisibilitySummaryCard">
            <Sparkles aria-hidden="true" />
            <span>P6.1 projections</span>
            <strong>{model.summary.projectedOpportunities}</strong>
            <small>Explicit-request-only · no P6.2 scoring</small>
          </article>
          <article className="card aiVisibilitySummaryCard">
            <Database aria-hidden="true" />
            <span>Live collection</span>
            <strong>Disabled</strong>
            <small>Synthetic fixture only</small>
          </article>
        </section>

        <section className="card aiVisibilityPanel" aria-labelledby="ai-answer-heading">
          <div className="sectionHead aiVisibilityPanelHead">
            <div>
              <p className="eyebrow">P7.3 SUPPLIED OBSERVATIONS</p>
              <h2 id="ai-answer-heading">Provider/model answer observations</h2>
              <p>
                Brand-mention and citation evidence exactly as supplied. Mention evidence
                does not establish correctness, sentiment or endorsement.
              </p>
            </div>
          </div>
          <DataGrid
            data={model.answers}
            columns={answerColumns}
            getRowId={(row) => row.observationFingerprint}
            label="AI answer observations"
            searchPlaceholder="Search provider, model, prompt or brand"
            initialPageSize={10}
          />
        </section>

        <section className="card aiVisibilityPanel" aria-labelledby="ai-comparison-heading">
          <div className="sectionHead aiVisibilityPanelHead">
            <div>
              <p className="eyebrow">P7.4 DESCRIPTIVE COMPARISON</p>
              <h2 id="ai-comparison-heading">Citation and competitor evidence</h2>
              <p>
                Mention overlap and citation-domain co-occurrence only. These counts do not
                establish support, endorsement, association, winner status or market share.
              </p>
            </div>
          </div>
          <DataGrid
            data={model.comparisons}
            columns={comparisonColumns}
            getRowId={(row) => row.comparisonFingerprint}
            label="Citation competitor evidence"
            searchPlaceholder="Search brand pair or comparison group"
            initialPageSize={10}
          />
        </section>

        <section className="card aiVisibilityPanel" aria-labelledby="ai-score-heading">
          <div className="sectionHead aiVisibilityPanelHead">
            <div>
              <p className="eyebrow">P7.5 EVIDENCE-BOUND SCORING</p>
              <h2 id="ai-score-heading">Visibility score and history</h2>
              <p>
                Scores remain inside their exact provider/model/profile frame. Arithmetic
                history direction is not an improvement/regression label and is not a cross-provider ranking.
              </p>
            </div>
          </div>
          <DataGrid
            data={model.scores}
            columns={scoreColumns}
            getRowId={(row) => row.scoreFingerprint}
            label="AI visibility score history"
            searchPlaceholder="Search provider, model, brand or prompt set"
            initialPageSize={10}
          />
        </section>

        <section className="card aiVisibilityPanel" aria-labelledby="ai-opportunity-heading">
          <div className="sectionHead aiVisibilityPanelHead">
            <div>
              <p className="eyebrow">P7.6 → P6.1 LINEAGE</p>
              <h2 id="ai-opportunity-heading">AI/GEO opportunity integrations</h2>
              <p>
                Explicit integration requests only. P7.5 score evidence is not reused as a
                P6.2 score, and P6.1 opportunity projection is not recommendation or execution.
              </p>
            </div>
          </div>
          <DataGrid
            data={model.opportunities}
            columns={opportunityColumns}
            getRowId={(row) => row.integrationFingerprint}
            label="AI GEO opportunity integrations"
            searchPlaceholder="Search AI opportunity kind or subject"
            initialPageSize={10}
          />
        </section>

        <section className="aiVisibilityBottomGrid">
          <article className="card aiVisibilityGuardrailPanel" aria-labelledby="ai-guardrails-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">INTERPRETATION GUARDRAILS</p>
                <h2 id="ai-guardrails-heading">What this workspace does not claim</h2>
              </div>
            </div>
            <ul>
              {model.guardrails.map((guardrail) => (
                <li key={guardrail}>{guardrail}</li>
              ))}
            </ul>
          </article>

          <article className="card aiVisibilityDiagnosticsPanel" aria-labelledby="ai-diagnostics-heading">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">DIAGNOSTICS</p>
                <h2 id="ai-diagnostics-heading">Explicit evidence limitations</h2>
              </div>
            </div>
            <ul>
              {model.diagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
            <p>
              All rows are synthetic presentation fixtures. No runtime API binding, live
              provider collection, persistence, database read/write, scheduler, worker or
              site mutation is enabled.
            </p>
          </article>
        </section>
      </div>
    </>
  );
}

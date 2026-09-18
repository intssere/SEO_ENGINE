import "./search-intelligence.css";
import { Database, Eye, Link2, ShieldCheck, TrendingUp } from "lucide-react";
import { DataGrid, type DataGridColumn } from "../components/data-grid";
import { StatusBadge } from "../components/status-badge";
import {
  P5_7_SYNTHETIC_REPORT_FIXTURE,
  buildCompetitorIntelligenceUiModel,
  competitorStateTone,
  formatNullableNumber,
  formatPercent,
  linkGapTone,
  trendTone,
  type UiCompetitorVisibilityRow,
  type UiLinkGapRow,
  type UiPageSemanticGapRow,
  type UiTopicGapRow,
} from "@/lib/competitor-intelligence-ui-model";

const model = buildCompetitorIntelligenceUiModel(P5_7_SYNTHETIC_REPORT_FIXTURE);

function label(value: string) {
  return value.replaceAll("_", " ");
}

function confidence(value: number) {
  return formatPercent(value);
}

function semanticDifferenceLabels(row: UiPageSemanticGapRow) {
  const labels: string[] = [];
  if (row.semanticDifferences.keywordThemes.length) labels.push("Keyword themes");
  if (row.semanticDifferences.taxonomyLabels.length) labels.push("Taxonomy");
  if (row.semanticDifferences.schemaTypes.length) labels.push("Schema");
  if (row.semanticDifferences.entityTypes.length) labels.push("Entities");
  if (row.semanticDifferences.internalLinkPatterns.length) labels.push("Internal links");
  return labels;
}

const competitorColumns: DataGridColumn<UiCompetitorVisibilityRow>[] = [
  {
    id: "domain",
    header: "Competitor",
    accessorKey: "domain",
    searchable: true,
    cell: (_value, row) => (
      <div className="competitorIdentity">
        <strong>{row.domain}</strong>
        <small>Manually reviewed target</small>
      </div>
    ),
  },
  {
    id: "visibility",
    header: "Visible / measured",
    getValue: (row) => row.visibleTopicCount,
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{row.visibleTopicCount} / {row.observedSerpTopicCount}</strong>
        <small>{formatPercent(row.observedTopicVisibilityRatio)} observed-topic visibility</small>
      </div>
    ),
  },
  {
    id: "top10",
    header: "Top 10",
    accessorKey: "top10VisibleTopicCount",
  },
  {
    id: "bestRank",
    header: "Best rank",
    accessorKey: "bestObservedOrganicRank",
    cell: (_value, row) => formatNullableNumber(row.bestObservedOrganicRank),
  },
  {
    id: "competitorOnly",
    header: "Competitor-only topics",
    accessorKey: "competitorOnlyVisibleTopicCount",
  },
  {
    id: "pageEvidence",
    header: "Page evidence",
    getValue: (row) => row.pageEvidenceCount,
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{row.pageEvidenceCount}</strong>
        <small>{row.semanticDifferencePageCount} with structural differences</small>
      </div>
    ),
  },
  {
    id: "authority",
    header: "Backlink authority",
    getValue: (row) => row.backlinkAuthority?.value,
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{formatNullableNumber(row.backlinkAuthority?.value ?? null)}</strong>
        <small>
          {row.backlinkAuthority
            ? `${row.backlinkAuthority.metricName} · provider-native · not cross-provider comparable`
            : "Unavailable"}
        </small>
      </div>
    ),
  },
  {
    id: "linkGaps",
    header: "Link gap / shared",
    getValue: (row) => row.backlinkGapReferringDomainCount,
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{row.backlinkGapReferringDomainCount} / {row.backlinkSharedCoverageReferringDomainCount}</strong>
        <small>Gap domains / shared coverage</small>
      </div>
    ),
  },
];

const topicColumns: DataGridColumn<UiTopicGapRow>[] = [
  {
    id: "topic",
    header: "Topic",
    accessorKey: "topic",
    searchable: true,
  },
  {
    id: "serpState",
    header: "SERP state",
    accessorKey: "serpState",
    searchable: true,
    cell: (_value, row) => (
      <StatusBadge tone={competitorStateTone(row.serpState)}>
        {label(row.serpState).toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    id: "semanticState",
    header: "Semantic state",
    accessorKey: "semanticState",
    searchable: true,
    cell: (_value, row) => (
      <StatusBadge tone={competitorStateTone(row.semanticState)}>
        {label(row.semanticState).toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    id: "gap",
    header: "Observed gap",
    getValue: (row) => row.topicGapObserved,
    cell: (_value, row) => (
      <StatusBadge tone={row.topicGapObserved ? "warning" : "neutral"}>
        {row.topicGapObserved ? "OBSERVED" : "NOT OBSERVED"}
      </StatusBadge>
    ),
  },
  {
    id: "ownedRank",
    header: "Owned rank",
    accessorKey: "ownedBestRank",
    cell: (_value, row) => formatNullableNumber(row.ownedBestRank),
  },
  {
    id: "competitorRank",
    header: "Competitor presence",
    getValue: (row) => row.competitorBestRank,
    searchable: true,
    cell: (_value, row) =>
      row.competitorSerpPresence.length ? (
        <div className="topicPresenceList">
          {row.competitorSerpPresence.map((entry) => (
            <span key={entry.domain}>{entry.domain} · #{entry.bestRank}</span>
          ))}
        </div>
      ) : (
        "Unavailable"
      ),
  },
  {
    id: "searchVolume",
    header: "Search volume",
    getValue: (row) => row.keywordMetrics?.avgMonthlySearchVolume,
    cell: (_value, row) =>
      formatNullableNumber(row.keywordMetrics?.avgMonthlySearchVolume ?? null),
  },
  {
    id: "difficulty",
    header: "Difficulty",
    getValue: (row) => row.keywordMetrics?.organicDifficultyScore,
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{formatNullableNumber(row.keywordMetrics?.organicDifficultyScore ?? null)}</strong>
        <small>{row.keywordMetrics ? "Provider-native · not cross-provider comparable" : "Unavailable"}</small>
      </div>
    ),
  },
  {
    id: "trend",
    header: "Trend",
    getValue: (row) => row.trend?.latestRelativeIndex,
    cell: (_value, row) =>
      row.trend ? (
        <div className="topicTrendCell">
          <StatusBadge tone={trendTone(row.trend.direction)}>
            {row.trend.direction.toUpperCase()}
          </StatusBadge>
          <small>Index {formatNullableNumber(row.trend.latestRelativeIndex)} · frame-bound</small>
        </div>
      ) : (
        "Unavailable"
      ),
  },
];

const pageColumns: DataGridColumn<UiPageSemanticGapRow>[] = [
  {
    id: "competitor",
    header: "Competitor",
    accessorKey: "competitorDomain",
    searchable: true,
  },
  {
    id: "page",
    header: "Page",
    accessorKey: "pageKey",
    searchable: true,
    cell: (_value, row) => (
      <div className="competitorPageIdentity">
        <strong>{row.pageKey}</strong>
        <small>{row.sourceUrl}</small>
      </div>
    ),
  },
  {
    id: "pageType",
    header: "Page type",
    accessorKey: "pageType",
    searchable: true,
    cell: (_value, row) => row.pageType ?? "Unavailable",
  },
  {
    id: "differenceCount",
    header: "Structural differences",
    accessorKey: "semanticDifferenceCount",
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{row.semanticDifferenceCount}</strong>
        <small>{semanticDifferenceLabels(row).join(" · ") || "None observed"}</small>
      </div>
    ),
  },
  {
    id: "serpAppearances",
    header: "SERP appearances",
    accessorKey: "serpTopicAppearanceCount",
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{row.serpTopicAppearanceCount}</strong>
        <small>{row.observedSerpTopics.join(" · ") || "Unavailable"}</small>
      </div>
    ),
  },
  {
    id: "bestRank",
    header: "Best rank",
    accessorKey: "bestObservedOrganicRank",
    cell: (_value, row) => formatNullableNumber(row.bestObservedOrganicRank),
  },
  {
    id: "confidence",
    header: "Confidence",
    accessorKey: "confidence",
    cell: (_value, row) => confidence(row.confidence),
  },
];

const linkColumns: DataGridColumn<UiLinkGapRow>[] = [
  {
    id: "referringDomain",
    header: "Referring domain",
    accessorKey: "referringDomain",
    searchable: true,
  },
  {
    id: "classification",
    header: "Classification",
    accessorKey: "classification",
    searchable: true,
    cell: (_value, row) => (
      <StatusBadge tone={linkGapTone(row.classification)}>
        {label(row.classification).toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    id: "competitorCoverage",
    header: "Competitor coverage",
    accessorKey: "competitorCoverageRatio",
    cell: (_value, row) => (
      <div className="competitorMetricCell">
        <strong>{formatPercent(row.competitorCoverageRatio)}</strong>
        <small>{row.competitorPresenceCount} reviewed competitors present</small>
      </div>
    ),
  },
  {
    id: "authority",
    header: "Authority",
    accessorKey: "authority",
    cell: (_value, row) => formatNullableNumber(row.authority),
  },
  {
    id: "freshness",
    header: "Freshness",
    accessorKey: "freshnessState",
    searchable: true,
    cell: (_value, row) => (
      <StatusBadge tone={row.freshnessState === "fresh" ? "success" : "neutral"}>
        {row.freshnessState.toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    id: "ownedPresent",
    header: "Owned present",
    accessorKey: "ownedPresent",
    cell: (_value, row) => (row.ownedPresent ? "Yes" : "No"),
  },
];

export default function SearchIntelligencePage() {
  return (
    <>
      <header className="topbar">
        <div>
          <strong>Market</strong>
          <span className="muted"> Search Intelligence</span>
        </div>
        <div className="competitorTopbarBadges">
          <StatusBadge tone="info">SYNTHETIC READ-ONLY</StatusBadge>
          <StatusBadge>DEFAULT-OFF</StatusBadge>
        </div>
      </header>

      <div className="content competitorWorkspace">
        <section className="competitorHero" aria-labelledby="competitor-intelligence-title">
          <div>
            <p className="eyebrow">CATEGORY / MARKET INTELLIGENCE</p>
            <h1 id="competitor-intelligence-title">Competitor intelligence workspace</h1>
            <p className="muted">
              Deterministic P5.6 report fixture for descriptive visibility, page,
              topic and backlink-gap evidence. Observed-topic visibility is limited
              to this supplied cohort and is not market share.
            </p>
          </div>
          <div className="competitorHeroState">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>No live competitor collection from this workspace</strong>
              <span>
                No provider request, public-site fetch, target mutation, persistence,
                Task #64/#70 execution or scheduler action is exposed here.
              </span>
            </div>
          </div>
        </section>

        <section className="competitorScopeStrip" aria-label="Competitor intelligence scope and lineage">
          <div>
            <span>Market</span>
            <strong>{model.marketLabel}</strong>
          </div>
          <div>
            <span>Category</span>
            <strong>{model.categoryLabel}</strong>
          </div>
          <div>
            <span>Owned target</span>
            <strong>{model.ownedDomain}</strong>
          </div>
          <div>
            <span>Reference time</span>
            <strong>{new Date(model.referenceTime).toLocaleString("en-US", { timeZone: "UTC" })} UTC</strong>
          </div>
          <div>
            <span>Report fingerprint</span>
            <strong title={model.reportFingerprint}>{model.reportFingerprintShort}</strong>
          </div>
        </section>

        <section className="competitorSummaryGrid" aria-label="Competitor intelligence summary">
          <article className="card competitorSummaryCard">
            <Eye aria-hidden="true" />
            <span>Reviewed competitors</span>
            <strong>{model.summary.reviewedCompetitors}</strong>
            <small>Explicit manual-review cohort</small>
          </article>
          <article className="card competitorSummaryCard">
            <TrendingUp aria-hidden="true" />
            <span>Supplied SERP topics</span>
            <strong>{model.summary.serpTopics}</strong>
            <small>Exact-keyword measurement cohort</small>
          </article>
          <article className="card competitorSummaryCard">
            <Database aria-hidden="true" />
            <span>Observed topic gaps</span>
            <strong>{model.summary.observedTopicGaps}</strong>
            <small>Descriptive competitor-only evidence</small>
          </article>
          <article className="card competitorSummaryCard">
            <Link2 aria-hidden="true" />
            <span>Link-gap domains</span>
            <strong>{model.summary.linkGapReferringDomains}</strong>
            <small>P5.5 classifications retained</small>
          </article>
          <article className="card competitorSummaryCard">
            <Database aria-hidden="true" />
            <span>Diagnostics</span>
            <strong>{model.summary.diagnostics}</strong>
            <small>Unavailable evidence remains explicit</small>
          </article>
          <article className="card competitorSummaryCard">
            <ShieldCheck aria-hidden="true" />
            <span>Opportunity score</span>
            <strong>Unavailable</strong>
            <small>P6 owns cross-signal prioritization</small>
          </article>
        </section>

        <section className="card competitorPanel" aria-labelledby="competitor-visibility-heading">
          <div className="sectionHead competitorPanelHead">
            <div>
              <p className="eyebrow">REVIEWED COMPETITORS</p>
              <h2 id="competitor-visibility-heading">Observed visibility</h2>
              <p>
                Rows remain domain-sorted. No best/worst competitor ordering is applied.
              </p>
            </div>
            <StatusBadge tone="info">DESCRIPTIVE ONLY</StatusBadge>
          </div>
          <DataGrid
            data={model.competitors}
            columns={competitorColumns}
            getRowId={(row) => row.domain}
            label="Competitor visibility"
            searchPlaceholder="Search competitor domain"
            initialPageSize={25}
          />
        </section>

        <section className="card competitorPanel" aria-labelledby="topic-gap-heading">
          <div className="sectionHead competitorPanelHead">
            <div>
              <p className="eyebrow">EXACT TOPIC EVIDENCE</p>
              <h2 id="topic-gap-heading">Topic gaps</h2>
              <p>
                SERP and semantic states remain separate; a gap flag does not provide action guidance.
              </p>
            </div>
            <StatusBadge tone="warning">NO P6 SCORE</StatusBadge>
          </div>
          <DataGrid
            data={model.topics}
            columns={topicColumns}
            getRowId={(row) => row.topic}
            label="Topic gap evidence"
            searchPlaceholder="Search topic or state"
            initialPageSize={25}
          />
        </section>

        <section className="card competitorPanel" aria-labelledby="page-gap-heading">
          <div className="sectionHead competitorPanelHead">
            <div>
              <p className="eyebrow">STRUCTURAL PAGE EVIDENCE</p>
              <h2 id="page-gap-heading">Page semantic differences</h2>
              <p>
                Task #58 structural observations only. Differences do not establish that an owned page is missing.
              </p>
            </div>
            <StatusBadge>READ-ONLY</StatusBadge>
          </div>
          <DataGrid
            data={model.pages}
            columns={pageColumns}
            getRowId={(row) => `${row.competitorDomain}:${row.pageKey}`}
            label="Page semantic differences"
            searchPlaceholder="Search competitor, page or type"
            initialPageSize={25}
          />
        </section>

        <section className="card competitorPanel" aria-labelledby="link-gap-heading">
          <div className="sectionHead competitorPanelHead">
            <div>
              <p className="eyebrow">BACKLINK COVERAGE</p>
              <h2 id="link-gap-heading">Link-gap evidence</h2>
              <p>
                P5.5 referring-domain classifications are re-projected without link-quality or outreach inference.
              </p>
            </div>
            <StatusBadge>PROVIDER-NATIVE AUTHORITY</StatusBadge>
          </div>
          <DataGrid
            data={model.links}
            columns={linkColumns}
            getRowId={(row) => row.referringDomain}
            label="Link gap evidence"
            searchPlaceholder="Search referring domain or class"
            initialPageSize={25}
          />
        </section>

        <section className="competitorBottomGrid">
          <article className="card competitorSemanticsPanel">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">INTERPRETATION BOUNDARY</p>
                <h2>What this workspace does not claim</h2>
              </div>
              <StatusBadge tone="success">GUARDRAILS ACTIVE</StatusBadge>
            </div>
            <ul>
              {model.semantics.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="card competitorDiagnosticsPanel">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">DATA COVERAGE</p>
                <h2>Diagnostics</h2>
              </div>
              <StatusBadge tone={model.diagnostics.length ? "warning" : "success"}>
                {model.diagnostics.length ? "PARTIAL" : "COMPLETE FIXTURE"}
              </StatusBadge>
            </div>
            {model.diagnostics.length ? (
              <ul>
                {model.diagnostics.map((item) => <li key={item}>{label(item)}</li>)}
              </ul>
            ) : (
              <p>
                All P5.7 synthetic artifact families are present. This does not imply live provider availability.
              </p>
            )}
          </article>
        </section>
      </div>
    </>
  );
}

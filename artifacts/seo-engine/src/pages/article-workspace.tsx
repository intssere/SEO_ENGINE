import {
  BookOpenCheck,
  FileText,
  Link2,
  ListTree,
  SearchCheck,
  ShieldCheck,
  SquarePen,
  Workflow,
} from "lucide-react";
import { StatusBadge } from "../components/status-badge";
import {
  buildArticleWorkspaceModel,
  type ArticleWorkspaceStatus,
} from "../lib/article-workspace-model";

const model = buildArticleWorkspaceModel(null);

function tone(status: ArticleWorkspaceStatus) {
  if (status === "pass" || status === "available") return "success" as const;
  if (status === "warning") return "warning" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "not_published") return "info" as const;
  return "neutral" as const;
}

function label(status: ArticleWorkspaceStatus | "published") {
  return status.replaceAll("_", " ").toUpperCase();
}

function UnavailablePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#d7deea] bg-[#f8fafc] p-4">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm text-[#26364d]">{title}</strong>
        <StatusBadge>UNAVAILABLE</StatusBadge>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#647087]">{description}</p>
    </div>
  );
}

export default function ArticleWorkspacePage() {
  const snapshot = model.snapshot;

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Article workspace</strong>
          <span className="muted"> Evidence-backed content workflow</span>
        </div>
        <StatusBadge tone={snapshot ? "info" : "neutral"}>
          {snapshot ? "FROZEN ARTIFACT" : "READ MODEL UNBOUND"}
        </StatusBadge>
      </header>

      <main className="content">
        <section className="mb-5 rounded-xl border border-[#dfe5ee] bg-white p-6 shadow-sm">
          <p className="eyebrow">ARTICLE WORKSPACE</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#172033]">{model.title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#647087]">
                {model.subtitle}
              </p>
            </div>
            <StatusBadge tone={snapshot ? tone(snapshot.publication.status) : "info"}>
              {snapshot ? label(snapshot.publication.status) : "NOT PUBLISHED"}
            </StatusBadge>
          </div>
          <div className="mt-4 rounded-lg border border-[#d8e3f2] bg-[#f5f8fc] px-4 py-3 text-xs leading-5 text-[#536078]">
            {model.notice}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3" aria-label="Article workflow status">
          <article className="card p-5">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
              <h2 className="font-semibold text-[#172033]">Research progress</h2>
            </div>
            {snapshot ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{snapshot.research.summary}</span>
                  <StatusBadge tone={tone(snapshot.research.status)}>
                    {label(snapshot.research.status)}
                  </StatusBadge>
                </div>
                <p className="text-xs text-[#647087]">
                  {snapshot.research.questionCount} research questions · {snapshot.research.unresolvedEvidenceClasses.length} unresolved evidence classes
                </p>
              </div>
            ) : (
              <UnavailablePanel
                title="No research artifact bound"
                description="Research questions and unresolved evidence are not inferred without a certified frozen article snapshot."
              />
            )}
          </article>

          <article className="card p-5">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
              <h2 className="font-semibold text-[#172033]">Sources</h2>
            </div>
            {snapshot ? (
              <ul className="mt-4 space-y-3">
                {snapshot.sources.map((source) => (
                  <li key={source.sourceId} className="rounded-lg border border-[#e5eaf1] p-3">
                    <strong className="block text-sm text-[#26364d]">{source.title}</strong>
                    <span className="mt-1 block text-xs text-[#647087]">
                      {source.publisher ?? "Publisher unavailable"} · {source.supportTier} · {source.evidenceCount} evidence items
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <UnavailablePanel
                title="No source ledger bound"
                description="Source identity, publisher, support tier, and evidence counts remain unavailable until certified source evidence is supplied."
              />
            )}
          </article>

          <article className="card p-5">
            <div className="flex items-center gap-2">
              <ListTree className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
              <h2 className="font-semibold text-[#172033]">Outline</h2>
            </div>
            {snapshot ? (
              <ol className="mt-4 space-y-3">
                {snapshot.outline.map((section) => (
                  <li key={section.sectionId} className="rounded-lg border border-[#e5eaf1] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#7a879a]">
                      Section {section.order}
                    </div>
                    <strong className="mt-1 block text-sm text-[#26364d]">{section.headingIntent}</strong>
                    <span className="mt-1 block text-xs text-[#647087]">
                      {section.evidenceCount} evidence items · {section.unresolvedEvidenceClasses.length} unresolved
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <UnavailablePanel
                title="No outline bound"
                description="Outline sections are not generated or displayed until a certified brief is available."
              />
            )}
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <article className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SquarePen className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
                <h2 className="font-semibold text-[#172033]">Editor</h2>
              </div>
              <StatusBadge tone={snapshot ? tone(snapshot.draft.status) : "neutral"}>
                {snapshot ? label(snapshot.draft.status) : "UNAVAILABLE"}
              </StatusBadge>
            </div>
            <textarea
              className="mt-4 min-h-[360px] w-full resize-y rounded-lg border border-[#dce2eb] bg-[#f8fafc] p-4 text-sm leading-6 text-[#34445d] outline-none"
              readOnly
              aria-label="Article draft editor"
              value={snapshot?.draft.body ?? ""}
              placeholder="No certified draft is bound. Draft text is never synthesized in the workspace."
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#647087]">
              <span>
                {snapshot?.draft.deterministicFromFrozenInputs
                  ? "Reproducible from the frozen artifact chain where the upstream contract guarantees determinism."
                  : "Deterministic reproduction status unavailable."}
              </span>
              <span>Read-only · no persistence · no publish action</span>
            </div>
          </article>

          <div className="grid gap-4">
            <article className="card p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
                <h2 className="font-semibold text-[#172033]">Claims & citations</h2>
              </div>
              {snapshot ? (
                <ul className="mt-4 space-y-3">
                  {snapshot.claims.map((claim) => (
                    <li key={claim.claimKey} className="rounded-lg border border-[#e5eaf1] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <code className="text-[11px] text-[#536078]">{claim.claimKey}</code>
                        <StatusBadge tone={claim.verificationStatus === "verified" ? "success" : "warning"}>
                          {claim.verificationStatus.toUpperCase()}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#34445d]">{claim.text}</p>
                      <p className="mt-2 text-[11px] text-[#647087]">
                        {claim.citationEvidenceIds.length} citation evidence references
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <UnavailablePanel
                  title="No claim provenance bound"
                  description="Claims, verification status, and citation evidence IDs stay unavailable until a certified draft is supplied."
                />
              )}
            </article>

            <article className="card p-5">
              <div className="flex items-center gap-2">
                <SearchCheck className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
                <h2 className="font-semibold text-[#172033]">SEO checks</h2>
              </div>
              {snapshot ? (
                <ul className="mt-4 space-y-2">
                  {snapshot.seoChecks.map((check) => (
                    <li key={check.check} className="flex items-start justify-between gap-3 rounded-lg border border-[#e5eaf1] p-3">
                      <div>
                        <strong className="block text-sm text-[#26364d]">{check.check}</strong>
                        <span className="mt-1 block text-xs leading-5 text-[#647087]">{check.summary}</span>
                      </div>
                      <StatusBadge tone={tone(check.status)}>{label(check.status)}</StatusBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <UnavailablePanel
                  title="No SEO quality result bound"
                  description="SEO and answer-engine checks are not inferred from an absent article draft."
                />
              )}
            </article>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          <article className="card p-5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
              <h2 className="font-semibold text-[#172033]">Internal links</h2>
            </div>
            {snapshot ? (
              <ul className="mt-4 space-y-3">
                {snapshot.internalLinks.map((link) => (
                  <li key={link.targetUrl} className="rounded-lg border border-[#e5eaf1] p-3">
                    <strong className="block text-sm text-[#26364d]">{link.targetLabel}</strong>
                    <span className="mt-1 block break-all text-xs text-[#647087]">{link.targetUrl}</span>
                    <span className="mt-1 block text-[11px] text-[#647087]">{link.evidenceCount} supporting evidence items</span>
                  </li>
                ))}
              </ul>
            ) : (
              <UnavailablePanel
                title="No internal-link targets bound"
                description="The workspace does not invent internal-link targets without evidence-backed targets from the certified brief."
              />
            )}
          </article>

          <article className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
              <h2 className="font-semibold text-[#172033]">Quality gate</h2>
            </div>
            {snapshot ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#34445d]">
                    Approval eligible: {snapshot.qualityGate.approvalEligible ? "yes" : "no"}
                  </span>
                  <StatusBadge tone={tone(snapshot.qualityGate.status)}>
                    {label(snapshot.qualityGate.status)}
                  </StatusBadge>
                </div>
                <p className="text-xs leading-5 text-[#647087]">
                  Model confidence is not the quality gate.
                </p>
                {snapshot.qualityGate.blockingReasons.length > 0 ? (
                  <ul className="list-disc pl-5 text-xs leading-5 text-[#a43131]">
                    {snapshot.qualityGate.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : (
              <UnavailablePanel
                title="No quality-gate result bound"
                description="Generation completion is never treated as quality approval, and model confidence is not substituted for a gate result."
              />
            )}
          </article>

          <article className="card p-5">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
              <h2 className="font-semibold text-[#172033]">Publication state</h2>
            </div>
            <div className="mt-4 rounded-lg border border-[#d8e3f2] bg-[#f5f8fc] p-4">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-[#26364d]">
                  {snapshot?.publication.status === "published" ? "Published" : "Not published"}
                </strong>
                <StatusBadge tone={snapshot?.publication.status === "published" ? "success" : "info"}>
                  {snapshot?.publication.status === "published" ? "PUBLISHED" : "NOT PUBLISHED"}
                </StatusBadge>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#647087]">
                Publication authority is not granted by this workspace. A completed draft or passing quality gate cannot publish content on its own.
              </p>
            </div>
          </article>
        </section>

        <section className="mt-4 card p-5">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-[#3c82f6]" aria-hidden="true" />
            <h2 className="font-semibold text-[#172033]">Provenance</h2>
          </div>
          {snapshot ? (
            <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {Object.entries(snapshot.provenance).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-[#e5eaf1] p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#7a879a]">
                    {key.replaceAll(/([A-Z])/g, " $1")}
                  </dt>
                  <dd className="mt-1 break-all font-mono text-[10px] text-[#536078]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <UnavailablePanel
              title="No frozen provenance chain bound"
              description="Research plan, source ledger, brief, draft, and quality-gate fingerprints will appear here only when the exact certified artifact chain is available."
            />
          )}
        </section>
      </main>
    </>
  );
}

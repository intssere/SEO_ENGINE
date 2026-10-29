import { Link } from "wouter";

const views = {
  results: {
    eyebrow: "RESULTS & IMPACT · PREVIEW",
    title: "Results and impact",
    intro: "Verified baseline and follow-up measurements are required before any impact claims.",
    empty: "Results unavailable",
    status: "No verified website, measurement period or approved change.",
    detail: "Before / after and attribution",
    explanation: "Comparisons and change attribution require source-backed evidence; none is available.",
    notice: "Read-only preview. No performance or improvement values have been simulated.",
    back: "/site-overview",
    backLabel: "Site overview",
  },
  portfolio: {
    eyebrow: "MULTI-SITE PORTFOLIO · PREVIEW",
    title: "Your websites",
    intro: "View verified website readiness and comparative results when connected.",
    empty: "No verified websites",
    status: "No connected sites or independently verified portfolio records are available.",
    detail: "Cross-site reporting",
    explanation: "Site identity, permissions and comparable reporting periods must be verified first.",
    notice: "Read-only preview. No sites, scores or metrics are invented.",
    back: "/home",
    backLabel: "Welcome",
  }
} as const;
function ReadonlyReport({ kind }: {kind: keyof typeof views}) {
  const v = views[kind];
  return <div className="customerOnboarding"><header className="customerOnboardingHeader"><div><p className="customerEyebrow">{v.eyebrow}</p><h1>{v.title}</h1><p>{v.intro}</p></div><Link href={v.back}>{v.backLabel}</Link></header><section className="customerOnboardingCard"><h2>{v.empty}</h2><p role="status">{v.status}</p><Link href="/onboarding">Review website setup</Link></section><section className="customerOnboardingCard"><h2>{v.detail}</h2><p>{v.explanation}</p></section><p className="customerNotice">{v.notice}</p></div>;
}
export function CustomerResultsImpactPage() { return <ReadonlyReport kind="results"/>; }
export function CustomerPortfolioPage() { return <ReadonlyReport kind="portfolio"/>; }

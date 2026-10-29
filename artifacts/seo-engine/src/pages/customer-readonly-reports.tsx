import { Link } from "wouter";
const copy = {
results: ["RESULTS & IMPACT", "Results and impact", "Results unavailable", "No verified site, baseline, follow-up data or approved changes.", "Before/after comparisons and attribution require verified evidence."],
portfolio: ["MULTI-SITE PORTFOLIO", "Your websites", "No verified websites", "No connected or independently verified site records.", "Cross-site metrics require verified permissions, sources and comparable periods."]
} as const;
function ReadonlyReport({kind}:{kind:keyof typeof copy}) {
 const [label,title,empty,status,detail]=copy[kind];
 return <div className="customerOnboarding">
 <header className="customerOnboardingHeader"><div><p className="customerEyebrow">{label} · PREVIEW</p><h1>{title}</h1></div></header>
 <section className="customerOnboardingCard"><h2>{empty}</h2><p role="status">{status}</p><Link href="/onboarding">Review website setup</Link></section>
 <section className="customerOnboardingCard"><h2>Evidence required</h2><p>{detail}</p></section>
 <p className="customerNotice">Read-only preview. No sites, results or changes are simulated.</p>
 </div>;
}
export function CustomerResultsImpactPage(){return <ReadonlyReport kind="results"/>}
export function CustomerPortfolioPage(){return <ReadonlyReport kind="portfolio"/>}
